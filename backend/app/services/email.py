"""Transactional email. No SMTP configured → messages are logged, never lost."""

from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("email")


def _send_sync(message: EmailMessage) -> None:
    if settings.SMTP_TLS:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            server.send_message(message)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            server.send_message(message)


async def send_email(to: str, subject: str, body: str, html: str | None = None) -> bool:
    if not settings.SMTP_HOST:
        logger.warning("email.skipped", to=to, subject=subject, reason="smtp_not_configured")
        return False

    message = EmailMessage()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        await asyncio.to_thread(_send_sync, message)
    except Exception as exc:
        logger.error("email.failed", to=to, subject=subject, error=str(exc))
        return False
    logger.info("email.sent", to=to, subject=subject)
    return True


async def send_invitation_email(to: str, invite_url: str, inviter: str, role: str) -> bool:
    subject = "Invitation — Portfolio Abraham KOLOBOE"
    body = (
        f"Bonjour,\n\n{inviter} vous invite à rejoindre l'administration du portfolio "
        f"avec le rôle « {role} ».\n\nActivez votre compte ici :\n{invite_url}\n\n"
        f"Ce lien expire dans {settings.INVITATION_EXPIRE_DAYS} jours.\n"
    )
    html = f"""
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#0f172a">Invitation à l'administration</h2>
      <p>{inviter} vous invite à gérer le portfolio avec le rôle
         <strong>{role}</strong>.</p>
      <p><a href="{invite_url}"
            style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;
                   text-decoration:none;display:inline-block">Activer mon compte</a></p>
      <p style="color:#64748b;font-size:13px">
        Lien valable {settings.INVITATION_EXPIRE_DAYS} jours.</p>
    </div>
    """
    return await send_email(to, subject, body, html)


async def send_contact_notification(name: str, email: str, subject_line: str, message: str) -> bool:
    subject = f"[Portfolio] Nouveau message de {name}"
    body = f"De : {name} <{email}>\nSujet : {subject_line}\n\n{message}\n"
    return await send_email(settings.CONTACT_NOTIFY_EMAIL, subject, body)


async def send_password_reset_email(to: str, reset_url: str) -> bool:
    subject = "Réinitialisation de votre mot de passe"
    body = (
        f"Vous avez demandé la réinitialisation de votre mot de passe.\n\n{reset_url}\n\n"
        f"Ce lien expire dans {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes. "
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
    )
    return await send_email(to, subject, body)
