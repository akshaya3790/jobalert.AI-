import os
import json
import requests
from dotenv import load_dotenv

# Try to import these, but don't fail if they are still installing
try:
    import pywebpush
except ImportError:
    pywebpush = None

try:
    import resend
except ImportError:
    resend = None

load_dotenv()

# Configure Resend
if resend:
    resend.api_key = os.getenv("RESEND_API_KEY", "")

# VAPID info for Web Push
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:admin@jobalert.ai"}

# Messaging Apps
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID", "")


def send_email_alert(to_email: str, subject: str, html_content: str):
    if not resend or not getattr(resend, 'api_key', None):
        print("Resend API key not configured")
        return
    try:
        # Note: resend.dev allows sending only to verified domains or the registered email on the free tier.
        r = resend.Emails.send({
            "from": "JobAlert <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": html_content
        })
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")


def send_telegram_alert(chat_id: str, text: str, inline_keyboard=None):
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        print("Telegram bot token or chat ID missing")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if inline_keyboard:
        payload["reply_markup"] = {"inline_keyboard": inline_keyboard}
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        print(f"Telegram sent to {chat_id}")
    except Exception as e:
        print(f"Telegram error: {e}")


def send_whatsapp_alert(phone_number: str, template_name: str, components: list):
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID or not phone_number:
        print("WhatsApp credentials missing")
        return
    url = f"https://graph.facebook.com/v17.0/{WHATSAPP_PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": "en_US"},
            "components": components
        }
    }
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        print(f"WhatsApp sent to {phone_number}")
    except Exception as e:
        print(f"WhatsApp error: {e}")


def send_web_push(subscription_info: dict, payload_data: dict):
    if not pywebpush:
        print("pywebpush module not available")
        return
    if not VAPID_PRIVATE_KEY:
        print("VAPID_PRIVATE_KEY not configured")
        return
    try:
        pywebpush.webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload_data),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        print("Web push sent")
    except pywebpush.WebPushException as e:
        print(f"Web push error: {e}")
    except Exception as e:
        print(f"Unexpected Web push error: {e}")
