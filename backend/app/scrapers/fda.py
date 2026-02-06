import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

FDA_BASE_URL = "https://www.fda.gov"
GUIDANCES_URL = f"{FDA_BASE_URL}/drugs/guidance-compliance-regulatory-information/guidances-drugs"
APPROVALS_URL = f"{FDA_BASE_URL}/drugs/development-approval-process-drugs/novel-drug-approvals-fda"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

RATE_LIMIT_SECONDS = 1.0


async def _fetch_page(client: httpx.AsyncClient, url: str) -> Optional[str]:
    try:
        response = await client.get(url, headers=HEADERS, follow_redirects=True, timeout=30.0)
        response.raise_for_status()
        return response.text
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching {url}: {e.response.status_code}")
        return None
    except httpx.RequestError as e:
        logger.error(f"Request error fetching {url}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching {url}: {e}")
        return None


def _parse_date(date_str: str) -> Optional[datetime]:
    date_formats = [
        "%m/%d/%Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%Y-%m-%d",
        "%m/%d/%y",
    ]
    date_str = date_str.strip()
    for fmt in date_formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


async def scrape_fda_guidances() -> list[dict]:
    results = []
    async with httpx.AsyncClient() as client:
        html = await _fetch_page(client, GUIDANCES_URL)
        if html is None:
            logger.warning("Failed to fetch FDA guidances page")
            return results

        soup = BeautifulSoup(html, "html.parser")

        content_area = soup.find("div", {"class": "view-content"})
        if content_area is None:
            content_area = soup.find("main") or soup.find("div", {"id": "main-content"}) or soup

        rows = content_area.find_all("tr") if content_area else []

        if rows:
            for row in rows[1:]:
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue

                link = cells[0].find("a")
                if link is None:
                    continue

                title = link.get_text(strip=True)
                href = link.get("href", "")
                if href and not href.startswith("http"):
                    href = f"{FDA_BASE_URL}{href}"

                date_text = cells[-1].get_text(strip=True) if len(cells) >= 3 else ""
                published_date = _parse_date(date_text) if date_text else None

                source_id = href.split("/")[-1] if href else title[:100].replace(" ", "-").lower()

                content = ""
                for cell in cells:
                    cell_text = cell.get_text(strip=True)
                    if cell_text and cell_text != title:
                        content += cell_text + " "
                content = content.strip()

                results.append({
                    "source_id": f"fda-guidance-{source_id}",
                    "title": title,
                    "content": content or f"FDA Guidance: {title}",
                    "source_url": href,
                    "update_type": "guidance",
                    "published_date": published_date,
                })

                await asyncio.sleep(RATE_LIMIT_SECONDS)

        if not rows or len(rows) <= 1:
            links = content_area.find_all("a") if content_area else []
            seen_titles = set()

            for link in links:
                title = link.get_text(strip=True)
                if not title or len(title) < 10 or title in seen_titles:
                    continue

                href = link.get("href", "")
                if not href or not any(kw in href.lower() for kw in ["guidance", "drug", "fda"]):
                    continue

                if not href.startswith("http"):
                    href = f"{FDA_BASE_URL}{href}"

                seen_titles.add(title)
                source_id = href.split("/")[-1] if href else title[:100].replace(" ", "-").lower()

                parent = link.find_parent()
                context = parent.get_text(strip=True) if parent else ""
                content = context if context != title else f"FDA Guidance: {title}"

                results.append({
                    "source_id": f"fda-guidance-{source_id}",
                    "title": title,
                    "content": content,
                    "source_url": href,
                    "update_type": "guidance",
                    "published_date": None,
                })

                if len(results) >= 30:
                    break

    logger.info(f"Scraped {len(results)} FDA guidances")
    return results


async def scrape_fda_approvals() -> list[dict]:
    results = []
    async with httpx.AsyncClient() as client:
        html = await _fetch_page(client, APPROVALS_URL)
        if html is None:
            logger.warning("Failed to fetch FDA approvals page")
            return results

        soup = BeautifulSoup(html, "html.parser")

        content_area = soup.find("div", {"class": "view-content"})
        if content_area is None:
            content_area = soup.find("main") or soup.find("div", {"id": "main-content"}) or soup

        tables = content_area.find_all("table") if content_area else []

        for table in tables:
            header_row = table.find("tr")
            if header_row is None:
                continue

            headers = [th.get_text(strip=True).lower() for th in header_row.find_all(["th", "td"])]

            rows = table.find_all("tr")[1:]
            for row in rows:
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue

                cell_data = {}
                for i, cell in enumerate(cells):
                    key = headers[i] if i < len(headers) else f"col_{i}"
                    cell_data[key] = cell

                drug_name = ""
                link_href = ""

                first_link = cells[0].find("a")
                if first_link:
                    drug_name = first_link.get_text(strip=True)
                    link_href = first_link.get("href", "")
                else:
                    drug_name = cells[0].get_text(strip=True)

                if not drug_name:
                    continue

                if link_href and not link_href.startswith("http"):
                    link_href = f"{FDA_BASE_URL}{link_href}"

                active_ingredient = cells[1].get_text(strip=True) if len(cells) > 1 else ""

                content_parts = []
                for i, cell in enumerate(cells):
                    header_name = headers[i] if i < len(headers) else f"Column {i+1}"
                    cell_text = cell.get_text(strip=True)
                    if cell_text:
                        content_parts.append(f"{header_name}: {cell_text}")

                content = "; ".join(content_parts)

                date_text = ""
                for i, h in enumerate(headers):
                    if "date" in h and i < len(cells):
                        date_text = cells[i].get_text(strip=True)
                        break
                if not date_text and len(cells) > 2:
                    date_text = cells[-1].get_text(strip=True)

                published_date = _parse_date(date_text) if date_text else None

                source_id = drug_name.lower().replace(" ", "-").replace("/", "-")

                title = f"FDA Approval: {drug_name}"
                if active_ingredient:
                    title = f"FDA Approval: {drug_name} ({active_ingredient})"

                results.append({
                    "source_id": f"fda-approval-{source_id}",
                    "title": title,
                    "content": content or f"Novel drug approval: {drug_name}",
                    "source_url": link_href or APPROVALS_URL,
                    "update_type": "approval",
                    "published_date": published_date,
                })

                await asyncio.sleep(RATE_LIMIT_SECONDS)

        if not tables:
            items = content_area.find_all(["li", "div", "article"]) if content_area else []
            seen_titles = set()

            for item in items:
                link = item.find("a")
                if link is None:
                    continue

                title = link.get_text(strip=True)
                if not title or len(title) < 5 or title in seen_titles:
                    continue

                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"{FDA_BASE_URL}{href}"

                seen_titles.add(title)
                source_id = title.lower().replace(" ", "-").replace("/", "-")[:100]

                content = item.get_text(strip=True)

                results.append({
                    "source_id": f"fda-approval-{source_id}",
                    "title": f"FDA Approval: {title}",
                    "content": content or f"Novel drug approval: {title}",
                    "source_url": href,
                    "update_type": "approval",
                    "published_date": None,
                })

                if len(results) >= 30:
                    break

    logger.info(f"Scraped {len(results)} FDA approvals")
    return results
