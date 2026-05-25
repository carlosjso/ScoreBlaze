from __future__ import annotations

import config

from .senders import EmailSender, MailtrapEmailSender, NullEmailSender


def create_email_sender() -> EmailSender:
    provider = config.MAIL_PROVIDER

    if provider == "mailtrap":
        return MailtrapEmailSender(
            host=config.MAILTRAP_HOST,
            port=config.MAILTRAP_PORT,
            username=config.MAILTRAP_USER,
            password=config.MAILTRAP_PASSWORD,
            from_email=config.MAIL_FROM_EMAIL,
            from_name=config.MAIL_FROM_NAME,
        )

    if provider in {"none", "null", "disabled"}:
        return NullEmailSender()

    raise ValueError(f"Unsupported mail provider: {provider}")
