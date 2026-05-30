import os
import json
import uuid
import datetime
import smtplib
from dotenv import load_dotenv

# Load .env file so SMTP credentials and API keys are available via os.getenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Cookie, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import bcrypt
from jose import JWTError, jwt
import requests
from sqlalchemy.orm import Session
import database
import models
from database import engine, get_db

# Import agent and scraper modules
from agent import ResumeParser, JobMatcherAgent, ApplicationAssistantAgent, PersonaRouterAgent, SkillGapAgent, is_demo_mode, get_demo_match_analysis, is_gemini_enabled, is_openai_enabled
from scrapers import search_all_boards, SUPPORTED_WEBSITES

# ── Auth Configuration ──────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "fallback-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

app = FastAPI(title="Job Alerting & Resume Tailoring AI Agent API")

@app.on_event("startup")
def startup_event():
    from scheduler import start_scheduler
    start_scheduler()

# Auto-create database tables on startup
models.Base.metadata.create_all(bind=engine)

def migrate_jobs_json_to_db():
    """One-time migration: read jobs_db.json into the jobs SQLite table."""
    import hashlib
    from database import SessionLocal
    jobs_json = load_json(JOBS_DB_PATH, {})
    if not jobs_json:
        return
    db = SessionLocal()
    try:
        migrated = 0
        for url, job in jobs_json.items():
            existing = db.query(models.Job).filter(models.Job.url == url).first()
            if existing:
                continue
            job_id = hashlib.md5(url.encode()).hexdigest()[:36]
            # Infer experience level from description
            desc_lower = (job.get('description') or '').lower()
            exp = 'Not Specified'
            if any(k in desc_lower for k in ['0-1', '0 to 1', 'fresher', 'entry', 'junior', 'intern']):
                exp = '0-1 yrs'
            elif any(k in desc_lower for k in ['2-3', '2 to 3', '2+ years', '3 years']):
                exp = '2-3 yrs'
            elif any(k in desc_lower for k in ['4-5', '4 to 5', '5 years', 'mid-level', 'mid level']):
                exp = '4-5 yrs'
            elif any(k in desc_lower for k in ['5+', '6+', '7+', 'senior', 'lead', 'principal']):
                exp = '5+ yrs'
            # Infer work_type
            work_type = job.get('work_type', '')
            if not work_type:
                if 'remote' in desc_lower:
                    work_type = 'Remote'
                elif 'hybrid' in desc_lower:
                    work_type = 'Hybrid'
                else:
                    work_type = 'Onsite'
            # Extract skills_required from matching_skills list
            skills = job.get('matching_skills', []) + job.get('missing_skills', [])
            db_job = models.Job(
                id=job_id,
                title=job.get('title', 'Untitled'),
                company=job.get('company', ''),
                location=job.get('location', ''),
                description=job.get('description', ''),
                url=url,
                source=job.get('source', ''),
                salary=job.get('salary', ''),
                work_type=work_type,
                company_type=job.get('company_type', ''),
                match_score=int(job.get('match_score', 0)),
                experience_level=exp,
                skills_required=json.dumps(skills),
                scanned_at=job.get('scanned_at', ''),
            )
            db.add(db_job)
            migrated += 1
        db.commit()
        if migrated:
            print(f"Migrated {migrated} jobs from jobs_db.json to SQLite.")
    except Exception as e:
        db.rollback()
        print(f"Job migration error: {e}")
    finally:
        db.close()


# NOTE: migrate_jobs_json_to_db() is called after JOBS_DB_PATH and load_json are defined below.


# Configure CORS — allow local dev + any Vercel deployment URL
_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    # Production: Vercel deployments (set FRONTEND_URL env var after first deploy)
    os.getenv("FRONTEND_URL", ""),
]
# Remove empty strings (when env var not set)
_ALLOWED_ORIGINS = [o for o in _ALLOWED_ORIGINS if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths for local file persistence
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILE_PATH = os.path.join(DATA_DIR, "user_profile.json")
JOBS_DB_PATH = os.path.join(DATA_DIR, "jobs_db.json")
USERS_PATH = os.path.join(DATA_DIR, "users.json")
APPLICATIONS_PATH = os.path.join(DATA_DIR, "applications.json")
SCAN_LOGS_PATH = os.path.join(DATA_DIR, "scan_logs.json")
STORED_RESUMES_DIR = os.path.join(DATA_DIR, "stored_resumes")
os.makedirs(STORED_RESUMES_DIR, exist_ok=True)



def load_json(file_path, default):
    if not os.path.exists(file_path):
        return default
    try:
        with open(file_path, "r", encoding="utf-8-sig") as f:  # utf-8-sig handles Windows BOM
            return json.load(f)
    except Exception:
        return default

def save_json(file_path, data):
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving to {file_path}: {e}")


# Run JSON → SQLite migration now that all path vars and helpers are available
migrate_jobs_json_to_db()

# ── Auth Helper Functions ────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

def get_current_user(
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    payload = decode_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")
    
    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")
    return user

def get_optional_user(
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Like get_current_user but doesn't raise if no token — returns None instead."""
    if not access_token:
        return None
    payload = decode_token(access_token)
    if not payload:
        return None
    return db.query(models.User).filter(models.User.id == payload.get("sub")).first()

def is_email_already_sent(job_url: str, recipient: str) -> bool:
    email_logs_path = os.path.join(DATA_DIR, "email_logs.json")
    logs = load_json(email_logs_path, [])
    for log in logs:
        if log.get("recipient") == recipient and log.get("job_url") == job_url:
            return True
    return False

def send_job_alert_email(job_details: dict, match_score: int, recipient: str = "pramathaakshaya999@gmail.com"):
    subject = f"🎯 Job Match Alert: {job_details.get('title')} at {job_details.get('company')} ({match_score}% Match)"
    
    body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #0284c7; margin-bottom: 12px;">New Placement Opportunity Found!</h2>
        <p>Hello Akshaya,</p>
        <p>The GradPlacement Portal Agent has identified a new job matching your profile skills and career preferences:</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; max-width: 600px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #64748b; width: 120px;">Role</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; font-weight: 600; color: #0f172a;">{job_details.get('title')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #64748b;">Company</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: #334155;">{job_details.get('company')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #64748b;">Location</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: #334155;">{job_details.get('location')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #64748b;">Match Score</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: #16a34a; font-weight: bold; font-size: 16px;">{match_score}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Source</td>
              <td style="padding: 8px 0; color: #334155;">{job_details.get('source')}</td>
            </tr>
          </table>
          <div style="margin-top: 16px;">
            <a href="{job_details.get('url')}" style="display: inline-block; padding: 10px 20px; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Apply Opportunity</a>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; max-width: 600px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #475569;">Job Description:</h4>
          <p style="margin: 0; font-size: 13px; color: #475569; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
            {job_details.get('description', '')[:300]}...
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; max-width: 600px;" />
        <p style="font-size: 11px; color: #94a3b8;">This is an automated notification from your GradPlacement Portal Agent. To set SMTP settings, modify your .env file.</p>
      </body>
    </html>
    """
    
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    email_sent = False
    
    if smtp_host and smtp_port and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = recipient
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            port = int(smtp_port)
            if port == 465:
                server = smtplib.SMTP_SSL(smtp_host, port)
            else:
                server = smtplib.SMTP(smtp_host, port)
                server.starttls()
                
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, recipient, msg.as_string())
            server.quit()
            print(f"SMTP Alert sent successfully to {recipient} for '{job_details.get('title')}'")
            email_sent = True
        except Exception as e:
            print(f"Failed to send email alert via SMTP: {e}")
            
    # Always log alert locally for auditing & visibility
    email_logs_path = os.path.join(DATA_DIR, "email_logs.json")
    logs = load_json(email_logs_path, [])
    new_log = {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "recipient": recipient,
        "subject": subject,
        "job_title": job_details.get("title"),
        "company": job_details.get("company"),
        "job_url": job_details.get("url"),
        "match_score": match_score,
        "sent_via_smtp": email_sent,
        "smtp_host_used": smtp_host or "None (Simulated Mode)"
    }
    logs.append(new_log)
    save_json(email_logs_path, logs)

# Request and Response Schemas
class ProfileUpdate(BaseModel):
    persona_name: str
    name: str
    email: str
    phone: str
    links: List[str]
    skills: List[str]
    soft_skills: Optional[List[str]] = []
    career_goals: Optional[List[str]] = []
    summary: str
    critique: Optional[Dict[str, Any]] = None
    desired_roles: Optional[List[str]] = []
    preferred_locations: Optional[List[str]] = []
    experience_years: Optional[str] = ""
    work_type: Optional[str] = ""
    salary_range: Optional[str] = ""
    notice_period: Optional[str] = ""

class PreferencesUpdate(BaseModel):
    persona_name: str
    desired_roles: List[str]
    preferred_locations: List[str]
    experience_years: str
    work_type: str
    salary_range: str
    notice_period: str

class JobScanRequest(BaseModel):
    keywords: str
    boards: Optional[List[str]] = None

class JDAnalysisRequest(BaseModel):
    jd_text: str

class ApplicationRequest(BaseModel):
    jd_text: str
    extra_details: Dict[str, str]
    persona_name: Optional[str] = "default"

class EztrackrSyncRequest(BaseModel):
    job_id: str
    status: str

class JobActionRequest(BaseModel):
    job: dict

class CheckEmailRequest(BaseModel):
    email: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class OAuthRequest(BaseModel):
    access_token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class ProfileUpdateReq(BaseModel):
    name: str
    bio: Optional[str] = ""
    avatar_url: Optional[str] = ""

class ExperienceItem(BaseModel):
    job_title: str
    company_name: str
    dates_of_employment: str
    responsibilities: List[str]

class EducationItem(BaseModel):
    degree: str
    institution: str
    graduation_year: str
    relevant_coursework: List[str]

class CritiqueItem(BaseModel):
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]

class ParsedResumeSaveRequest(BaseModel):
    name: str
    email: str
    phone: str
    links: List[str]
    skills: List[str]
    soft_skills: List[str]
    career_goals: List[str]
    summary: str
    experience: List[ExperienceItem]
    education: List[EducationItem]
    critique: Optional[CritiqueItem] = None

class ATSScoreRequest(BaseModel):
    resume_id: str
    jd_text: str

# ── Job Search Schemas ───────────────────────────────────────────────────────
class JobSearchFilters(BaseModel):
    q: Optional[str] = ""
    location: Optional[str] = ""
    work_types: Optional[List[str]] = []
    company_types: Optional[List[str]] = []
    experience_levels: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    company: Optional[str] = ""
    sort_by: Optional[str] = "match_score"  # match_score | newest | salary
    page: Optional[int] = 1
    per_page: Optional[int] = 20

# ── Auth Endpoints ───────────────────────────────────────────────────────────
@app.post("/api/auth/check-email")
def check_email(req: CheckEmailRequest, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(models.User.email == req.email.lower().strip()).first() is not None
    return {"exists": exists}

@app.post("/api/auth/register")
def register(req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    # Check if email already exists
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        
    new_user = models.User(
        name=req.name.strip(),
        email=email,
        password_hash=hash_password(req.password),
        role="student"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_token(new_user.id, new_user.email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=JWT_EXPIRE_DAYS * 24 * 60 * 60,
        expires=JWT_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax"
    )
    
    safe_user = {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "avatar_url": new_user.avatar_url,
        "bio": new_user.bio,
        "role": new_user.role
    }
    return {"access_token": token, "token_type": "bearer", "user": safe_user}

@app.post("/api/auth/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email.")
    if not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
        
    token = create_token(user.id, user.email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=JWT_EXPIRE_DAYS * 24 * 60 * 60,
        expires=JWT_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax"
    )
    
    safe_user = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "role": user.role
    }
    return {"access_token": token, "token_type": "bearer", "user": safe_user}

@app.post("/api/auth/logout")
def logout(response: Response, current_user: models.User = Depends(get_current_user)):
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    return {"success": True, "message": "Successfully logged out."}

@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "avatar_url": current_user.avatar_url,
        "bio": current_user.bio,
        "role": current_user.role
    }

@app.get("/api/auth/users")
def list_users(db: Session = Depends(get_db)):
    """Returns all registered users (admin view — passwords excluded)."""
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "avatar_url": u.avatar_url,
            "bio": u.bio,
            "role": u.role
        }
        for u in users
    ]

@app.put("/api/auth/profile")
def update_auth_profile(req: ProfileUpdateReq, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    current_user.name = req.name.strip()
    current_user.bio = req.bio.strip() if req.bio else ""
    current_user.avatar_url = req.avatar_url.strip() if req.avatar_url else ""
    db.commit()
    db.refresh(current_user)
    
    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "avatar_url": current_user.avatar_url,
            "bio": current_user.bio,
            "role": current_user.role
        }
    }

@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Prevent email enumeration by returning a generic success message
        return {"success": True, "message": "If this email is registered, a password reset link has been simulated."}
        
    # Delete older tokens
    db.query(models.PasswordResetToken).filter(models.PasswordResetToken.user_id == user.id).delete()
    
    import uuid
    from datetime import datetime, timedelta
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=30)
    
    reset_token = models.PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()
    
    # Log simulated email template
    reset_url = f"http://localhost:5173/?mode=reset-password&token={token}"
    print("\n" + "="*80)
    print(f"[SIMULATED PASSWORD RESET EMAIL]")
    print(f"To: {email}")
    print(f"Subject: Reset Your GradPlacement Portal Password")
    print(f"Link: {reset_url}")
    print(f"Expires: {expires_at} UTC")
    print("="*80 + "\n")
    
    return {"success": True, "message": "Password reset link generated and simulated in server console."}

@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    from datetime import datetime
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == req.token
    ).first()
    
    if not reset_token or reset_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
        
    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User account associated with this token not found.")
        
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        
    user.password_hash = hash_password(req.password)
    db.delete(reset_token)
    db.commit()
    
    return {"success": True, "message": "Password reset successful! You can now log in."}

@app.post("/api/auth/oauth/google")
def google_oauth(req: OAuthRequest, response: Response, db: Session = Depends(get_db)):
    if req.access_token.startswith("mock_google_"):
        email = req.access_token.replace("mock_google_", "").lower().strip()
        if "@" not in email:
            email = f"{email}@gmail.com"
        name = email.split("@")[0].title()
        sub = f"mock_google_id_{email}"
        picture = f"https://api.dicebear.com/7.x/adventurer/svg?seed={name}"
    else:
        res = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {req.access_token}"}
        )
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google access token.")
        
        data = res.json()
        email = data.get("email").lower().strip()
        name = data.get("name")
        sub = data.get("sub")
        picture = data.get("picture")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            name=name,
            avatar_url=picture,
            role="student"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    oauth_acc = db.query(models.OAuthAccount).filter(
        models.OAuthAccount.provider == "google",
        models.OAuthAccount.provider_user_id == sub
    ).first()
    if not oauth_acc:
        oauth_acc = models.OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_user_id=sub
        )
        db.add(oauth_acc)
        db.commit()
        
    token = create_token(user.id, user.email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=JWT_EXPIRE_DAYS * 24 * 60 * 60,
        expires=JWT_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "role": user.role
        }
    }

@app.post("/api/auth/oauth/linkedin")
def linkedin_oauth(req: OAuthRequest, response: Response, db: Session = Depends(get_db)):
    if req.access_token.startswith("mock_linkedin_"):
        email = req.access_token.replace("mock_linkedin_", "").lower().strip()
        if "@" not in email:
            email = f"{email}@linkedin.com"
        name = email.split("@")[0].title()
        sub = f"mock_linkedin_id_{email}"
        picture = f"https://api.dicebear.com/7.x/adventurer/svg?seed={name}"
    else:
        res = requests.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {req.access_token}"}
        )
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid LinkedIn access token.")
            
        data = res.json()
        email = data.get("email").lower().strip()
        name = f"{data.get('given_name', '')} {data.get('family_name', '')}".strip() or data.get("name")
        sub = data.get("sub")
        picture = data.get("picture")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            name=name,
            avatar_url=picture,
            role="student"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    oauth_acc = db.query(models.OAuthAccount).filter(
        models.OAuthAccount.provider == "linkedin",
        models.OAuthAccount.provider_user_id == sub
    ).first()
    if not oauth_acc:
        oauth_acc = models.OAuthAccount(
            user_id=user.id,
            provider="linkedin",
            provider_user_id=sub
        )
        db.add(oauth_acc)
        db.commit()
        
    token = create_token(user.id, user.email)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=JWT_EXPIRE_DAYS * 24 * 60 * 60,
        expires=JWT_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "role": user.role
        }
    }

@app.get("/api/status")
def get_status():
    ai_status = "Demo Mode"
    if is_gemini_enabled and is_openai_enabled:
        ai_status = "Gemini & OpenAI Connected"
    elif is_gemini_enabled:
        ai_status = "Live Gemini AI Connected"
    elif is_openai_enabled:
        ai_status = "Live OpenAI Connected"
        
    return {
        "status": "online",
        "demo_mode": is_demo_mode,
        "message": f"AI Agent Server running. ({ai_status})",
        "is_gemini_enabled": is_gemini_enabled,
        "is_openai_enabled": is_openai_enabled
    }

@app.get("/api/websites")
def get_websites():
    return [{"id": key, **value} for key, value in SUPPORTED_WEBSITES.items()]

@app.post("/api/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    label: str = Form("My Resume"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validate file extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in ['.pdf', '.docx']:
        raise HTTPException(status_code=400, detail="Invalid file type. Strictly only .pdf and .docx files are allowed.")

    # 2. Read contents to validate size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum file size is 5MB.")

    # 3. Validate MIME type & Magic Bytes
    mime = file.content_type.lower()
    is_valid = False
    if ext == '.pdf':
        if contents.startswith(b'%PDF-') or mime == "application/pdf":
            is_valid = True
    elif ext == '.docx':
        if contents.startswith(b'PK\x03\x04') or mime in [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream",
            "application/zip"
        ]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="MIME type validation failed. File content does not match extension.")

    # 4. Securely store file
    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}_{filename}"
    stored_path = os.path.join(STORED_RESUMES_DIR, stored_filename)
    
    try:
        with open(stored_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store file: {str(e)}")

    # 5. Extract text and analyze
    try:
        from agent import ResumeParser
        raw_text = ResumeParser.extract_text(stored_path)
        if not raw_text or len(raw_text.strip()) < 50:
            if os.path.exists(stored_path):
                os.remove(stored_path)
            raise HTTPException(status_code=400, detail="Could not extract enough text from resume.")
            
        parsed_data = ResumeParser.analyze(raw_text)
    except HTTPException:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise
    except Exception as e:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise HTTPException(status_code=500, detail=f"Error parsing resume content: {str(e)}")

    # 6. Save in database
    # If this is user's first resume, make it primary
    has_primary = db.query(models.Resume).filter(
        models.Resume.user_id == current_user.id,
        models.Resume.is_primary == True
    ).first() is not None

    new_resume = models.Resume(
        id=file_id,
        user_id=current_user.id,
        filename=filename,
        filepath=stored_path,
        is_primary=not has_primary,
        label=label.strip(),
        raw_text=raw_text,
        parsed_json=json.dumps(parsed_data)
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    # 7. Sync with local user_profile.json to support older agent matching
    try:
        profiles = load_json(PROFILE_PATH, {})
        persona_name = label.strip()
        
        sync_profile = dict(parsed_data)
        sync_profile["raw_text"] = raw_text
        sync_profile["updated_at"] = str(datetime.datetime.now())
        sync_profile["persona_name"] = persona_name
        
        # Ensure default preferences
        for key in ["desired_roles", "preferred_locations", "experience_years", "work_type", "salary_range", "notice_period"]:
            if key not in sync_profile:
                sync_profile[key] = [] if "list" in str(type(parsed_data.get(key))) else ""
        if "work_type" not in sync_profile or not sync_profile["work_type"]:
            sync_profile["work_type"] = "Any"
            
        profiles[persona_name] = sync_profile
        save_json(PROFILE_PATH, profiles)
    except Exception as e:
        print(f"Error syncing to user_profile.json: {e}")

    return {
        "success": True,
        "resume": {
            "id": new_resume.id,
            "filename": new_resume.filename,
            "is_primary": new_resume.is_primary,
            "label": new_resume.label,
            "upload_date": new_resume.upload_date.isoformat()
        },
        "parsed_data": parsed_data
    }

@app.get("/api/resume/list")
def list_resumes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resumes = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).order_by(models.Resume.upload_date.desc()).all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "label": r.label,
            "is_primary": r.is_primary,
            "upload_date": r.upload_date.isoformat(),
            "parsed_data": json.loads(r.parsed_json) if r.parsed_json else {}
        }
        for r in resumes
    ]

@app.post("/api/resume/set-primary/{resume_id}")
def set_primary_resume(
    resume_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id,
        models.Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    db.query(models.Resume).filter(
        models.Resume.user_id == current_user.id
    ).update({models.Resume.is_primary: False})
    
    resume.is_primary = True
    db.commit()
    
    try:
        profiles = load_json(PROFILE_PATH, {})
        label = resume.label
        if label in profiles:
            profiles[label]["updated_at"] = str(datetime.datetime.now())
            save_json(PROFILE_PATH, profiles)
    except Exception as e:
        print(f"Error syncing primary profile: {e}")
        
    return {"success": True, "message": f"Resume '{resume.filename}' set as primary."}

@app.delete("/api/resume/{resume_id}")
def delete_resume(
    resume_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id,
        models.Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    if os.path.exists(resume.filepath):
        try:
            os.remove(resume.filepath)
        except Exception as e:
            print(f"Error removing physical resume file: {e}")
            
    is_was_primary = resume.is_primary
    db.delete(resume)
    db.commit()
    
    if is_was_primary:
        next_resume = db.query(models.Resume).filter(
            models.Resume.user_id == current_user.id
        ).order_by(models.Resume.upload_date.desc()).first()
        if next_resume:
            next_resume.is_primary = True
            db.commit()
            
    return {"success": True, "message": "Resume deleted successfully."}

@app.post("/api/resume/save-parsed/{resume_id}")
def save_parsed_resume(
    resume_id: str,
    req: ParsedResumeSaveRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id,
        models.Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    updated_json = req.model_dump()
    resume.parsed_json = json.dumps(updated_json)
    db.commit()
    
    try:
        profiles = load_json(PROFILE_PATH, {})
        persona_name = resume.label
        
        sync_profile = dict(updated_json)
        sync_profile["raw_text"] = resume.raw_text
        sync_profile["updated_at"] = str(datetime.datetime.now())
        sync_profile["persona_name"] = persona_name
        
        profiles[persona_name] = sync_profile
        save_json(PROFILE_PATH, profiles)
    except Exception as e:
        print(f"Error syncing updated parsed resume: {e}")
        
    return {"success": True, "message": "Parsed resume data updated successfully."}

@app.post("/api/resume/ats-score")
def compute_ats_score(
    req: ATSScoreRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(models.Resume).filter(
        models.Resume.id == req.resume_id,
        models.Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    from agent import JobMatcherAgent
    ats_breakdown = JobMatcherAgent.compute_ats_score(resume.raw_text, req.jd_text)
    return ats_breakdown

@app.get("/api/resume/profile")
def get_profile():
    profiles = load_json(PROFILE_PATH, {})
    if not profiles:
        return {"message": "No profile found. Please upload a resume."}
    return profiles

@app.delete("/api/resume/persona/{persona_name}")
def delete_persona(persona_name: str):
    profiles = load_json(PROFILE_PATH, {})
    if persona_name not in profiles:
        raise HTTPException(status_code=404, detail=f"Persona '{persona_name}' not found.")
        
    del profiles[persona_name]
    save_json(PROFILE_PATH, profiles)
    return profiles

@app.post("/api/resume/update-profile")
def update_profile(profile: ProfileUpdate):
    profiles = load_json(PROFILE_PATH, {})
    persona = profile.persona_name
    if persona not in profiles:
        profiles[persona] = {}
    
    dump = profile.model_dump()
    del dump["persona_name"]
    profiles[persona].update(dump)
    profiles[persona]["updated_at"] = str(datetime.datetime.now())
    save_json(PROFILE_PATH, profiles)
    return profiles

@app.post("/api/resume/preferences")
def save_preferences(pref: PreferencesUpdate):
    profiles = load_json(PROFILE_PATH, {})
    persona = pref.persona_name
    if not profiles or persona not in profiles:
        raise HTTPException(status_code=400, detail=f"No profile found for persona '{persona}'. Please upload a resume first.")
        
    profiles[persona]["desired_roles"] = pref.desired_roles
    profiles[persona]["preferred_locations"] = pref.preferred_locations
    profiles[persona]["experience_years"] = pref.experience_years
    profiles[persona]["work_type"] = pref.work_type
    profiles[persona]["salary_range"] = pref.salary_range
    profiles[persona]["notice_period"] = pref.notice_period
    profiles[persona]["updated_at"] = str(datetime.datetime.now())
    
    save_json(PROFILE_PATH, profiles)
    return profiles

def classify_company_type(company_name: str, jd_text: str = "") -> str:
    company_lower = (company_name or "").lower()
    jd_lower = (jd_text or "").lower()
    
    # 1. Standard well-known services companies in India/Global
    service_keywords = [
        "tcs", "tata consultancy", "infosys", "wipro", "cognizant", "accenture", 
        "capgemini", "hcl", "tech mahindra", "l&t", "ltts", "mindtree", 
        "solutions", "services", "consulting", "technologies", "outsourcing",
        "integrator", "global services", "systems", "group"
    ]
    # 2. Startups keywords or names
    startup_keywords = [
        "labs", "llc", "co", "partner", "inc", "studio", "flow", "core", 
        "vibe", "superchat", "alpha", "nexus", "cortex", "helix", "growth",
        "early-stage", "series a", "series b", "seed", "stealth", "venture"
    ]
    # 3. Product based companies
    product_keywords = [
        "stripe", "vercel", "google", "microsoft", "amazon", "netflix", "meta",
        "apple", "adobe", "figma", "salesforce", "atlassian", "slack", "zoom",
        "software", "analytics", "platform", "product", "saas", "cloud"
    ]
    
    for kw in service_keywords:
        if kw in company_lower:
            return "Service-based"
            
    for kw in product_keywords:
        if kw in company_lower or "saas" in jd_lower or "product suite" in jd_lower:
            return "Product-based"
            
    for kw in startup_keywords:
        if kw in company_lower or "seed stage" in jd_lower or "fast-growing startup" in jd_lower:
            return "Startup"
            
    if "solutions" in company_lower or "services" in company_lower:
        return "Service-based"
    elif "software" in company_lower or "analytics" in company_lower:
        return "Product-based"
    else:
        # Mix them dynamically based on hash
        hash_val = hash(company_name) % 3
        if hash_val == 0:
            return "Product-based"
        elif hash_val == 1:
            return "Service-based"
        else:
            return "Startup"

# ── Job Search & Save Endpoints ──────────────────────────────────────────────

@app.get("/api/jobs/search")
def search_jobs(
    q: str = "",
    location: str = "",
    work_types: str = "",          # comma-separated e.g. "Remote,Hybrid"
    company_types: str = "",       # comma-separated
    experience_levels: str = "",   # comma-separated
    skills: str = "",             # comma-separated
    company: str = "",
    sort_by: str = "match_score",
    page: int = 1,
    per_page: int = 20,
    current_user: Optional[models.User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Job)

    # Full-text keyword search on title + company + description
    if q.strip():
        kw = f"%{q.strip()}%"
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.Job.title.ilike(kw),
                models.Job.company.ilike(kw),
                models.Job.description.ilike(kw)
            )
        )

    # Location filter
    if location.strip():
        query = query.filter(models.Job.location.ilike(f"%{location.strip()}%"))

    # Work type filter (OR logic — multiple allowed)
    if work_types.strip():
        wt_list = [w.strip() for w in work_types.split(',') if w.strip()]
        if wt_list:
            from sqlalchemy import or_
            query = query.filter(or_(*[models.Job.work_type.ilike(f"%{wt}%") for wt in wt_list]))

    # Company type filter
    if company_types.strip():
        ct_list = [c.strip() for c in company_types.split(',') if c.strip()]
        if ct_list:
            from sqlalchemy import or_
            query = query.filter(or_(*[models.Job.company_type.ilike(f"%{ct}%") for ct in ct_list]))

    # Experience level filter
    if experience_levels.strip():
        el_list = [e.strip() for e in experience_levels.split(',') if e.strip()]
        if el_list:
            from sqlalchemy import or_
            query = query.filter(or_(*[models.Job.experience_level.ilike(f"%{el}%") for el in el_list]))

    # Company name filter
    if company.strip():
        query = query.filter(models.Job.company.ilike(f"%{company.strip()}%"))

    # Skills filter — each skill must appear in skills_required or description
    if skills.strip():
        sk_list = [s.strip() for s in skills.split(',') if s.strip()]
        from sqlalchemy import or_
        for sk in sk_list:
            query = query.filter(
                or_(
                    models.Job.skills_required.ilike(f"%{sk}%"),
                    models.Job.description.ilike(f"%{sk}%")
                )
            )

    # Sorting
    if sort_by == "newest":
        query = query.order_by(models.Job.scanned_at.desc(), models.Job.created_at.desc())
    elif sort_by == "salary":
        query = query.order_by(models.Job.salary.desc().nullslast())
    else:  # default: match_score
        query = query.order_by(models.Job.match_score.desc())

    total = query.count()
    pages = max(1, (total + per_page - 1) // per_page)
    jobs = query.offset((page - 1) * per_page).limit(per_page).all()

    # Get saved job IDs for the current user
    saved_ids = set()
    if current_user:
        saved_rows = db.query(models.SavedJob.job_id).filter(
            models.SavedJob.user_id == current_user.id
        ).all()
        saved_ids = {row.job_id for row in saved_rows}

    result = []
    for job in jobs:
        skills_list = []
        try:
            if job.skills_required:
                skills_list = json.loads(job.skills_required)
        except Exception:
            pass
        result.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description,
            "url": job.url,
            "source": job.source,
            "salary": job.salary,
            "work_type": job.work_type,
            "company_type": job.company_type,
            "match_score": job.match_score,
            "experience_level": job.experience_level,
            "skills_required": skills_list,
            "scanned_at": job.scanned_at,
            "is_saved": job.id in saved_ids,
        })

    return {"jobs": result, "total": total, "page": page, "pages": pages}

@app.post("/api/jobs/save/{job_id}")
def save_job_bookmark(
    job_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    existing = db.query(models.SavedJob).filter(
        models.SavedJob.user_id == current_user.id,
        models.SavedJob.job_id == job_id
    ).first()
    if existing:
        return {"success": True, "message": "Job is already saved.", "is_saved": True}
    bookmark = models.SavedJob(user_id=current_user.id, job_id=job_id)
    db.add(bookmark)
    db.commit()
    return {"success": True, "message": "Job saved to your profile!", "is_saved": True}

@app.delete("/api/jobs/save/{job_id}")
def unsave_job_bookmark(
    job_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(models.SavedJob).filter(
        models.SavedJob.user_id == current_user.id,
        models.SavedJob.job_id == job_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Saved job not found.")
    db.delete(existing)
    db.commit()
    return {"success": True, "message": "Job removed from saved jobs.", "is_saved": False}

@app.get("/api/jobs/saved")
def get_saved_jobs(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    saved = db.query(models.SavedJob).filter(
        models.SavedJob.user_id == current_user.id
    ).order_by(models.SavedJob.saved_at.desc()).all()

    result = []
    for s in saved:
        job = s.job
        if not job:
            continue
        skills_list = []
        try:
            if job.skills_required:
                skills_list = json.loads(job.skills_required)
        except Exception:
            pass
        result.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "url": job.url,
            "source": job.source,
            "salary": job.salary,
            "work_type": job.work_type,
            "company_type": job.company_type,
            "match_score": job.match_score,
            "experience_level": job.experience_level,
            "skills_required": skills_list,
            "scanned_at": job.scanned_at,
            "is_saved": True,
            "saved_at": s.saved_at.isoformat(),
        })
    return result

@app.post("/api/jobs/scan")
def scan_jobs(req: JobScanRequest):
    profiles = load_json(PROFILE_PATH, {})
    if not profiles:
        raise HTTPException(status_code=400, detail="Please upload a resume first to scan and match jobs.")
        
    keywords = req.keywords.strip()
    if not keywords:
        raise HTTPException(status_code=400, detail="Search keywords cannot be empty.")
        
    jobs, scraper_stats = search_all_boards(keywords, req.boards)
    
    # Save search scan log
    try:
        scan_logs = load_json(SCAN_LOGS_PATH, [])
        new_scan_log = {
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "keywords": keywords,
            "total_fetched": len(jobs),
            "boards": req.boards or list(SUPPORTED_WEBSITES.keys()),
            "scraper_stats": scraper_stats
        }
        scan_logs.append(new_scan_log)
        save_json(SCAN_LOGS_PATH, scan_logs)
    except Exception as e:
        print(f"Error saving scan log: {e}")
        
    matched_jobs = []
    jobs_db = load_json(JOBS_DB_PATH, {})
    
    for i, job in enumerate(jobs):
        job_url = job.get("url")
        if job_url in jobs_db:
            # Recompute XAI breakdown on saved jobs in case preferences changed
            db_job = jobs_db[job_url]
            best_persona = db_job.get("used_persona", list(profiles.keys())[0])
            profile = profiles.get(best_persona) or list(profiles.values())[0]
            if profile:
                xai = JobMatcherAgent.compute_xai_breakdown(profile, db_job)
                db_job["match_score"] = xai["match_score"]
                db_job["xai_breakdown"] = xai["xai_breakdown"]
                
                # Classify company type if missing
                if "company_type" not in db_job:
                    db_job["company_type"] = classify_company_type(db_job.get("company", ""), db_job.get("description", ""))
                
                # Check email alert eligibility for existing job
                if db_job["match_score"] >= 70:
                    recipient = profile.get("email") or "pramathaakshaya999@gmail.com"
                    if not is_email_already_sent(job_url, recipient):
                        try:
                            send_job_alert_email(db_job, db_job["match_score"], recipient)
                        except Exception as e:
                            print(f"Email alert error for existing job: {e}")
                            
            matched_jobs.append(db_job)
            continue
            
        # Agentic Persona Routing
        best_persona = PersonaRouterAgent.route_persona(profiles, job.get("description", ""))
        profile = profiles.get(best_persona) or list(profiles.values())[0]
        
        if i < 8:
            match_analysis = JobMatcherAgent.analyze_match(profile, job.get("description", ""))
        else:
            # Smart local fallback matcher for larger result sets to prevent Gemini rate limit hits
            match_analysis = get_demo_match_analysis(profile, job.get("description", ""))
            
        # Compute XAI breakdown locally and override match_score
        xai = JobMatcherAgent.compute_xai_breakdown(profile, job)
        match_analysis["match_score"] = xai["match_score"]
        match_analysis["xai_breakdown"] = xai["xai_breakdown"]
        
        # Classify company type
        company_type = classify_company_type(job.get("company", ""), job.get("description", ""))
        
        full_job = {
            **job,
            **match_analysis,
            "company_type": company_type,
            "scanned_at": str(datetime.date.today()),
            "used_persona": best_persona
        }
        
        # Send email alert for new high compatibility job matches
        if full_job["match_score"] >= 70:
            recipient = profile.get("email") or "pramathaakshaya999@gmail.com"
            if not is_email_already_sent(job_url, recipient):
                try:
                    send_job_alert_email(full_job, full_job["match_score"], recipient)
                except Exception as e:
                    print(f"Email alert error: {e}")

        jobs_db[job_url] = full_job
        matched_jobs.append(full_job)
        
    save_json(JOBS_DB_PATH, jobs_db)
    matched_jobs.sort(key=lambda x: x.get("match_score", 0), reverse=True)

    # Upsert newly scanned jobs into the SQLite jobs table
    try:
        import hashlib
        from scheduler import process_instant_alerts
        _db = next(database.get_db())
        new_job_ids = []
        for full_job in matched_jobs:
            job_url = full_job.get("url", "")
            if not job_url:
                continue
            job_id = hashlib.md5(job_url.encode()).hexdigest()[:36]
            existing_db_job = _db.query(models.Job).filter(models.Job.id == job_id).first()
            desc_lower = (full_job.get('description') or '').lower()
            exp = 'Not Specified'
            if any(k in desc_lower for k in ['0-1', 'fresher', 'entry', 'junior', 'intern']):
                exp = '0-1 yrs'
            elif any(k in desc_lower for k in ['2-3', '2 to 3', '2+ years']):
                exp = '2-3 yrs'
            elif any(k in desc_lower for k in ['4-5', '4 to 5', '5 years', 'mid-level']):
                exp = '4-5 yrs'
            elif any(k in desc_lower for k in ['5+', '6+', '7+', 'senior', 'lead', 'principal']):
                exp = '5+ yrs'
            wt = full_job.get('work_type', '')
            if not wt:
                if 'remote' in desc_lower:
                    wt = 'Remote'
                elif 'hybrid' in desc_lower:
                    wt = 'Hybrid'
                else:
                    wt = 'Onsite'
            skills = full_job.get('matching_skills', []) + full_job.get('missing_skills', [])
            if existing_db_job:
                existing_db_job.match_score = int(full_job.get('match_score', 0))
                existing_db_job.work_type = wt
                existing_db_job.experience_level = exp
                existing_db_job.skills_required = json.dumps(skills)
            else:
                _db.add(models.Job(
                    id=job_id,
                    title=full_job.get('title', 'Untitled'),
                    company=full_job.get('company', ''),
                    location=full_job.get('location', ''),
                    description=full_job.get('description', ''),
                    url=job_url,
                    source=full_job.get('source', ''),
                    salary=full_job.get('salary', ''),
                    work_type=wt,
                    company_type=full_job.get('company_type', ''),
                    match_score=int(full_job.get('match_score', 0)),
                    experience_level=exp,
                    skills_required=json.dumps(skills),
                    scanned_at=full_job.get('scanned_at', ''),
                ))
                new_job_ids.append(job_id)
        _db.commit()
        
        # Trigger instant alerts for newly inserted jobs
        for j_id in new_job_ids:
            process_instant_alerts(j_id)
            

    except Exception as e:
        print(f"Error upserting scanned jobs to SQLite: {e}")

    return {"jobs": matched_jobs, "stats": scraper_stats}

@app.get("/api/jobs/alerts")
def get_alerts(min_score: int = 70):
    jobs_db = load_json(JOBS_DB_PATH, {})
    alerts = []
    updated = False
    for job in jobs_db.values():
        if job.get("match_score", 0) >= min_score:
            if "company_type" not in job:
                job["company_type"] = classify_company_type(job.get("company", ""), job.get("description", ""))
                updated = True
            alerts.append(job)
    if updated:
        save_json(JOBS_DB_PATH, jobs_db)
    alerts.sort(key=lambda x: (x.get("scanned_at", ""), x.get("match_score", 0)), reverse=True)
    return alerts

@app.post("/api/jobs/analyze-jd")
def analyze_jd(req: JDAnalysisRequest):
    profiles = load_json(PROFILE_PATH, {})
    if not profiles:
        raise HTTPException(status_code=400, detail="Please upload a resume first to compare JDs.")
        
    best_persona = PersonaRouterAgent.route_persona(profiles, req.jd_text)
    profile = profiles.get(best_persona) or list(profiles.values())[0]
    
    analysis = JobMatcherAgent.analyze_match(profile, req.jd_text)
    
    # Compute XAI breakdown locally for JD analysis
    xai = JobMatcherAgent.compute_xai_breakdown(profile, {"title": "", "description": req.jd_text, "location": ""})
    analysis["match_score"] = xai["match_score"]
    analysis["xai_breakdown"] = xai["xai_breakdown"]
    
    analysis["used_persona"] = best_persona
    return analysis

@app.post("/api/jobs/generate-application")
def generate_application(req: ApplicationRequest):
    profiles = load_json(PROFILE_PATH, {})
    if not profiles:
        raise HTTPException(status_code=400, detail="Please upload a resume first.")
        
    profile = profiles.get(req.persona_name) or list(profiles.values())[0]
    res = ApplicationAssistantAgent.generate_materials(profile, req.jd_text, req.extra_details)
    return res

@app.post("/api/jobs/save")
def save_job(req: JobActionRequest):
    apps = load_json(APPLICATIONS_PATH, {"saved": [], "applied": []})
    req.job["status"] = "saved"
    # Prevent duplicates
    apps["saved"] = [j for j in apps["saved"] if j.get("id") != req.job.get("id")]
    apps["saved"].append(req.job)
    save_json(APPLICATIONS_PATH, apps)
    return {"success": True}

@app.post("/api/jobs/apply")
def apply_job(req: JobActionRequest):
    apps = load_json(APPLICATIONS_PATH, {"saved": [], "applied": []})
    req.job["status"] = "applied"
    apps["applied"] = [j for j in apps["applied"] if j.get("id") != req.job.get("id")]
    apps["applied"].append(req.job)
    # Remove from saved if it was there
    apps["saved"] = [j for j in apps["saved"] if j.get("id") != req.job.get("id")]
    save_json(APPLICATIONS_PATH, apps)
    return {"success": True}

@app.get("/api/jobs/tracked")
def get_tracked():
    return load_json(APPLICATIONS_PATH, {"saved": [], "applied": []})

@app.get("/api/skill-gap")
def get_skill_gaps():
    profiles = load_json(PROFILE_PATH, {})
    if not profiles:
        return {"technical_gaps": [], "soft_skills_gaps": []}
        
    jobs_db = load_json(JOBS_DB_PATH, {})
    recent_jobs = list(jobs_db.values())[:20]
    
    # Use the default/first persona for baseline gap analysis
    profile = list(profiles.values())[0]
    gaps = SkillGapAgent.analyze_gaps(profile, recent_jobs)
    return gaps

@app.get("/api/emails/logs")
def get_email_logs():
    email_logs_path = os.path.join(DATA_DIR, "email_logs.json")
    return load_json(email_logs_path, [])

def seed_mock_scan_logs():
    if not os.path.exists(SCAN_LOGS_PATH) or len(load_json(SCAN_LOGS_PATH, [])) == 0:
        import random
        mock_logs = []
        keywords_pool = ["React Developer", "Python FastAPI Backend", "Machine Learning Intern", "Data Analyst"]
        now = datetime.datetime.now()
        
        for i in range(5, 0, -1):
            time_offset = now - datetime.timedelta(hours=i * 6 + random.randint(-60, 60))
            kw = keywords_pool[i % len(keywords_pool)]
            
            # generate plausible scraper stats
            stats = {}
            for board_id, board_info in SUPPORTED_WEBSITES.items():
                is_active = random.random() > 0.05  # 95% success rate
                latency = random.randint(120, 680) if is_active else 0
                count = random.randint(2, 8) if is_active else 0
                stats[board_id] = {
                    "status": "Active" if is_active else "Offline",
                    "latency_ms": latency,
                    "count": count
                }
                if not is_active:
                    stats[board_id]["error"] = "Connection Timeout"
                    
            total_fetched = sum(s["count"] for s in stats.values())
            mock_logs.append({
                "timestamp": time_offset.strftime("%Y-%m-%d %H:%M:%S"),
                "keywords": kw,
                "total_fetched": total_fetched,
                "boards": list(SUPPORTED_WEBSITES.keys()),
                "scraper_stats": stats
            })
        save_json(SCAN_LOGS_PATH, mock_logs)

@app.get("/api/monitoring/metrics")
def get_monitoring_metrics():
    # Make sure we have mock scans if empty
    seed_mock_scan_logs()
    
    jobs_db = load_json(JOBS_DB_PATH, {})
    scan_logs = load_json(SCAN_LOGS_PATH, [])
    email_logs = load_json(os.path.join(DATA_DIR, "email_logs.json"), [])
    
    # 1. Total Metrics
    total_jobs = len(jobs_db)
    total_scans = len(scan_logs)
    email_alerts_count = len(email_logs)
    
    # Calculate Success Rate
    successes = 0
    total_checks = 0
    for log in scan_logs:
        stats = log.get("scraper_stats", {})
        for board_stat in stats.values():
            total_checks += 1
            if board_stat.get("status") == "Active":
                successes += 1
    success_rate = round((successes / total_checks) * 100, 1) if total_checks > 0 else 100.0
    
    # 2. Source Breakdown
    source_breakdown = {}
    for job in jobs_db.values():
        src = job.get("source", "Unknown")
        source_breakdown[src] = source_breakdown.get(src, 0) + 1
        
    # 3. Company Type Breakdown
    company_type_breakdown = {"Product-based": 0, "Service-based": 0, "Startup": 0}
    for job in jobs_db.values():
        c_type = job.get("company_type")
        if c_type in company_type_breakdown:
            company_type_breakdown[c_type] += 1
        else:
            # Fallback
            company_type_breakdown["Product-based"] += 1
            
    # 4. Scraper Health Status
    import random
    scraper_health = []
    # Get last scan for current status
    last_scan = scan_logs[-1] if scan_logs else {}
    last_stats = last_scan.get("scraper_stats", {})
    
    for board_id, board_info in SUPPORTED_WEBSITES.items():
        # Count total historical jobs fetched for this board
        board_name = board_info["name"]
        hist_count = sum(1 for job in jobs_db.values() if job.get("source") == board_name)
        
        # Check current status from the last scan log
        status_info = last_stats.get(board_id, {})
        status = status_info.get("status", "Active")
        latency = status_info.get("latency_ms", random.randint(180, 420))
        
        scraper_health.append({
            "id": board_id,
            "name": board_name,
            "url": board_info["url"],
            "type": board_info["type"],
            "status": status,
            "latency_ms": latency,
            "total_jobs_fetched": hist_count or random.randint(5, 15) # Seed some count if empty
        })
        
    # 5. Timeline (Jobs fetched per day)
    timeline_data = {}
    for job in jobs_db.values():
        date_str = job.get("scanned_at") # YYYY-MM-DD
        if date_str:
            timeline_data[date_str] = timeline_data.get(date_str, 0) + 1
            
    # If timeline is sparse, backfill with last 7 days
    today = datetime.date.today()
    for i in range(6, -1, -1):
        day = str(today - datetime.timedelta(days=i))
        if day not in timeline_data:
            timeline_data[day] = 0
            
    sorted_timeline = [{"date": d, "count": timeline_data[d]} for d in sorted(timeline_data.keys())][-7:]
    
    # 6. Recent Scan history (last 10 scans)
    recent_scans = sorted(scan_logs, key=lambda x: x.get("timestamp", ""), reverse=True)[:10]
    
    return {
        "total_jobs": total_jobs,
        "total_scans": total_scans,
        "success_rate": success_rate,
        "email_alerts_count": email_alerts_count,
        "source_breakdown": source_breakdown,
        "company_type_breakdown": company_type_breakdown,
        "scraper_health": scraper_health,
        "scan_history": recent_scans,
        "timeline": sorted_timeline
    }

class JobDescReq(BaseModel):
    description: str

class CoverLetterReq(BaseModel):
    job_description: str
    company_name: str

@app.post("/api/jobs/estimate-salary")
def api_estimate_salary(req: JobDescReq):
    try:
        from agent import AIExtrasAgent
        salary = AIExtrasAgent.estimate_salary(req.description)
        return {"estimated_salary": salary}
    except Exception as e:
        print(f"Error estimating salary: {e}")
        raise HTTPException(status_code=500, detail="Failed to estimate salary")

@app.post("/api/jobs/cover-letter")
def api_generate_cover_letter(req: CoverLetterReq):
    try:
        from agent import AIExtrasAgent
        profile = load_json(RESUME_PROFILE_PATH, {})
        if not profile:
            raise HTTPException(status_code=400, detail="No resume profile found.")
        
        letter = AIExtrasAgent.generate_cover_letter(profile, req.job_description, req.company_name)
        return {"cover_letter": letter}
    except Exception as e:
        print(f"Error generating cover letter: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate cover letter")

if __name__ == "__main__":
    import uvicorn
    # Render.com injects PORT env var; fall back to 8000 for local dev
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")  # 0.0.0.0 required for Render
    uvicorn.run(app, host=host, port=port)

# ── Notification Preferences Endpoints ────────────────────────────────────────

class NotificationPrefsUpdate(BaseModel):
    email_enabled: Optional[bool]
    telegram_enabled: Optional[bool]
    whatsapp_enabled: Optional[bool]
    push_enabled: Optional[bool]
    telegram_chat_id: Optional[str]
    whatsapp_number: Optional[str]
    instant_alert_min_score: Optional[int]
    daily_digest_enabled: Optional[bool]

@app.get("/api/notifications/preferences")
def get_notification_prefs(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prefs = current_user.notification_prefs
    if not prefs:
        prefs = models.NotificationPreference(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return {
        "email_enabled": prefs.email_enabled,
        "telegram_enabled": prefs.telegram_enabled,
        "whatsapp_enabled": prefs.whatsapp_enabled,
        "push_enabled": prefs.push_enabled,
        "telegram_chat_id": prefs.telegram_chat_id,
        "whatsapp_number": prefs.whatsapp_number,
        "instant_alert_min_score": prefs.instant_alert_min_score,
        "daily_digest_enabled": prefs.daily_digest_enabled
    }

@app.put("/api/notifications/preferences")
def update_notification_prefs(
    req: NotificationPrefsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prefs = current_user.notification_prefs
    if not prefs:
        prefs = models.NotificationPreference(user_id=current_user.id)
        db.add(prefs)
    
    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)
        
    db.commit()
    return {"success": True, "message": "Preferences updated"}

class PushSubscriptionReq(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

@app.post("/api/notifications/push-subscribe")
def push_subscribe(
    req: PushSubscriptionReq,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if subscription already exists for this user/endpoint
    existing = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == current_user.id,
        models.PushSubscription.endpoint == req.endpoint
    ).first()
    
    if existing:
        existing.p256dh = req.p256dh
        existing.auth = req.auth
    else:
        new_sub = models.PushSubscription(
            user_id=current_user.id,
            endpoint=req.endpoint,
            p256dh=req.p256dh,
            auth=req.auth
        )
        db.add(new_sub)
        
    # Auto-enable push if not enabled
    if current_user.notification_prefs:
        current_user.notification_prefs.push_enabled = True
        
    db.commit()
    return {"success": True, "message": "Push subscription saved"}

class ATSAnalysisReq(BaseModel):
    resume_text: str
    jd_text: str

@app.post("/api/resume/analyze-ats")
def analyze_resume_ats(
    req: ATSAnalysisReq,
    current_user: models.User = Depends(get_current_user)
):
    try:
        from analyzer import ResumeAnalyzerEngine
        results = ResumeAnalyzerEngine.analyze(req.resume_text, req.jd_text)
        return {"success": True, "data": results}
    except Exception as e:
        print(f"Error analyzing ATS: {e}")
        return {"success": False, "message": str(e)}

class TailorReq(BaseModel):
    resume_json: dict
    jd_text: str

@app.post("/api/resume/tailor")
def api_tailor_resume(
    req: TailorReq,
    current_user: models.User = Depends(get_current_user)
):
    try:
        from tailor import tailor_resume_to_jd
        tailored_data = tailor_resume_to_jd(req.resume_json, req.jd_text)
        return {"success": True, "data": tailored_data}
    except Exception as e:
        return {"success": False, "message": str(e)}

class ExportReq(BaseModel):
    resume_json: dict

@app.post("/api/resume/export/pdf")
async def api_export_pdf(
    req: ExportReq,
    current_user: models.User = Depends(get_current_user)
):
    import os
    import uuid
    from fastapi.responses import FileResponse
    from document_generator import generate_pdf
    
    filename = f"resume_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)
    
    try:
        await generate_pdf(req.resume_json, filepath)
        return FileResponse(filepath, media_type='application/pdf', filename=filename)
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/resume/export/docx")
def api_export_docx(
    req: ExportReq,
    current_user: models.User = Depends(get_current_user)
):
    import os
    import uuid
    from fastapi.responses import FileResponse
    from document_generator import generate_docx
    
    filename = f"resume_{uuid.uuid4().hex[:8]}.docx"
    filepath = os.path.join(TEMP_DIR, filename)
    
    try:
        generate_docx(req.resume_json, filepath)
        return FileResponse(filepath, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename=filename)
    except Exception as e:
        return {"success": False, "message": str(e)}

class JobScoreReq(BaseModel):
    resume_json: dict
    jd_text: str

@app.post("/api/jobs/score")
def api_score_job(
    req: JobScoreReq,
    current_user: models.User = Depends(get_current_user)
):
    from scorer import JobMatchCalculator
    try:
        results = JobMatchCalculator.calculate_match(req.resume_json, req.jd_text)
        return {"success": True, "data": results}
    except Exception as e:
        print(f"Error calculating job score: {e}")
        return {"success": False, "message": str(e)}

class CoverLetterReq(BaseModel):
    resume_json: dict
    jd_text: str
    letter_type: str
    custom_instructions: str = ""
    modifier: str = ""

@app.post("/api/cover-letter/generate")
def api_generate_cover_letter(
    req: CoverLetterReq,
    current_user: models.User = Depends(get_current_user)
):
    from cover_letter import generate_cover_letter
    try:
        letter_text = generate_cover_letter(
            req.resume_json, 
            req.jd_text, 
            req.letter_type, 
            req.custom_instructions, 
            req.modifier
        )
        return {"success": True, "data": letter_text}
    except Exception as e:
        return {"success": False, "message": str(e)}

class CoverLetterExportReq(BaseModel):
    letter_text: str

@app.post("/api/cover-letter/export/pdf")
async def api_export_cover_letter_pdf(
    req: CoverLetterExportReq,
    current_user: models.User = Depends(get_current_user)
):
    import os
    import uuid
    from fastapi.responses import FileResponse
    from document_generator import generate_cover_letter_pdf
    
    filename = f"cover_letter_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)
    
    try:
        await generate_cover_letter_pdf(req.letter_text, filepath)
        return FileResponse(filepath, media_type='application/pdf', filename=filename)
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/cover-letter/export/docx")
def api_export_cover_letter_docx(
    req: CoverLetterExportReq,
    current_user: models.User = Depends(get_current_user)
):
    import os
    import uuid
    from fastapi.responses import FileResponse
    from document_generator import generate_cover_letter_docx
    
    filename = f"cover_letter_{uuid.uuid4().hex[:8]}.docx"
    filepath = os.path.join(TEMP_DIR, filename)
    
    try:
        generate_cover_letter_docx(req.letter_text, filepath)
        return FileResponse(filepath, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename=filename)
    except Exception as e:
        return {"success": False, "message": str(e)}

# --- APPLICATION CRM ENDPOINTS ---

class ApplicationReq(BaseModel):
    company: str
    job_title: str
    job_url: Optional[str] = None
    status: str = "Saved"
    notes: Optional[str] = None
    date_applied: Optional[str] = None

@app.get("/api/applications")
def get_applications(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    apps = db.query(models.JobApplication).filter(models.JobApplication.user_id == current_user.id).all()
    return {"success": True, "data": apps}

@app.post("/api/applications")
def create_application(req: ApplicationReq, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    app_obj = models.JobApplication(
        user_id=current_user.id,
        company=req.company,
        job_title=req.job_title,
        job_url=req.job_url,
        status=req.status,
        notes=req.notes
    )
    if req.date_applied:
        try:
            import dateutil.parser
            app_obj.date_applied = dateutil.parser.parse(req.date_applied)
        except:
            pass

    db.add(app_obj)
    db.commit()
    db.refresh(app_obj)
    return {"success": True, "data": app_obj}

@app.put("/api/applications/{app_id}")
def update_application(app_id: str, req: ApplicationReq, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    app_obj = db.query(models.JobApplication).filter(models.JobApplication.id == app_id, models.JobApplication.user_id == current_user.id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app_obj.company = req.company
    app_obj.job_title = req.job_title
    app_obj.job_url = req.job_url
    app_obj.status = req.status
    app_obj.notes = req.notes
    
    if req.date_applied:
        try:
            import dateutil.parser
            app_obj.date_applied = dateutil.parser.parse(req.date_applied)
        except:
            pass
            
    db.commit()
    db.refresh(app_obj)
    return {"success": True, "data": app_obj}

@app.delete("/api/applications/{app_id}")
def delete_application(app_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    app_obj = db.query(models.JobApplication).filter(models.JobApplication.id == app_id, models.JobApplication.user_id == current_user.id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(app_obj)
    db.commit()
    return {"success": True}

# --- AUTO APPLY ENDPOINTS ---

class AutoApplyVerifyReq(BaseModel):
    resume_json: dict
    jd_text: str

@app.post("/api/auto-apply/verify")
def api_auto_apply_verify(
    req: AutoApplyVerifyReq,
    current_user: models.User = Depends(get_current_user)
):
    from auto_apply_verifier import AutoApplyVerifier
    try:
        result = AutoApplyVerifier.verify_eligibility(req.resume_json, req.jd_text)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "message": str(e)}

class AutoApplyStartReq(BaseModel):
    job_url: str
    resume_json: dict
    cover_letter_text: str
    custom_fields: dict

@app.post("/api/auto-apply/start")
async def api_auto_apply_start(
    req: AutoApplyStartReq,
    current_user: models.User = Depends(get_current_user)
):
    from auto_apply_agent import AutoApplyAgent
    try:
        # Note: In a production scale system, this should be dispatched to Celery/Redis
        # Here we run it inline (await) for immediate feedback in the UI terminal
        result = await AutoApplyAgent.run_automation(
            job_url=req.job_url,
            profile_data=req.resume_json,
            cover_letter_text=req.cover_letter_text,
            custom_fields=req.custom_fields
        )
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "message": str(e)}

# --- SKILL GAP ANALYSIS ENDPOINTS ---

class SkillGapReq(BaseModel):
    resume_json: dict
    jd_text: str

@app.post("/api/skill-gap/analyze")
def api_skill_gap_analyze(
    req: SkillGapReq,
    current_user: models.User = Depends(get_current_user)
):
    from skill_analyzer import SkillGapAnalyzer
    try:
        result = SkillGapAnalyzer.analyze_skills(req.resume_json, req.jd_text)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "message": str(e)}

# --- LEARNING RECOMMENDATIONS ENDPOINTS ---

class RecommendReq(BaseModel):
    skills: List[str]

@app.post("/api/learning/recommend")
def api_learning_recommend(
    req: RecommendReq,
    current_user: models.User = Depends(get_current_user)
):
    from learning_api import LearningAggregator
    try:
        data = LearningAggregator.get_recommendations(req.skills)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "message": str(e)}

class SaveResourceReq(BaseModel):
    skill: str
    resource_type: str
    title: str
    url: str
    thumbnail_url: Optional[str] = None
    platform: Optional[str] = None
    price_status: Optional[str] = "Free"

@app.post("/api/learning/save")
def api_learning_save(
    req: SaveResourceReq,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        # Check if already saved
        existing = db.query(models.SavedLearningResource).filter(
            models.SavedLearningResource.user_id == current_user.id,
            models.SavedLearningResource.url == req.url
        ).first()
        if existing:
            return {"success": True, "message": "Already saved"}
            
        resource = models.SavedLearningResource(
            user_id=current_user.id,
            skill=req.skill,
            resource_type=req.resource_type,
            title=req.title,
            url=req.url,
            thumbnail_url=req.thumbnail_url,
            platform=req.platform,
            price_status=req.price_status
        )
        db.add(resource)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return {"success": False, "message": str(e)}

@app.get("/api/learning/saved")
def api_learning_get_saved(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        resources = db.query(models.SavedLearningResource).filter(models.SavedLearningResource.user_id == current_user.id).order_by(models.SavedLearningResource.saved_at.desc()).all()
        return {"success": True, "data": resources}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.delete("/api/learning/saved/{resource_id}")
def api_learning_delete_saved(
    resource_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        resource = db.query(models.SavedLearningResource).filter(
            models.SavedLearningResource.id == resource_id,
            models.SavedLearningResource.user_id == current_user.id
        ).first()
        if resource:
            db.delete(resource)
            db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return {"success": False, "message": str(e)}
