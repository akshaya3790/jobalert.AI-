import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth-only users
    avatar_url = Column(String(2048), nullable=True)
    bio = Column(String(1024), nullable=True)
    role = Column(String(50), default="student")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="user", cascade="all, delete-orphan")
    notification_prefs = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    push_subscriptions = relationship("PushSubscription", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")
    saved_learning = relationship("SavedLearningResource", back_populates="user", cascade="all, delete-orphan")
class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # 'google' or 'linkedin'
    provider_user_id = Column(String(255), nullable=False)

    # Relationships
    user = relationship("User", back_populates="oauth_accounts")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)

    # Relationships
    user = relationship("User", back_populates="reset_tokens")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(1024), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    is_primary = Column(Boolean, default=False)
    label = Column(String(255), nullable=True)  # e.g. "React Resume"
    raw_text = Column(Text, nullable=True)
    parsed_json = Column(Text, nullable=True)  # JSON-serialized parser results

    # Relationships
    user = relationship("User", back_populates="resumes")

class Job(Base):
    """Stores scraped job postings in a queryable, indexed format."""
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True)  # URL hash / stable id
    title = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=True, index=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    url = Column(String(2048), unique=True, nullable=False)
    source = Column(String(100), nullable=True)
    salary = Column(String(255), nullable=True)         # Raw string e.g. "$80k-$120k"
    work_type = Column(String(50), nullable=True, index=True)   # Remote/Hybrid/Onsite
    company_type = Column(String(50), nullable=True, index=True) # Product-based/Service-based/Startup
    match_score = Column(Integer, nullable=True, default=0)
    experience_level = Column(String(50), nullable=True, index=True)  # "0-1 yrs", "2-3 yrs", etc.
    skills_required = Column(Text, nullable=True)       # JSON array string of required skills
    scanned_at = Column(String(20), nullable=True)      # "YYYY-MM-DD"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Aggregation & Deduplication Engine fields
    is_active = Column(Boolean, default=True, index=True)
    original_posting_date = Column(DateTime, nullable=True)
    embedding = Column(Text, nullable=True)  # JSON-serialized array of floats or raw vector text

    # Relationships
    saved_by = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")

class SavedJob(Base):
    """Bookmarks: links authenticated users to jobs they've saved."""
    __tablename__ = "saved_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    saved_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_saved_job"),
    )

    # Relationships
    user = relationship("User", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_by")

class NotificationPreference(Base):
    """User preferences for various alert channels."""
    __tablename__ = "notification_preferences"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    email_enabled = Column(Boolean, default=True)
    telegram_enabled = Column(Boolean, default=False)
    whatsapp_enabled = Column(Boolean, default=False)
    push_enabled = Column(Boolean, default=False)
    
    telegram_chat_id = Column(String(100), nullable=True)
    whatsapp_number = Column(String(50), nullable=True)
    
    instant_alert_min_score = Column(Integer, default=90)
    daily_digest_enabled = Column(Boolean, default=True)
    
    # Relationship
    user = relationship("User", back_populates="notification_prefs")

class PushSubscription(Base):
    """Browser VAPID push subscriptions."""
    __tablename__ = "push_subscriptions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(String(1024), nullable=False)
    p256dh = Column(String(255), nullable=False)
    auth = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="push_subscriptions")

class JobApplication(Base):
    """Tracks a user's job applications and CRM pipeline status."""
    __tablename__ = "job_applications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=False)
    job_url = Column(String(1024), nullable=True)
    status = Column(String(50), default="Saved") # Enum: Saved, Applied, Assessment, Interview, Rejected, Offer
    date_applied = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="applications")

class SavedLearningResource(Base):
    __tablename__ = "saved_learning_resources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False) # "course", "youtube", "practice"
    title = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False)
    thumbnail_url = Column(String(1024), nullable=True)
    platform = Column(String(100), nullable=True)
    price_status = Column(String(50), nullable=True, default="Free") 
    saved_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="saved_learning")
