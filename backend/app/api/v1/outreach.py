from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.outreach import OutreachSendRequest
from app.services.gmail_account_service import (
    get_gmail_account_by_candidate,
)
from app.services.outreach_service import OutreachService


router = APIRouter(
    prefix="/outreach",
    tags=["Outreach"],
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