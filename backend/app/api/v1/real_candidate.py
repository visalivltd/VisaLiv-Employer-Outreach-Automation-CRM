from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.real_candidate import (
    DailySummaryPreviewRequest,
    DailySummaryPreviewResponse,
    RealCandidateCreate,
    RealCandidateResponse,
    RealCandidateUpdate,
)
from app.services import daily_summary_service, real_candidate_service


router = APIRouter(
    prefix="/real-candidates",
    tags=["Real Candidates"],
)


@router.get(
    "",
    response_model=list[RealCandidateResponse],
)
def get_real_candidates(
    db: Session = Depends(get_db),
):
    real_cands = real_candidate_service.get_real_candidates(db)
    result = []
    for rc in real_cands:
        linked_cands = [
            {
                "id": c.id,
                "full_name": c.full_name,
                "email": c.email,
                "gmail_email": c.gmail_email,
            }
            for c in (rc.candidates or [])
        ]
        result.append(
            RealCandidateResponse(
                id=rc.id,
                real_candidate_id=rc.real_candidate_id,
                name=rc.name,
                email=rc.email,
                summary_sender_gmail_account_id=rc.summary_sender_gmail_account_id,
                summary_sender_gmail_email=rc.summary_sender_gmail_account.gmail_email if rc.summary_sender_gmail_account else None,
                summary_template_subject=rc.summary_template_subject,
                summary_template_body=rc.summary_template_body,
                linked_candidate_ids=[c.id for c in (rc.candidates or [])],
                linked_candidates=linked_cands,
                created_at=rc.created_at,
                updated_at=rc.updated_at,
            )
        )
    return result


@router.post(
    "/send-daily-summaries",
)
def trigger_daily_summaries(
    db: Session = Depends(get_db),
):
    try:
        result = daily_summary_service.send_all_daily_summaries(db)
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.get(
    "/{real_candidate_pk}",
    response_model=RealCandidateResponse,
)
def get_real_candidate(
    real_candidate_pk: int,
    db: Session = Depends(get_db),
):
    rc = real_candidate_service.get_real_candidate(db, real_candidate_pk)
    if rc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Real Candidate not found",
        )

    linked_cands = [
        {
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "gmail_email": c.gmail_email,
        }
        for c in (rc.candidates or [])
    ]
    return RealCandidateResponse(
        id=rc.id,
        real_candidate_id=rc.real_candidate_id,
        name=rc.name,
        email=rc.email,
        summary_sender_gmail_account_id=rc.summary_sender_gmail_account_id,
        summary_sender_gmail_email=rc.summary_sender_gmail_account.gmail_email if rc.summary_sender_gmail_account else None,
        summary_template_subject=rc.summary_template_subject,
        summary_template_body=rc.summary_template_body,
        linked_candidate_ids=[c.id for c in (rc.candidates or [])],
        linked_candidates=linked_cands,
        created_at=rc.created_at,
        updated_at=rc.updated_at,
    )


@router.post(
    "",
    response_model=RealCandidateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_real_candidate(
    data: RealCandidateCreate,
    db: Session = Depends(get_db),
):
    try:
        rc = real_candidate_service.create_real_candidate(db, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    linked_cands = [
        {
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "gmail_email": c.gmail_email,
        }
        for c in (rc.candidates or [])
    ]
    return RealCandidateResponse(
        id=rc.id,
        real_candidate_id=rc.real_candidate_id,
        name=rc.name,
        email=rc.email,
        summary_sender_gmail_account_id=rc.summary_sender_gmail_account_id,
        summary_sender_gmail_email=rc.summary_sender_gmail_account.gmail_email if rc.summary_sender_gmail_account else None,
        summary_template_subject=rc.summary_template_subject,
        summary_template_body=rc.summary_template_body,
        linked_candidate_ids=[c.id for c in (rc.candidates or [])],
        linked_candidates=linked_cands,
        created_at=rc.created_at,
        updated_at=rc.updated_at,
    )


@router.put(
    "/{real_candidate_pk}",
    response_model=RealCandidateResponse,
)
def update_real_candidate(
    real_candidate_pk: int,
    data: RealCandidateUpdate,
    db: Session = Depends(get_db),
):
    try:
        rc = real_candidate_service.update_real_candidate(db, real_candidate_pk, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if rc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Real Candidate not found",
        )

    linked_cands = [
        {
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "gmail_email": c.gmail_email,
        }
        for c in (rc.candidates or [])
    ]
    return RealCandidateResponse(
        id=rc.id,
        real_candidate_id=rc.real_candidate_id,
        name=rc.name,
        email=rc.email,
        summary_sender_gmail_account_id=rc.summary_sender_gmail_account_id,
        summary_sender_gmail_email=rc.summary_sender_gmail_account.gmail_email if rc.summary_sender_gmail_account else None,
        summary_template_subject=rc.summary_template_subject,
        summary_template_body=rc.summary_template_body,
        linked_candidate_ids=[c.id for c in (rc.candidates or [])],
        linked_candidates=linked_cands,
        created_at=rc.created_at,
        updated_at=rc.updated_at,
    )


@router.delete(
    "/{real_candidate_pk}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_real_candidate(
    real_candidate_pk: int,
    db: Session = Depends(get_db),
):
    deleted = real_candidate_service.delete_real_candidate(db, real_candidate_pk)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Real Candidate not found",
        )


@router.post(
    "/{real_candidate_pk}/preview-summary",
    response_model=DailySummaryPreviewResponse,
)
def preview_daily_summary(
    real_candidate_pk: int,
    req: DailySummaryPreviewRequest | None = None,
    db: Session = Depends(get_db),
):
    rc = real_candidate_service.get_real_candidate(db, real_candidate_pk)
    if rc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Real Candidate not found",
        )

    applications = daily_summary_service.get_todays_applications_for_real_candidate(db, rc)
    custom_subj = req.subject_template if req else None
    custom_body = req.body_template if req else None

    subj, body, employer_names = daily_summary_service.generate_summary_content(
        real_candidate=rc,
        applications=applications,
        custom_subject=custom_subj,
        custom_body=custom_body,
    )

    # Sample preview fallback if no real applications today
    if not employer_names:
        employer_names = ["Phoenix Healthcare", "Stanhope Lodge", "The Whitebeach"]
        subj, body, _ = daily_summary_service.generate_summary_content(
            real_candidate=rc,
            applications=None,
            custom_subject=custom_subj,
            custom_body=custom_body,
        )
        # Manually substitute sample employer list in preview if empty
        sample_bullets = "• Phoenix Healthcare\n• Stanhope Lodge\n• The Whitebeach"
        body = body.replace("• None", sample_bullets)

    return DailySummaryPreviewResponse(
        subject=subj,
        body=body,
        recipient_email=rc.email,
        applications_count=len(employer_names),
        employers_list=employer_names,
    )
