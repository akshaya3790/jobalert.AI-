import asyncio
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from notifications import send_email_alert, send_telegram_alert, send_whatsapp_alert, send_web_push

scheduler = AsyncIOScheduler()

def run_aggregation_pipeline():
    """
    Cron job to fetch jobs from API/RSS and run them through the 
    Pandas normalization and Sentence-Transformer deduplication pipeline.
    """
    print("Starting Multi-Source Job Aggregation Pipeline...")
    try:
        from scrapers import RemotiveScraper, WWRScraper
        from pipeline import normalize_job_data, deduplicate_jobs
        import hashlib
        
        # 1. Fetch raw jobs (In a full setup, this iterates all active scraper modules)
        raw_jobs = []
        raw_jobs.extend(RemotiveScraper.search("developer"))
        raw_jobs.extend(WWRScraper.search("developer"))
        
        # 2. Normalize
        normalized_jobs = []
        for j in raw_jobs:
            try:
                norm_j = normalize_job_data(j)
                normalized_jobs.append(norm_j)
            except Exception as e:
                print(f"Normalization failed for {j.get('title')}: {e}")
                
        # 3. Deduplicate against existing active jobs
        db = SessionLocal()
        existing_jobs = db.query(models.Job).filter(models.Job.is_active == True).order_by(models.Job.created_at.desc()).limit(1000).all()
        
        unique_jobs = deduplicate_jobs(normalized_jobs, existing_jobs)
        
        # 4. Insert to DB
        added = 0
        for full_job in unique_jobs:
            job_url = full_job.get("url", "")
            if not job_url:
                continue
                
            job_id = hashlib.md5(job_url.encode()).hexdigest()[:36]
            existing_db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
            
            if not existing_db_job:
                skills = [] # Optionally extract skills here
                db.add(models.Job(
                    id=job_id,
                    title=full_job.get('title', 'Untitled'),
                    company=full_job.get('company', ''),
                    location=full_job.get('location', ''),
                    description=full_job.get('description', ''),
                    url=job_url,
                    source=full_job.get('source', ''),
                    salary=full_job.get('salary', ''),
                    work_type=full_job.get('work_type', 'Remote'),
                    match_score=0,
                    embedding=full_job.get('embedding', ''),
                    is_active=True
                ))
                added += 1
                
        db.commit()
        db.close()
        print(f"Aggregation Pipeline Complete: Inserted {added} unique jobs out of {len(raw_jobs)} fetched.")
        
    except Exception as e:
        print(f"Aggregation Pipeline Error: {e}")

def process_instant_alerts(job_id: str):
    """
    Triggered immediately after a new job is saved to the DB.
    Checks users with instant alerts enabled whose min score threshold is met.
    """
    db = SessionLocal()
    try:
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            return

        # Simple matching based on match_score for now.
        # In a real app, you'd match job skills/location against user prefs.
        users_to_alert = db.query(models.User).join(models.NotificationPreference).filter(
            models.NotificationPreference.instant_alert_min_score <= job.match_score
        ).all()

        for user in users_to_alert:
            prefs = user.notification_prefs
            
            # Message formatting
            subject = f"Instant Job Alert: {job.title} at {job.company}"
            html = f"<h2>New Job Match!</h2><p>{job.title} at {job.company} matches your profile with a score of {job.match_score}%.</p><a href='{job.url}'>Apply Here</a>"
            text = f"🔥 *Instant Job Alert*\n\n*{job.title}* at {job.company}\nMatch Score: {job.match_score}%\n\n[Apply Now]({job.url})"

            if prefs.email_enabled:
                send_email_alert(user.email, subject, html)
            
            if prefs.telegram_enabled and prefs.telegram_chat_id:
                send_telegram_alert(prefs.telegram_chat_id, text)
                
            if prefs.whatsapp_enabled and prefs.whatsapp_number:
                send_whatsapp_alert(prefs.whatsapp_number, "instant_job_alert", [
                    {"type": "text", "text": job.title},
                    {"type": "text", "text": job.company}
                ])
                
            if prefs.push_enabled:
                for sub in user.push_subscriptions:
                    sub_info = {
                        "endpoint": sub.endpoint,
                        "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                    }
                    send_web_push(sub_info, {"title": "New Job Match!", "body": f"{job.title} at {job.company}"})

    except Exception as e:
        print(f"Error processing instant alerts: {e}")
    finally:
        db.close()


def send_daily_digest():
    """
    Cron job that runs daily. Gathers jobs from the last 24h and sends a digest.
    """
    db = SessionLocal()
    try:
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_jobs = db.query(models.Job).filter(models.Job.created_at >= yesterday).all()
        
        if not recent_jobs:
            print("No new jobs in the last 24 hours.")
            return

        users = db.query(models.User).join(models.NotificationPreference).filter(
            models.NotificationPreference.daily_digest_enabled == True
        ).all()

        for user in users:
            prefs = user.notification_prefs
            
            # Simple matching: top 3 jobs for this user based on match_score
            # In a robust system, match_score is per-user. We assume the DB has general match_score or we re-calculate.
            # Here we just take the top 3 scored jobs in the recent batch.
            top_jobs = sorted(recent_jobs, key=lambda x: x.match_score, reverse=True)[:3]
            
            if not top_jobs:
                continue
                
            subject = "Your Daily Job Digest"
            html = "<h2>Here are your top matches for today:</h2><ul>"
            for j in top_jobs:
                html += f"<li><a href='{j.url}'>{j.title}</a> at {j.company} ({j.match_score}% Match)</li>"
            html += "</ul>"
            
            text = "📅 *Daily Job Digest*\n\n"
            for j in top_jobs:
                text += f"• *{j.title}* at {j.company} ({j.match_score}% Match)\n"
            
            if prefs.email_enabled:
                send_email_alert(user.email, subject, html)
                
            if prefs.telegram_enabled and prefs.telegram_chat_id:
                send_telegram_alert(prefs.telegram_chat_id, text)
                
    except Exception as e:
        print(f"Error sending daily digest: {e}")
    finally:
        db.close()


def start_scheduler():
    if not scheduler.running:
        # Schedule the daily digest to run at 8:00 AM every day
        scheduler.add_job(send_daily_digest, CronTrigger(hour=8, minute=0))
        # Schedule the aggregation pipeline to run every 6 hours
        scheduler.add_job(run_aggregation_pipeline, CronTrigger(hour="*/6", minute=0))
        scheduler.start()
        print("APScheduler started with digest and aggregation jobs.")
