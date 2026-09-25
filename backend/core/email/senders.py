from __future__ import annotations

import smtplib
from dataclasses import dataclass
from email.message import EmailMessage as SmtpEmailMessage
from email.utils import formataddr
from typing import Protocol


@dataclass(frozen=True)
class EmailMessage:
    to_email: str
    subject: str
    text_body: str
    html_body: str | None = None


class EmailSender(Protocol):
    def send(self, message: EmailMessage) -> None:
        pass


class NullEmailSender:
    def send(self, message: EmailMessage) -> None:
        return None


class MailtrapEmailSender:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str,
        password: str,
        from_email: str,
        from_name: str,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_email = from_email
        self.from_name = from_name

    def send(self, message: EmailMessage) -> None:
        if not self.username or not self.password:
            raise ValueError("Mailtrap credentials are required.")

        smtp_message = SmtpEmailMessage()
        smtp_message["Subject"] = message.subject
        smtp_message["From"] = formataddr((self.from_name, self.from_email))
        smtp_message["To"] = message.to_email
        smtp_message.set_content(message.text_body)

        if message.html_body:
            smtp_message.add_alternative(message.html_body, subtype="html")

        with smtplib.SMTP(self.host, self.port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(self.username, self.password)
            smtp.send_message(smtp_message)
