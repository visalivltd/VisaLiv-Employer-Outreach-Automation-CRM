from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.outreach import OutreachSendRequest
from app.services.gmail_account_service import (
    get_gmail_account_by_candidate,
)
from app.services.outreach_service import OutreachService


from app.schemas.outreach_settings import (
    OutreachSettingsResponse,
    OutreachSettingsUpdate,
)
from app.repositories.outreach_settings_repository import (
    get_outreach_settings,
    update_outreach_settings,
)

router = APIRouter(
    prefix="/outreach",
    tags=["Outreach"],
)


@router.get(
    "/settings",
    response_model=OutreachSettingsResponse,
)
def fetch_outreach_settings(
    db: Session = Depends(get_db),
):
    return get_outreach_settings(db)


@router.put(
    "/settings",
    response_model=OutreachSettingsResponse,
)
def modify_outreach_settings(
    payload: OutreachSettingsUpdate,
    db: Session = Depends(get_db),
):
    return update_outreach_settings(
        db=db,
        max_emails_per_candidate_per_day=payload.max_emails_per_candidate_per_day,
        min_gap_minutes=payload.min_gap_minutes,
        enabled=payload.enabled,
    )


@router.get(
    "/preview",
)
def get_outreach_preview(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    candidate_id: int | None = Query(None),
    only_eligible: bool = Query(False),
    db: Session = Depends(get_db),
):
    return OutreachService.get_outreach_preview(
        db=db,
        page=page,
        page_size=page_size,
        candidate_id=candidate_id,
        only_eligible=only_eligible,
    )


@router.post(
    "/batch-send",
)
def batch_send_outreach(
    pairings: list[dict],
    db: Session = Depends(get_db),
):
    return OutreachService.batch_outreach(db, pairings)


@router.post(
    "/start",
)
def start_outreach(
    candidate_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return OutreachService.start_outreach(
        db=db,
        candidate_id=candidate_id,
    )


@router.get(
    "/summary",
)
def get_outreach_summary(
    db: Session = Depends(get_db),
):
    return OutreachService.get_outreach_summary(db)


@router.post(
    "/process-jobs",
)
def process_due_outreach_jobs(
    max_jobs: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return OutreachService.process_due_outreach_jobs(
        db=db,
        max_jobs=max_jobs,
    )


@router.post(
    "/cancel-jobs",
)
def cancel_pending_outreach_jobs(
    candidate_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return OutreachService.cancel_pending_jobs(
        db=db,
        candidate_id=candidate_id,
    )


@router.post(
    "/send",
    status_code=status.HTTP_201_CREATED,
)
def send_outreach(
    data: OutreachSendRequest,
    db: Session = Depends(get_db),
):
    gmail_account = get_gmail_account_by_candidate(
        db,
        data.candidate_id,
    )

    if gmail_account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gmail account not connected for this candidate",
        )

    try:
        email_log = OutreachService.send_outreach(
            db=db,
            candidate_id=data.candidate_id,
            employer_id=data.employer_id,
            gmail_account=gmail_account,
            subject=data.subject,
            body=data.body,
            draft_id=data.draft_id,
        )

        return {
            "success": True,
            "message": "Outreach email sent successfully",
            "email_log_id": email_log.id,
            "status": email_log.status,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )