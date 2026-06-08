"""
Pluggable transactional email. Uses Resend if RESEND_API_KEY is set, else SMTP if
SMTP_HOST/SMTP_USER/SMTP_PASSWORD are set. Degrades gracefully (enabled=False)
so reminders/reports can be generated even when sending isn't configured.
"""
import os
import smtplib
from email.mime.text import MIMEText
import httpx

RESEND_URL = "https://api.resend.com/emails"


class EmailService:
    def __init__(self):
        self.resend_key = os.environ.get("RESEND_API_KEY")
        self.from_addr = os.environ.get("EMAIL_FROM", "Dabby <noreply@datalis.in>")
        self.smtp_host = os.environ.get("SMTP_HOST")
        self.smtp_user = os.environ.get("SMTP_USER")
        self.smtp_pass = os.environ.get("SMTP_PASSWORD")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.provider = "resend" if self.resend_key else ("smtp" if self.smtp_host else None)
        self.enabled = self.provider is not None

    async def send(self, to: str, subject: str, html: str) -> dict:
        if not to:
            return {"sent": False, "reason": "no recipient"}
        if not self.enabled:
            return {"sent": False, "reason": "email not configured", "preview": {"to": to, "subject": subject}}
        try:
            if self.provider == "resend":
                async with httpx.AsyncClient(timeout=20) as client:
                    r = await client.post(RESEND_URL,
                        headers={"Authorization": f"Bearer {self.resend_key}", "Content-Type": "application/json"},
                        json={"from": self.from_addr, "to": [to], "subject": subject, "html": html})
                    r.raise_for_status()
                    return {"sent": True, "provider": "resend"}
            else:
                msg = MIMEText(html, "html")
                msg["Subject"] = subject
                msg["From"] = self.from_addr
                msg["To"] = to
                with smtplib.SMTP(self.smtp_host, self.smtp_port) as s:
                    s.starttls()
                    s.login(self.smtp_user, self.smtp_pass)
                    s.sendmail(self.from_addr, [to], msg.as_string())
                return {"sent": True, "provider": "smtp"}
        except Exception as e:
            print(f"[email] send failed: {e}")
            return {"sent": False, "reason": str(e)}


email_service = EmailService()
