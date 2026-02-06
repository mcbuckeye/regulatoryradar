import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

CTGOV_API_BASE = "https://clinicaltrials.gov/api/v2/studies"

DEFAULT_KEYWORDS = [
    "oncology",
    "cancer",
    "tumor",
    "immunotherapy",
]


def _parse_ct_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    formats = ["%Y-%m-%d", "%Y-%m", "%B %d, %Y", "%B %Y"]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


async def search_trials(keywords: Optional[list[str]] = None) -> list[dict]:
    if keywords is None or len(keywords) == 0:
        keywords = DEFAULT_KEYWORDS

    results = []
    query_string = " OR ".join(keywords)

    params = {
        "query.term": query_string,
        "filter.overallStatus": "RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING",
        "sort": "LastUpdatePostDate:desc",
        "pageSize": 20,
        "format": "json",
        "fields": (
            "NCTId,BriefTitle,OverallStatus,Condition,LeadSponsorName,"
            "StartDate,LastUpdatePostDate,Phase,EnrollmentCount,BriefSummary,"
            "InterventionName"
        ),
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                CTGOV_API_BASE,
                params=params,
                timeout=30.0,
                headers={
                    "User-Agent": "RegulatoryRadar/1.0 (steve@ipwatcher.com)",
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"ClinicalTrials.gov API HTTP error: {e.response.status_code}")
        return results
    except httpx.RequestError as e:
        logger.error(f"ClinicalTrials.gov API request error: {e}")
        return results
    except Exception as e:
        logger.error(f"ClinicalTrials.gov API unexpected error: {e}")
        return results

    studies = data.get("studies", [])

    for study in studies:
        try:
            protocol = study.get("protocolSection", {})
            id_module = protocol.get("identificationModule", {})
            status_module = protocol.get("statusModule", {})
            conditions_module = protocol.get("conditionsModule", {})
            sponsor_module = protocol.get("sponsorCollaboratorsModule", {})
            design_module = protocol.get("designModule", {})
            desc_module = protocol.get("descriptionModule", {})
            arms_module = protocol.get("armsInterventionsModule", {})

            nct_id = id_module.get("nctId", "")
            if not nct_id:
                continue

            brief_title = id_module.get("briefTitle", "Unknown Trial")
            overall_status = status_module.get("overallStatus", "Unknown")

            conditions = conditions_module.get("conditions", [])
            conditions_str = ", ".join(conditions) if conditions else "Not specified"

            lead_sponsor = ""
            if sponsor_module.get("leadSponsor"):
                lead_sponsor = sponsor_module["leadSponsor"].get("name", "")

            start_date_struct = status_module.get("startDateStruct", {})
            start_date_str = start_date_struct.get("date", "")
            start_date = _parse_ct_date(start_date_str)

            last_update_struct = status_module.get("lastUpdatePostDateStruct", {})
            last_update_str = last_update_struct.get("date", "")
            last_update_date = _parse_ct_date(last_update_str)

            phases = design_module.get("phases", [])
            phase_str = ", ".join(phases) if phases else "Not specified"

            enrollment_info = design_module.get("enrollmentInfo", {})
            enrollment = enrollment_info.get("count", 0)

            brief_summary = desc_module.get("briefSummary", "")

            interventions = arms_module.get("interventions", [])
            intervention_names = [
                iv.get("name", "") for iv in interventions if iv.get("name")
            ]
            interventions_str = ", ".join(intervention_names) if intervention_names else "Not specified"

            content_parts = [
                f"Status: {overall_status}",
                f"Phase: {phase_str}",
                f"Conditions: {conditions_str}",
                f"Sponsor: {lead_sponsor}" if lead_sponsor else "",
                f"Enrollment: {enrollment}" if enrollment else "",
                f"Interventions: {interventions_str}",
                f"Start Date: {start_date_str}" if start_date_str else "",
            ]
            if brief_summary:
                content_parts.append(f"Summary: {brief_summary}")

            content = "; ".join(part for part in content_parts if part)

            companies_mentioned = []
            if lead_sponsor:
                companies_mentioned.append(lead_sponsor)

            therapeutic_areas = conditions[:5] if conditions else []

            results.append({
                "source_id": nct_id,
                "title": f"Clinical Trial: {brief_title}",
                "content": content,
                "source_url": f"https://clinicaltrials.gov/study/{nct_id}",
                "update_type": "clinical_trial",
                "published_date": last_update_date or start_date,
                "therapeutic_areas": therapeutic_areas,
                "companies_mentioned": companies_mentioned,
                "raw_data": {
                    "nct_id": nct_id,
                    "overall_status": overall_status,
                    "phase": phase_str,
                    "conditions": conditions,
                    "lead_sponsor": lead_sponsor,
                    "enrollment": enrollment,
                    "interventions": intervention_names,
                },
            })

        except Exception as e:
            logger.error(f"Error parsing study: {e}")
            continue

    logger.info(f"Fetched {len(results)} clinical trials from ClinicalTrials.gov")
    return results
