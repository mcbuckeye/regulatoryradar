import logging
from datetime import datetime, timezone
from typing import Optional

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template

from app.config import settings
from app.models import User

logger = logging.getLogger(__name__)

DIGEST_TEMPLATE = Template("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RegulatoryRadar Daily Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; width: 100%;">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0a1628 0%, #1a3a5c 100%); padding: 30px 40px; border-radius: 12px 12px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                RegulatoryRadar
                            </h1>
                            <p style="color: #8ab4f8; margin: 8px 0 0; font-size: 14px;">
                                Your Daily FDA & Regulatory Intelligence Digest
                            </p>
                            <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">
                                {{ digest_date }}
                            </p>
                        </td>
                    </tr>

                    <!-- Summary Banner -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 20px 40px; border-bottom: 1px solid #e2e8f0;">
                            <p style="color: #475569; margin: 0; font-size: 14px;">
                                Hello {{ user_email }}, here are your <strong>{{ total_updates }}</strong> regulatory updates.
                            </p>
                        </td>
                    </tr>

                    {% if top_stories %}
                    <!-- Top Stories Section -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 30px 40px 10px;">
                            <h2 style="color: #0a1628; margin: 0 0 5px; font-size: 20px; font-weight: 600;">
                                Top Stories
                            </h2>
                            <div style="width: 40px; height: 3px; background-color: #dc2626; margin-bottom: 20px;"></div>
                        </td>
                    </tr>
                    {% for item in top_stories %}
                    <tr>
                        <td style="background-color: #ffffff; padding: 0 40px 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="background-color: #fef2f2; padding: 4px 12px;">
                                        <span style="color: #dc2626; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                                            {{ item.impact_level | default('HIGH', true) }} IMPACT
                                        </span>
                                        {% if item.relevance_score %}
                                        <span style="color: #64748b; font-size: 11px; margin-left: 10px;">
                                            Score: {{ item.relevance_score | int }}/100
                                        </span>
                                        {% endif %}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px;">
                                        <h3 style="color: #0a1628; margin: 0 0 8px; font-size: 16px; font-weight: 600;">
                                            {% if item.source_url %}
                                            <a href="{{ item.source_url }}" style="color: #1a3a5c; text-decoration: none;">
                                                {{ item.title }}
                                            </a>
                                            {% else %}
                                            {{ item.title }}
                                            {% endif %}
                                        </h3>
                                        <p style="color: #475569; margin: 0 0 8px; font-size: 13px; line-height: 1.5;">
                                            {{ item.summary | default('No summary available.', true) }}
                                        </p>
                                        <span style="color: #94a3b8; font-size: 11px;">
                                            {{ item.source | upper }} &bull;
                                            {% if item.published_date %}{{ item.published_date }}{% else %}Recent{% endif %}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    {% endfor %}
                    {% endif %}

                    {% if fda_updates %}
                    <!-- FDA Updates Section -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 30px 40px 10px;">
                            <h2 style="color: #0a1628; margin: 0 0 5px; font-size: 20px; font-weight: 600;">
                                FDA Updates
                            </h2>
                            <div style="width: 40px; height: 3px; background-color: #1a3a5c; margin-bottom: 20px;"></div>
                        </td>
                    </tr>
                    {% for item in fda_updates %}
                    <tr>
                        <td style="background-color: #ffffff; padding: 0 40px 15px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-left: 3px solid #1a3a5c; padding-left: 16px;">
                                <tr>
                                    <td style="padding-left: 16px;">
                                        <span style="color: #1a3a5c; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                                            {{ item.update_type | default('UPDATE', true) }}
                                        </span>
                                        <h3 style="color: #0a1628; margin: 4px 0 6px; font-size: 15px; font-weight: 600;">
                                            {% if item.source_url %}
                                            <a href="{{ item.source_url }}" style="color: #1a3a5c; text-decoration: none;">
                                                {{ item.title }}
                                            </a>
                                            {% else %}
                                            {{ item.title }}
                                            {% endif %}
                                        </h3>
                                        <p style="color: #475569; margin: 0; font-size: 13px; line-height: 1.5;">
                                            {{ item.summary | default('', true) }}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    {% endfor %}
                    {% endif %}

                    {% if clinical_trials %}
                    <!-- Clinical Trials Section -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 30px 40px 10px;">
                            <h2 style="color: #0a1628; margin: 0 0 5px; font-size: 20px; font-weight: 600;">
                                Clinical Trials
                            </h2>
                            <div style="width: 40px; height: 3px; background-color: #059669; margin-bottom: 20px;"></div>
                        </td>
                    </tr>
                    {% for item in clinical_trials %}
                    <tr>
                        <td style="background-color: #ffffff; padding: 0 40px 15px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-left: 3px solid #059669; padding-left: 16px;">
                                <tr>
                                    <td style="padding-left: 16px;">
                                        <span style="color: #059669; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                                            CLINICAL TRIAL
                                        </span>
                                        <h3 style="color: #0a1628; margin: 4px 0 6px; font-size: 15px; font-weight: 600;">
                                            {% if item.source_url %}
                                            <a href="{{ item.source_url }}" style="color: #1a3a5c; text-decoration: none;">
                                                {{ item.title }}
                                            </a>
                                            {% else %}
                                            {{ item.title }}
                                            {% endif %}
                                        </h3>
                                        <p style="color: #475569; margin: 0; font-size: 13px; line-height: 1.5;">
                                            {{ item.summary | default('', true) }}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    {% endfor %}
                    {% endif %}

                    {% if not top_stories and not fda_updates and not clinical_trials %}
                    <tr>
                        <td style="background-color: #ffffff; padding: 40px; text-align: center;">
                            <p style="color: #94a3b8; font-size: 14px;">
                                No new regulatory updates found for this period.
                            </p>
                        </td>
                    </tr>
                    {% endif %}

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0a1628; padding: 24px 40px; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: #8ab4f8; margin: 0 0 8px; font-size: 13px; font-weight: 600;">
                                RegulatoryRadar
                            </p>
                            <p style="color: #64748b; margin: 0; font-size: 11px;">
                                AI-curated FDA regulatory intelligence for pharmaceutical professionals.
                            </p>
                            <p style="color: #475569; margin: 8px 0 0; font-size: 11px;">
                                You are receiving this because digest emails are enabled in your settings.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>""")


def generate_digest(user: User, updates_with_analysis: list[dict]) -> str:
    top_stories = []
    fda_updates = []
    clinical_trials = []

    for item in updates_with_analysis:
        score = item.get("relevance_score") or 0
        source = item.get("source", "")

        if item.get("published_date"):
            if isinstance(item["published_date"], datetime):
                item["published_date"] = item["published_date"].strftime("%B %d, %Y")

        if score > 80:
            top_stories.append(item)
        elif source == "fda":
            fda_updates.append(item)
        elif source == "clinicaltrials":
            clinical_trials.append(item)
        elif source == "fda" or item.get("update_type") in ("guidance", "approval"):
            fda_updates.append(item)
        else:
            clinical_trials.append(item)

    now = datetime.now(timezone.utc)
    digest_date = now.strftime("%A, %B %d, %Y")

    html = DIGEST_TEMPLATE.render(
        user_email=user.email,
        digest_date=digest_date,
        total_updates=len(updates_with_analysis),
        top_stories=top_stories[:5],
        fda_updates=fda_updates[:10],
        clinical_trials=clinical_trials[:10],
    )

    return html


async def send_digest(user_email: str, html_content: str) -> bool:
    if not settings.SMTP_PASS:
        logger.warning("SMTP_PASS not set, skipping email send")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"RegulatoryRadar Daily Digest - {datetime.now(timezone.utc).strftime('%B %d, %Y')}"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = user_email

    text_part = MIMEText(
        "Your RegulatoryRadar daily digest is ready. "
        "Please view this email in an HTML-compatible client.",
        "plain",
    )
    html_part = MIMEText(html_content, "html")

    msg.attach(text_part)
    msg.attach(html_part)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            start_tls=True,
        )
        logger.info(f"Digest email sent to {user_email}")
        return True
    except aiosmtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {e}")
        return False
    except aiosmtplib.SMTPException as e:
        logger.error(f"SMTP error sending digest to {user_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending digest to {user_email}: {e}")
        return False
