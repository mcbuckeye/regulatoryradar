import logging
from typing import Optional

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-20250514"


def _get_client() -> Optional[anthropic.AsyncAnthropic]:
    if not settings.ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set, AI analysis will be skipped")
        return None
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def summarize_update(title: str, content: str) -> str:
    client = _get_client()
    if client is None:
        return f"Summary not available (API key not configured). Title: {title}"

    try:
        message = await client.messages.create(
            model=MODEL,
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "You are a regulatory affairs analyst. Summarize the following FDA/regulatory "
                        "update in 2-3 concise sentences. Focus on what changed, who it affects, and "
                        "the potential impact on the pharmaceutical industry.\n\n"
                        f"Title: {title}\n\n"
                        f"Content: {content[:3000]}\n\n"
                        "Summary:"
                    ),
                }
            ],
        )
        return message.content[0].text.strip()
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error during summarization: {e}")
        return f"Summary generation failed. Title: {title}"
    except Exception as e:
        logger.error(f"Unexpected error during summarization: {e}")
        return f"Summary generation failed. Title: {title}"


async def score_relevance(
    title: str,
    summary: str,
    therapeutic_areas: list[str],
) -> dict:
    client = _get_client()
    if client is None:
        return {
            "score": 50,
            "reasoning": "Relevance scoring not available (API key not configured).",
        }

    areas_str = ", ".join(therapeutic_areas) if therapeutic_areas else "general pharmaceutical"

    try:
        message = await client.messages.create(
            model=MODEL,
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "You are a regulatory affairs analyst scoring the relevance of an update "
                        f"for someone interested in these therapeutic areas: {areas_str}.\n\n"
                        f"Title: {title}\n"
                        f"Summary: {summary}\n\n"
                        "Rate the relevance from 1-100 where:\n"
                        "- 1-20: Not relevant\n"
                        "- 21-40: Marginally relevant\n"
                        "- 41-60: Moderately relevant\n"
                        "- 61-80: Highly relevant\n"
                        "- 81-100: Critical/must-read\n\n"
                        "Respond in EXACTLY this format (two lines only):\n"
                        "SCORE: <number>\n"
                        "REASONING: <one sentence explanation>"
                    ),
                }
            ],
        )

        response_text = message.content[0].text.strip()
        lines = response_text.split("\n")

        score = 50
        reasoning = "Unable to parse relevance score."

        for line in lines:
            line = line.strip()
            if line.upper().startswith("SCORE:"):
                score_str = line.split(":", 1)[1].strip()
                try:
                    score = int(float(score_str))
                    score = max(1, min(100, score))
                except ValueError:
                    score = 50
            elif line.upper().startswith("REASONING:"):
                reasoning = line.split(":", 1)[1].strip()

        return {"score": score, "reasoning": reasoning}

    except anthropic.APIError as e:
        logger.error(f"Anthropic API error during relevance scoring: {e}")
        return {"score": 50, "reasoning": "Scoring failed due to API error."}
    except Exception as e:
        logger.error(f"Unexpected error during relevance scoring: {e}")
        return {"score": 50, "reasoning": "Scoring failed due to unexpected error."}


async def analyze_update(
    update: dict,
    therapeutic_areas: list[str],
) -> dict:
    title = update.get("title", "")
    content = update.get("content", "")

    summary = await summarize_update(title, content)

    relevance_result = await score_relevance(title, summary, therapeutic_areas)
    score = relevance_result["score"]

    if score >= 80:
        impact_level = "critical"
    elif score >= 60:
        impact_level = "high"
    elif score >= 40:
        impact_level = "medium"
    elif score >= 20:
        impact_level = "low"
    else:
        impact_level = "minimal"

    key_points = await _extract_key_points(title, content)

    return {
        "summary": summary,
        "relevance_score": score,
        "impact_level": impact_level,
        "key_points": key_points,
    }


async def _extract_key_points(title: str, content: str) -> list[str]:
    client = _get_client()
    if client is None:
        return [f"Key update: {title}"]

    try:
        message = await client.messages.create(
            model=MODEL,
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Extract 3-5 key points from this regulatory update. "
                        "Each point should be one concise sentence.\n\n"
                        f"Title: {title}\n"
                        f"Content: {content[:3000]}\n\n"
                        "Return ONLY the bullet points, one per line, starting with a dash (-):"
                    ),
                }
            ],
        )

        response_text = message.content[0].text.strip()
        points = []
        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("-"):
                line = line[1:].strip()
            if line.startswith("*"):
                line = line[1:].strip()
            if line and len(line) > 5:
                points.append(line)

        return points[:5] if points else [f"Key update: {title}"]

    except Exception as e:
        logger.error(f"Error extracting key points: {e}")
        return [f"Key update: {title}"]
