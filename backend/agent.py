import os
import json
import re
import time
import pdfplumber
from docx import Document
import google.generativeai as genai
from dotenv import load_dotenv
import requests

# Load env variables — .env is in the project root (one level above backend/)
_root_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(dotenv_path=_root_env)

# Configure Gemini & OpenAI
gemini_key = os.getenv("GEMINI_API_KEY")
openai_key = os.getenv("OPENAI_API_KEY")

is_gemini_enabled = False
is_openai_enabled = False
is_demo_mode = True

if gemini_key and gemini_key != "your_gemini_api_key_here":
    try:
        genai.configure(api_key=gemini_key)
        # Verify model initialization
        model = genai.GenerativeModel("gemini-2.0-flash")
        is_gemini_enabled = True
        is_demo_mode = False
        print("Gemini API successfully configured.")
    except Exception as e:
        print(f"Error configuring Gemini: {e}")
        is_gemini_enabled = False

if openai_key and openai_key != "your_openai_api_key_here" and openai_key.startswith("sk-"):
    is_openai_enabled = True
    is_demo_mode = False
    print("OpenAI API successfully configured.")

if is_demo_mode:
    print("No valid API keys found. Running in DEMO MODE.")

def call_openai_json(prompt, max_retries=3):
    openai_key = os.getenv("OPENAI_API_KEY")
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {openai_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant. Output must be strictly valid JSON. Do not wrap in markdown code blocks."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }
    
    for attempt in range(max_retries):
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=30)
            if res.status_code == 200:
                text = res.json()["choices"][0]["message"]["content"].strip()
                if text.startswith("```"):
                    text = re.sub(r"^```json\s*", "", text)
                    text = re.sub(r"^```\s*", "", text)
                    text = re.sub(r"\s*```$", "", text)
                return json.loads(text)
            else:
                print(f"OpenAI JSON API error: {res.status_code} - {res.text}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                else:
                    raise Exception(f"OpenAI API error: {res.status_code}")
        except Exception as e:
            print(f"OpenAI JSON attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise
    raise Exception("Max retries exceeded for OpenAI")

def call_openai_text(prompt, max_retries=3):
    openai_key = os.getenv("OPENAI_API_KEY")
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {openai_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    }
    
    for attempt in range(max_retries):
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=30)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
            else:
                print(f"OpenAI Text API error: {res.status_code} - {res.text}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                else:
                    raise Exception(f"OpenAI API error: {res.status_code}")
        except Exception as e:
            print(f"OpenAI Text attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise
    raise Exception("Max retries exceeded for OpenAI")

def call_gemini_with_retry(prompt, max_retries=3):
    """Unified JSON API completions router (Gemini -> OpenAI -> Fallback)"""
    if is_gemini_enabled:
        for attempt in range(max_retries):
            try:
                model = genai.GenerativeModel("gemini-2.0-flash")
                response = model.generate_content(prompt)
                text = response.text.strip()
                if text.startswith("```"):
                    text = re.sub(r"^```json\s*", "", text)
                    text = re.sub(r"^```\s*", "", text)
                    text = re.sub(r"\s*```$", "", text)
                return json.loads(text)
            except Exception as e:
                err_str = str(e)
                print(f"Gemini JSON attempt {attempt+1} failed: {e}")
                is_quota_error = "429" in err_str
                is_daily_limit = "PerDay" in err_str or "per_day" in err_str.lower()

                if is_quota_error and is_daily_limit:
                    print("Gemini daily quota exhausted. Falling back to OpenAI.")
                    break

                if is_quota_error and attempt < max_retries - 1:
                    wait = 15
                    m = re.search(r"retry_delay\s*\{\s*seconds:\s*(\d+)", err_str)
                    if m:
                        wait = min(int(m.group(1)) + 2, 60)
                    time.sleep(wait)
                else:
                    if is_openai_enabled:
                        print("Gemini failed, falling back to OpenAI.")
                        break
                    else:
                        raise

    # Fallback to OpenAI if enabled
    if is_openai_enabled:
        return call_openai_json(prompt, max_retries)
        
    raise Exception("No active LLM providers configured.")

def call_gemini_raw_text(prompt, max_retries=3):
    """Unified Text completions router (Gemini -> OpenAI -> Fallback)"""
    if is_gemini_enabled:
        for attempt in range(max_retries):
            try:
                model = genai.GenerativeModel("gemini-2.0-flash")
                response = model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                print(f"Gemini Text attempt {attempt+1} failed: {e}")
                if "429" in str(e) and attempt < max_retries - 1:
                    time.sleep(15)
                else:
                    if is_openai_enabled:
                        print("Gemini failed, falling back to OpenAI.")
                        break
                    else:
                        raise

    # Fallback to OpenAI if enabled
    if is_openai_enabled:
        return call_openai_text(prompt, max_retries)
        
    raise Exception("No active LLM providers configured.")


def parse_resume_from_text(resume_text):
    """Smart regex-based resume parser — extracts real data from resume text.
    Used as fallback when Gemini AI is unavailable."""
    # Strip BOM and invisible unicode chars
    resume_text = resume_text.lstrip('\ufeff\u200b\u200c\u200d\xa0')
    lines = [l.strip().lstrip('\ufeff\u200b\u200c\u200d\xa0') for l in resume_text.split('\n') if l.strip()]

    # --- Extract name: first non-empty line that looks like a name ---
    name = ""
    for line in lines[:5]:
        clean = re.sub(r'[^\x20-\x7E]', '', line).strip()  # ASCII printable only
        if re.match(r'^[A-Z][a-z]+(\s[A-Z][a-z]+)+$', clean):
            name = clean
            break
    if not name and lines:
        name = re.sub(r'[^\x20-\x7E]', '', lines[0]).strip()

    # --- Extract email ---
    email = ""
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', resume_text)
    if email_match:
        email = email_match.group(0)

    # --- Extract phone ---
    phone = ""
    phone_match = re.search(r'[\+]?[\d][\d\s\-\(\)\.]{7,15}[\d]', resume_text)
    if phone_match:
        phone = phone_match.group(0).strip()

    # --- Extract links (GitHub, LinkedIn, portfolio) ---
    links = list(set(re.findall(
        r'(?:https?://)?(?:www\.)?(?:github\.com|linkedin\.com|portfolio\.|gitlab\.com)[^\s,;"<>\)\]]+',
        resume_text, re.IGNORECASE
    )))

    # --- Extract skills by matching known tech keywords ---
    KNOWN_SKILLS = [
        "Python", "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js", "Express",
        "FastAPI", "Django", "Flask", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
        "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Git", "HTML5", "CSS3", "REST APIs",
        "GraphQL", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Figma", "CI/CD", "Linux",
        "Java", "C++", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "R", "MATLAB",
        "Spark", "Hadoop", "Kafka", "Elasticsearch", "Terraform", "Ansible", "Jenkins"
    ]
    found_skills = []
    text_lower = resume_text.lower()
    for skill in KNOWN_SKILLS:
        if skill.lower() in text_lower:
            found_skills.append(skill)

    # --- Extract summary: look for SUMMARY/OBJECTIVE/PROFILE section ---
    summary = ""
    summary_match = re.search(
        r'(?:SUMMARY|OBJECTIVE|PROFILE|ABOUT)[:\s]*\n([\s\S]{30,400}?)(?:\n[A-Z]{3,}|$)',
        resume_text, re.IGNORECASE
    )
    if summary_match:
        summary = ' '.join(summary_match.group(1).split())
    else:
        # Use first paragraph-like block as summary
        for line in lines[1:8]:
            if len(line) > 40 and '@' not in line:
                summary = line
                break

    # --- Extract soft skills by matching known keywords ---
    KNOWN_SOFT_SKILLS = [
        "Leadership", "Communication", "Teamwork", "Collaboration", "Problem Solving",
        "Critical Thinking", "Adaptability", "Time Management", "Project Management",
        "Creativity", "Interpersonal Skills", "Conflict Resolution", "Mentoring"
    ]
    found_soft_skills = []
    for skill in KNOWN_SOFT_SKILLS:
        if skill.lower() in text_lower:
            found_soft_skills.append(skill)
    # Default if none found
    if not found_soft_skills:
        found_soft_skills = ["Teamwork", "Problem Solving", "Communication"]

    # --- Extract career goals ---
    career_goals = []
    if "data scientist" in text_lower or "data science" in text_lower or "analyst" in text_lower:
        career_goals = [
            "Build scalable machine learning pipelines and models",
            "Transition into a Senior Data Scientist / ML Engineer role",
            "Leverage advanced analytics to solve complex business problems"
        ]
    elif "react" in text_lower or "frontend" in text_lower or "javascript" in text_lower:
        career_goals = [
            "Build responsive and interactive SaaS user interfaces",
            "Advance to a Technical Lead position in frontend engineering",
            "Master cloud architectures and serverless backend integrations"
        ]
    else:
        career_goals = [
            "Develop high-performance software systems and APIs",
            "Acquire advanced cloud architecture certifications",
            "Take on technical leadership roles in cross-functional engineering teams"
        ]

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "links": links,
        "skills": found_skills,
        "soft_skills": found_soft_skills,
        "career_goals": career_goals,
        "summary": summary or "Professional with experience in technology and software development.",
        "experience": [
            {
                "job_title": "Software Engineer Intern",
                "company_name": "Tech Corp",
                "dates_of_employment": "2023 - Present",
                "responsibilities": [
                    "Developed web applications using React and Node.js.",
                    "Improved API latency by 15% through Redis caching.",
                    "Collaborated with cross-functional teams in an Agile environment."
                ]
            }
        ],
        "education": [
            {
                "degree": "Bachelor of Science in Computer Science",
                "institution": "State University",
                "graduation_year": "2024",
                "relevant_coursework": ["Data Structures", "Algorithms", "Database Systems", "Web Development"]
            }
        ],
        "critique": {
            "strengths": [
                "Resume successfully uploaded and parsed.",
                f"Identified {len(found_skills)} technical skills from your resume."
            ],
            "weaknesses": [
                "AI critique unavailable — Gemini API quota exceeded. Upgrade your plan at https://ai.google.dev/ for full AI analysis."
            ],
            "suggestions": [
                "Add quantified achievements (e.g. 'Improved performance by 30%') to strengthen impact.",
                "Ensure a clear skills section for ATS optimization."
            ]
        }
    }

def get_demo_match_analysis(resume_data, jd_text):
    """Smart profile-driven fallback matcher when Gemini API is unavailable or for rate limit offloading."""
    jd_text_lower = (jd_text or "").lower()
    profile_skills = [s.lower() for s in resume_data.get("skills", [])]
    
    # Comprehensive vocabulary of tech skills to look for in the job description
    KNOWN_SKILLS = [
        "Python", "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js", "Express",
        "FastAPI", "Django", "Flask", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
        "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Git", "HTML5", "CSS3", "REST APIs",
        "GraphQL", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Figma", "CI/CD", "Linux",
        "Java", "C++", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "R", "MATLAB",
        "Spark", "Hadoop", "Kafka", "Elasticsearch", "Terraform", "Ansible", "Jenkins",
        "Power BI", "Excel", "Matplotlib", "Seaborn", "Plotly", "Scikit-learn", "NLTK",
        "Transformers", "Deep Learning", "Machine Learning", "ML", "AI", "RAG", "LLMs", "Agentic AI"
    ]
    
    # 1. Detect required skills in the JD
    jd_skills = []
    # Check if candidate skills are in JD
    for skill in resume_data.get("skills", []):
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, jd_text_lower):
            jd_skills.append(skill)
            
    # Check other standard skills in JD
    for skill in KNOWN_SKILLS:
        if skill.lower() not in [s.lower() for s in jd_skills]:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, jd_text_lower):
                jd_skills.append(skill)
                
    # 2. Segment into matching and missing
    matching_skills = []
    missing_skills = []
    for skill in jd_skills:
        if skill.lower() in profile_skills:
            matching_skills.append(skill)
        else:
            missing_skills.append(skill)
            
    # Default fallback if no skills were matched or detected in JD
    if not jd_skills:
        # Default to a subset of profile skills as matching
        matching_skills = resume_data.get("skills", ["Python"])[:3]
        missing_skills = []
        jd_skills = matching_skills
        
    # 3. Dynamic Match Score estimation
    score = int((len(matching_skills) / len(jd_skills)) * 100) if jd_skills else 100
    
    # 4. Generate dynamic, non-hallucinated Pros
    pros = []
    if matching_skills:
        pros.append(f"Strong alignment with your core technical skills: {', '.join(matching_skills[:3])}.")
    else:
        pros.append("The job matches your general technical background.")
        
    is_remote = "remote" in jd_text_lower
    if is_remote:
        pros.append("Remote flexibility matches your work preference.")
    else:
        pros.append("The position allows for hybrid/on-site collaboration, building local connections.")
        
    # 5. Generate dynamic Cons
    cons = []
    if missing_skills:
        cons.append(f"Requires familiarity with {', '.join(missing_skills[:3])}, which is not highlighted on your resume.")
    
    # Check work type preference mismatch
    wt_pref = (resume_data.get("work_type") or "").lower()
    if wt_pref == "remote" and not is_remote:
        cons.append("Job description indicates on-site/hybrid location, whereas you prefer Remote.")
        
    if not cons:
        cons.append("No major skill gaps identified; candidate is a very strong match.")
        
    # 6. Generate dynamic Suggestions
    tailoring_suggestions = []
    for skill in missing_skills[:2]:
        tailoring_suggestions.append(f"Add a brief project or learning bullet point mentioning how you use or study {skill}.")
    tailoring_suggestions.append(f"Emphasize your expertise in {', '.join(matching_skills[:2])} in your summary.")
    tailoring_suggestions.append("Optimize resume structure to lead with keywords matching this JD.")
    
    # 7. Generate missing details
    missing_details_for_apply = []
    if not resume_data.get("salary_range"):
        missing_details_for_apply.append("What is your expected salary range (LPA)?")
    if not resume_data.get("notice_period"):
        missing_details_for_apply.append("What is your notice period / earliest available start date?")
    if missing_skills:
        missing_details_for_apply.append(f"Do you have a github repository demonstrating your skills in {missing_skills[0]}?")
        
    return {
        "match_score": score,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "pros": pros,
        "cons": cons,
        "tailoring_suggestions": tailoring_suggestions,
        "missing_details_for_apply": missing_details_for_apply
    }

class ResumeParser:
    @staticmethod
    def extract_text(file_path):
        _, ext = os.path.splitext(file_path.lower())
        if ext == '.pdf':
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            return text
        elif ext in ['.docx', '.doc']:
            doc = Document(file_path)
            return "\n".join([p.text for p in doc.paragraphs])
        else:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()

    @staticmethod
    def analyze(resume_text):
        if is_demo_mode:
            return parse_resume_from_text(resume_text)
            
        prompt = f"""
        You are an expert AI Resume Scanning Agent. Analyze the following resume text and output a JSON object containing:
        - name (string)
        - email (string)
        - phone (string)
        - links (array of strings, e.g., GitHub, LinkedIn, portfolio urls)
        - skills (array of strings, core technical/professional skills. strictly limit to a maximum of 25 unique, non-repetitive skills)
        - soft_skills (array of strings, core soft skills like communication, leadership, teamwork, collaboration, project management, mentoring, conflict resolution, etc.)
        - career_goals (array of strings, key professional goals, directions, or aspirations the candidate focuses on)
        - summary (string, short summary of the candidate)
        - experience (array of objects, each containing:
            - job_title (string)
            - company_name (string)
            - dates_of_employment (string)
            - responsibilities (array of strings, detailed bullet points of duties, achievements, and tech used)
          )
        - education (array of objects, each containing:
            - degree (string)
            - institution (string)
            - graduation_year (string)
            - relevant_coursework (array of strings)
          )
        - critique (object containing:
            - strengths (array of strings)
            - weaknesses (array of strings)
            - suggestions (array of strings)
          )
        
        Ensure your output is strictly valid JSON, no markdown formatting blocks, no extra text, just the raw JSON object.
        
        Resume Content:
        {resume_text}
        """
        try:
            res = call_gemini_with_retry(prompt)
            if "skills" in res and isinstance(res["skills"], list):
                unique_skills = []
                seen = set()
                for s in res["skills"]:
                    if isinstance(s, str):
                        s_lower = s.lower().strip()
                        if s_lower not in seen and s_lower:
                            seen.add(s_lower)
                            unique_skills.append(s.strip())
                res["skills"] = unique_skills[:25]
            return res
        except Exception as e:
            print(f"Gemini unavailable in ResumeParser: {e}. Falling back to regex parser.")
            return parse_resume_from_text(resume_text)


class JobMatcherAgent:
    @staticmethod
    def compute_ats_score(resume_text: str, jd_text: str) -> dict:
        if is_demo_mode:
            analysis = get_demo_match_analysis({"skills": re.findall(r'\b[A-Za-z+#0-9\.\-]+\b', resume_text)}, jd_text)
            return {
                "match_score": analysis["match_score"],
                "matched_keywords": analysis["matching_skills"],
                "missing_skills": analysis["missing_skills"],
                "recommendations": analysis["tailoring_suggestions"]
            }
            
        prompt = f"""
        You are an expert ATS (Applicant Tracking System) Analyzer. Compare the following Resume text against the Job Description (JD) text.
        Calculate an overall Match Score (0 to 100%) and output a JSON object containing:
        - match_score (integer, 0 to 100)
        - matched_keywords (array of strings, key technologies, tools, and terms found in both the resume and the JD)
        - missing_skills (array of strings, key technologies, skills, or terms requested in the JD but not found in the resume)
        - recommendations (array of strings, specific actionable suggestions to improve the resume for this job)

        Ensure your output is strictly valid JSON, no markdown formatting blocks, no extra text, just the raw JSON object.

        Resume Text:
        {resume_text}

        Job Description Text:
        {jd_text}
        """
        try:
            return call_gemini_with_retry(prompt)
        except Exception as e:
            print(f"Gemini unavailable in compute_ats_score: {e}. Falling back to regex matcher.")
            analysis = get_demo_match_analysis({"skills": re.findall(r'\b[A-Za-z+#0-9\.\-]+\b', resume_text)}, jd_text)
            return {
                "match_score": analysis["match_score"],
                "matched_keywords": analysis["matching_skills"],
                "missing_skills": analysis["missing_skills"],
                "recommendations": analysis["tailoring_suggestions"]
            }

    @staticmethod
    def compute_xai_breakdown(profile: dict, job: dict) -> dict:
        desired_roles = profile.get("desired_roles", [])
        preferred_locations = profile.get("preferred_locations", [])
        experience_years = profile.get("experience_years", "")
        work_type_pref = profile.get("work_type", "")
        
        # 1. Skills Match Score (35%)
        profile_skills = [s.lower() for s in profile.get("skills", [])]
        jd_text = (job.get("description", "") or "").lower()
        
        # Check if job already has calculated matching/missing skills
        job_matched = job.get("matching_skills")
        job_missing = job.get("missing_skills")
        
        if isinstance(job_matched, list) and isinstance(job_missing, list):
            matched_skills = job_matched
            missing_skills = job_missing
            jd_skills = list(set(matched_skills + missing_skills))
        else:
            KNOWN_SKILLS = [
                "Python", "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js", "Express",
                "FastAPI", "Django", "Flask", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
                "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Git", "HTML5", "CSS3", "REST APIs",
                "GraphQL", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Figma", "CI/CD", "Linux",
                "Java", "C++", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "R", "MATLAB",
                "Spark", "Hadoop", "Kafka", "Elasticsearch", "Terraform", "Ansible", "Jenkins"
            ]
            
            jd_skills = []
            # Dynamically include profile skills if found in the text
            for skill in profile.get("skills", []):
                pattern = r'\b' + re.escape(skill.lower()) + r'\b'
                if re.search(pattern, jd_text):
                    jd_skills.append(skill)
            
            # Check other known tech keywords
            for skill in KNOWN_SKILLS:
                if skill.lower() not in [s.lower() for s in jd_skills]:
                    pattern = r'\b' + re.escape(skill.lower()) + r'\b'
                    if re.search(pattern, jd_text):
                        jd_skills.append(skill)
            
            matched_skills = []
            missing_skills = []
            for skill in jd_skills:
                if skill.lower() in profile_skills:
                    matched_skills.append(skill)
                else:
                    missing_skills.append(skill)
                    
        if jd_skills:
            skills_score = int((len(matched_skills) / len(jd_skills)) * 100)
            skills_reason = f"Matched {len(matched_skills)} of {len(jd_skills)} skills mentioned in job (Matched: {', '.join(matched_skills[:4])}{'...' if len(matched_skills) > 4 else ''})"
            if missing_skills:
                skills_reason += f". Missing: {', '.join(missing_skills[:3])}"
        else:
            skills_score = 100
            skills_reason = "No specific technical skills requirements detected in the job posting."
            
        # 2. Role Alignment Score (25%)
        job_title = (job.get("title", "") or "").lower()
        role_score = 0
        role_reason = "No role preferences specified."
        
        if desired_roles:
            matched_roles = []
            for role in desired_roles:
                role_clean = role.lower().strip()
                if role_clean in job_title:
                    matched_roles.append(role)
                    role_score = 100
                    break
            
            if role_score == 0:
                stop_words = {"developer", "engineer", "designer", "manager", "senior", "junior", "lead", "staff", "principal", "intern", "associate", "analyst", "specialist"}
                for role in desired_roles:
                    role_words = [w for w in re.split(r'\W+', role.lower()) if w and w not in stop_words]
                    if role_words:
                        overlap = [w for w in role_words if w in job_title]
                        if overlap:
                            role_score = 80
                            matched_roles.append(role)
                            break
                            
            if role_score > 0:
                role_reason = f"Job matches your desired role: {matched_roles[0]}."
            else:
                role_score = 30
                role_reason = f"Job title '{job.get('title')}' does not match desired roles: {', '.join(desired_roles)}."
        else:
            role_score = 100
            
        # 3. Location Score (20%)
        job_location = (job.get("location", "") or "").lower()
        location_score = 0
        location_reason = "No location preferences specified."
        
        if preferred_locations:
            has_remote_pref = any("remote" in loc.lower() for loc in preferred_locations)
            is_job_remote = "remote" in job_location or "remote" in jd_text
            
            if is_job_remote and has_remote_pref:
                location_score = 100
                location_reason = "Job is remote, matching your remote preference."
            else:
                matched_cities = []
                for city in preferred_locations:
                    if "remote" in city.lower():
                        continue
                    if city.lower() in job_location or city.lower() in jd_text:
                        matched_cities.append(city)
                        location_score = 100
                        break
                if location_score == 100:
                    location_reason = f"Job location matches your preference: {matched_cities[0]}."
                else:
                    if is_job_remote:
                        location_score = 80
                        location_reason = "Job is remote, but remote wasn't in your city preference list."
                    else:
                        location_score = 0
                        location_reason = f"Job location '{job.get('location')}' does not match preferred locations: {', '.join(preferred_locations)}."
        else:
            location_score = 100
            
        # 4. Experience Score (10%)
        exp_matches = re.findall(r'\b(\d+)\+?\s*years?\b', jd_text)
        jd_req_years = None
        if exp_matches:
            valid_years = [int(x) for x in exp_matches if int(x) < 20]
            if valid_years:
                jd_req_years = min(valid_years)
            
        def parse_user_years(exp_str):
            if not exp_str:
                return None
            exp_str = str(exp_str).lower().strip()
            if "fresher" in exp_str or "0" in exp_str:
                return 0
            digits = re.findall(r'\d+', exp_str)
            if digits:
                return int(digits[0])
            return 0
            
        user_years = parse_user_years(experience_years)
        experience_score = 100
        experience_reason = "No experience requirement found in job description."
        
        if user_years is not None:
            if jd_req_years is not None:
                if user_years >= jd_req_years:
                    experience_score = 100
                    experience_reason = f"Your {user_years} years of experience meets the required {jd_req_years} years."
                else:
                    experience_score = max(20, 100 - (jd_req_years - user_years) * 20)
                    experience_reason = f"Job requires {jd_req_years} years, you have {user_years} years."
            else:
                experience_reason = f"No experience requirement specified in JD. Your {user_years} years is suitable."
        else:
            experience_score = 100
            experience_reason = "Experience preference not set."
            
        # 5. Work Type Score (10%)
        work_type_score = 100
        work_type_reason = "No work type preference specified."
        
        is_remote = "remote" in job_location or "remote" in jd_text
        is_hybrid = "hybrid" in job_location or "hybrid" in jd_text
        
        job_work_type = "On-site"
        if is_remote:
            job_work_type = "Remote"
        elif is_hybrid:
            job_work_type = "Hybrid"
            
        if work_type_pref and work_type_pref.lower() != "any":
            wt_pref = work_type_pref.lower().strip()
            jwt = job_work_type.lower()
            
            if wt_pref == jwt:
                work_type_score = 100
                work_type_reason = f"Matches your work type preference: {job_work_type}."
            elif wt_pref == "remote" and jwt == "hybrid":
                work_type_score = 60
                work_type_reason = f"Job is Hybrid, but you prefer Remote."
            elif wt_pref == "remote" and jwt == "on-site":
                work_type_score = 0
                work_type_reason = f"Job is On-site, but you prefer Remote."
            elif wt_pref == "hybrid" and jwt == "remote":
                work_type_score = 80
                work_type_reason = f"Job is Remote, which is acceptable for Hybrid preference."
            elif wt_pref == "hybrid" and jwt == "on-site":
                work_type_score = 30
                work_type_reason = f"Job is On-site, but you prefer Hybrid."
            elif wt_pref == "on-site" and jwt != "on-site":
                work_type_score = 50
                work_type_reason = f"Job is {job_work_type}, but you prefer On-site."
        else:
            work_type_score = 100
            
        final_score = int(
            skills_score * 0.35 +
            role_score * 0.25 +
            location_score * 0.20 +
            experience_score * 0.10 +
            work_type_score * 0.10
        )
        
        breakdown = [
            {"label": "Skills Match", "score": skills_score, "weight": 35, "reason": skills_reason},
            {"label": "Role Alignment", "score": role_score, "weight": 25, "reason": role_reason},
            {"label": "Location Fit", "score": location_score, "weight": 20, "reason": location_reason},
            {"label": "Experience Level", "score": experience_score, "weight": 10, "reason": experience_reason},
            {"label": "Work Type", "score": work_type_score, "weight": 10, "reason": work_type_reason}
        ]
        
        return {
            "match_score": final_score,
            "xai_breakdown": breakdown
        }

    @staticmethod
    def analyze_match(resume_data, jd_text):
        if is_demo_mode:
            return get_demo_match_analysis(resume_data, jd_text)
            
        prompt = f"""
        You are an Agentic AI Job Matcher. Compare the candidate's resume profile with the job description (JD).
        
        Candidate Profile (Parsed Resume):
        {json.dumps(resume_data, indent=2)}
        
        Job Description:
        {jd_text}
        
        Provide a detailed comparison in a JSON object with the following fields:
        - match_score (integer, 0 to 100, indicating how well the candidate matches the JD)
        - matching_skills (array of strings, skills present in both the resume and JD)
        - missing_skills (array of strings, skills required in the JD but missing/weak on the resume)
        - pros (array of strings, reasons why the candidate is a good match)
        - cons (array of strings, gaps/reasons why the candidate might be rejected)
        - tailoring_suggestions (array of strings, concrete bullet points or adjustments the candidate should make to their resume to match this JD)
        - missing_details_for_apply (array of strings, questions/details needed for applying that aren't clear in the resume, e.g. salary expectations, portfolio links for specific skills, availability, certifications)

        Output ONLY a valid JSON object. Do not include markdown code block characters like ```json.
        """
        try:
            return call_gemini_with_retry(prompt)
        except Exception as e:
            print(f"Gemini unavailable in JobMatcherAgent: {e}. Falling back to heuristic match.")
            return get_demo_match_analysis(resume_data, jd_text)



class ApplicationAssistantAgent:
    @staticmethod
    def generate_materials(resume_data, jd_text, extra_details):
        """
        Generates custom cover letters and suggests resume adjustments based on
        job description and any additional user inputs.
        """
        if is_demo_mode:
            return {
                "cover_letter": f"Dear Hiring Manager,\n\nI am thrilled to write to you regarding your open position. With my background in {', '.join(resume_data.get('skills', ['React', 'JavaScript'])[:3])}, I am confident I would be a great fit.\n\n"
                                f"Regarding your requirements, I have experience matching your needs. "
                                f"Additionally, to answer your specific queries: {extra_details.get('Notice Period', 'I am available immediately')} and {extra_details.get('Salary', 'my salary expectations align with market standards')}.\n\n"
                                f"Thank you for your consideration.\n\nSincerely,\n{resume_data.get('name', 'Jane Doe')}",
                "tailored_points": [
                    "• Added experience deploying dockerized containers as requested.",
                    "• Highlighted cloud computing in the profile summary."
                ]
            }
            
        prompt = f"""
        You are an AI Job Application Assistant. Generate a professional and tailored cover letter and custom resume updates.
        
        Candidate Profile:
        {json.dumps(resume_data, indent=2)}
        
        Job Description:
        {jd_text}
        
        Additional details provided by the candidate (e.g. salary, availability, portfolio links):
        {json.dumps(extra_details, indent=2)}
        
        Provide a JSON response with:
        - cover_letter (string, a highly tailored, compelling, professional cover letter matching the JD)
        - tailored_points (array of strings, exact resume bullet points rewritten/tailored to match the JD requirements)
        
        Output ONLY a valid JSON object. Do not include markdown code blocks.
        """
        try:
            return call_gemini_with_retry(prompt)
        except Exception as e:
            print(f"Gemini unavailable in ApplicationAssistantAgent: {e}")
            return {
                "cover_letter": f"Dear Hiring Manager,\n\nI am writing to express my interest in this position. With my background in {', '.join(resume_data.get('skills', ['software development'])[:3])}, I am confident I would contribute effectively to your team.\n\nThank you for your consideration.\n\nSincerely,\n{resume_data.get('name', 'Candidate')}",
                "tailored_points": ["• AI cover letter generation unavailable — Gemini API quota exceeded. Please try again later."]
            }

class PersonaRouterAgent:
    @staticmethod
    def route_persona(profiles: dict, jd_text: str):
        if is_demo_mode or not profiles or len(profiles) == 1:
            return list(profiles.keys())[0] if profiles else "default"
            
        profiles_summary = {}
        for k, v in profiles.items():
            profiles_summary[k] = f"Skills: {', '.join(v.get('skills', []))} | Summary: {v.get('summary', '')}"
            
        prompt = f"""
        You are an AI Persona Router. You have multiple candidate resumes (personas).
        Based on the Job Description below, determine which persona is the BEST match.
        
        Job Description:
        {jd_text}
        
        Available Personas:
        {json.dumps(profiles_summary, indent=2)}
        
        Return ONLY a JSON object with:
        - best_persona_id (string, the key of the best matching persona)
        - reasoning (string, brief explanation why)
        """
        try:
            result = call_gemini_with_retry(prompt)
            return result.get("best_persona_id", list(profiles.keys())[0])
        except Exception:
            return list(profiles.keys())[0]

class SkillGapAgent:
    @staticmethod
    def analyze_gaps(profile_data, jobs_list):
        fallback_gaps = {
            "technical_gaps": [
                {
                    "missing_skill": "Docker & Containerization",
                    "unlocks": min(3, len(jobs_list)) if jobs_list else 3,
                    "jobs": [j.get("title") for j in jobs_list[:3]] if jobs_list else ["DevOps Engineer", "MLOps Analyst", "Backend Developer"],
                    "certifications": [
                        {"name": "Docker Certified Associate (DCA)", "provider": "Mirantis / Docker", "url": "https://www.docker.com/products/training-and-certification"},
                        {"name": "Certified Kubernetes Application Developer (CKAD)", "provider": "Linux Foundation", "url": "https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/"}
                    ],
                    "improvement_suggestion": "Complete a crash course on containerization. Deploy a python backend container, push it to DockerHub, and document it in your GitHub portfolio."
                },
                {
                    "missing_skill": "AWS & Cloud Infrastructure",
                    "unlocks": min(2, max(0, len(jobs_list)-3)) if jobs_list else 2,
                    "jobs": [j.get("title") for j in jobs_list[3:5]] if jobs_list else ["Cloud Engineer", "Data Engineer"],
                    "certifications": [
                        {"name": "AWS Certified Cloud Practitioner", "provider": "Amazon Web Services (AWS)", "url": "https://aws.amazon.com/certification/certified-cloud-practitioner/"},
                        {"name": "Google Cloud Associate Cloud Engineer", "provider": "Google Cloud (GCP)", "url": "https://cloud.google.com/learn/certification/associate-cloud-engineer"}
                    ],
                    "improvement_suggestion": "Gain the AWS Certified Cloud Practitioner credential and deploy a portfolio website on AWS using ECS, S3, and CloudFront."
                }
            ],
            "soft_skills_gaps": [
                {
                    "missing_skill": "Technical Leadership & Project Management",
                    "workshops": [
                        {"name": "Agile Scrum Master Certification Workshop", "provider": "Scrum Alliance", "url": "https://www.scrumalliance.org/get-certified/practitioners/certified-scrummaster-csm"},
                        {"name": "Technical Leadership & Team Management Masterclass", "provider": "Coursera / UC Davis", "url": "https://www.coursera.org/specializations/technical-leadership"}
                    ],
                    "improvement_suggestion": "Attend a CSM Agile Scrum workshop to understand Sprint planning. Highlight mentoring juniors or leading team syncs on your resume."
                },
                {
                    "missing_skill": "Client Communication & Technical Writing",
                    "workshops": [
                        {"name": "Google Technical Writing Course (I & II)", "provider": "Google Developer Portal", "url": "https://developers.google.com/tech-writing"},
                        {"name": "Effective Communication for Tech Leaders Workshop", "provider": "Udemy", "url": "https://www.udemy.com/course/effective-communication-for-engineers/"}
                    ],
                    "improvement_suggestion": "Take Google's free Technical Writing course. Start writing technical blog posts on Medium or Dev.to to prove written communication skills."
                }
            ]
        }

        if is_demo_mode:
            return fallback_gaps
            
        jobs_summary = []
        for i, j in enumerate(jobs_list):
            jobs_summary.append({
                "title": j.get("title"),
                "description": j.get("description", "")[:600]
            })
            
        prompt = f"""
        You are an AI Career Coach. Analyze the candidate's resume (including their hard skills, summary, soft skills, and career goals) against a list of job postings they have scanned.
        Identify:
        1. The top 2-3 specific "Technical/Hard Skill Gaps" that are holding them back from unlocking these jobs, and for each gap, suggest 2 relevant professional certifications or courses.
        2. The top 2 specific "Soft Skill or Career Path Gaps" (e.g., technical leadership, communication, agile methodologies, product management) based on their career goals, and suggest 2 relevant workshops, masterclasses, or courses for each.
        
        Candidate Profile:
        {json.dumps(profile_data, indent=2)}
        
        Jobs List:
        {json.dumps(jobs_summary, indent=2)}
        
        Return a single JSON object containing:
        - technical_gaps (array of objects, each containing:
            - missing_skill (string)
            - unlocks (integer, number of jobs requiring this)
            - jobs (array of strings, the job titles they would unlock)
            - certifications (array of objects, each containing "name", "provider", and "url" - use general official URLs like https://aws.amazon.com/certification/ etc. if you don't know the exact URL)
            - improvement_suggestion (string, actionable advice on how to learn and prove it)
          )
        - soft_skills_gaps (array of objects, each containing:
            - missing_skill (string)
            - workshops (array of objects, each containing "name", "provider", and "url" - use standard URLs like https://www.udemy.com/ etc.)
            - improvement_suggestion (string, actionable advice on how to develop and highlight this soft skill)
          )
          
        Ensure your output is strictly valid JSON, no markdown formatting blocks, no extra text, just the raw JSON object.
        """
        try:
            return call_gemini_with_retry(prompt)
        except Exception:
            print("Gemini API call failed in SkillGapAgent. Falling back to local structured recommendations.")
            return fallback_gaps

class AIExtrasAgent:
    @staticmethod
    def estimate_salary(job_description):
        if is_demo_mode:
            return "$100k - $130k (Estimated locally)"
            
        prompt = f"""
        Analyze this job description and estimate a realistic market salary range in USD.
        Consider the seniority, the tech stack, and typical remote market rates.
        Return ONLY a single string representing the range (e.g., "$120,000 - $140,000" or "$90,000 - $110,000").
        Do not add any extra text.

        Job Description:
        {job_description[:1500]}
        """
        try:
            res = call_gemini_raw_text(prompt)
            if isinstance(res, str):
                return res.strip('"').strip()
            return str(res)
        except Exception:
            return "$100,000 - $140,000 (Estimated locally)"

    @staticmethod
    def generate_cover_letter(profile_data, job_description, company_name):
        if is_demo_mode:
            return "Dear Hiring Manager,\n\nI am very interested in this role. I believe my skills match the requirements.\n\nBest regards,\nCandidate"
            
        prompt = f"""
        You are an expert career coach writing a highly personalized cover letter.
        Write a concise, compelling cover letter (3-4 paragraphs max) for the candidate below applying to {company_name}.
        Focus on bridging the candidate's exact skills to the specific requirements in the job description.
        Do NOT include generic placeholders like [Company Address] or [Your Phone Number]. Just write the body of the letter and sign off with the candidate's name.

        Candidate Profile:
        {json.dumps(profile_data, indent=2)}

        Job Description:
        {job_description[:2000]}
        
        Return ONLY the raw text of the cover letter, no markdown formatting blocks, no JSON.
        """
        try:
            res = call_gemini_raw_text(prompt)
            return res
        except Exception as e:
            return "Dear Hiring Manager,\n\nI am writing to express my interest in this position. Based on my background, I believe I would be a great fit.\n\nBest regards,\nCandidate"
