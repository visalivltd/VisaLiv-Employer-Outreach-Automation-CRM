from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.notification import Notification
from app.services.gmail_sync_service import sync_incoming_replies

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
):
    notifications = db.scalars(
        select(Notification)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    ).all()

    result = []
    for n in notifications:
        cand = db.get(Candidate, n.candidate_id) if n.candidate_id else None
        emp = db.get(Employer, n.employer_id) if n.employer_id else None

        # Extract subject line from notification message if available
        subject = None
        if n.message and "Subject: " in n.message:
            subject = n.message.split("Subject: ", 1)[1].strip()

        result.append({
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "candidate_id": n.candidate_id,
            "candidate_name": cand.full_name if cand else (f"Candidate #{n.candidate_id}" if n.candidate_id else None),
            "employer_id": n.employer_id,
            "employer_name": emp.service_name if emp else (f"Employer #{n.employer_id}" if n.employer_id else None),
            "employer_email": emp.email if emp else None,
            "email_log_id": n.email_log_id,
            "gmail_message_id": n.gmail_message_id,
            "is_read": n.is_read,
            "subject": subject,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    return result


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
):
    count = db.scalar(
        select(func.count(Notification.id)).where(Notification.is_read.is_(False))
    ) or 0

    return {"unread_count": count}


@router.post("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
):
    notif = db.get(Notification, notification_id)
    if notif is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notif.is_read = True
    db.commit()
    db.refresh(notif)

    return {
        "success": True,
        "notification_id": notif.id,
        "is_read": notif.is_read,
    }


@router.post("/mark-all-read")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
):
    unread_notifications = db.scalars(
        select(Notification).where(Notification.is_read.is_(False))
    ).all()

    marked_count = len(unread_notifications)
    for n in unread_notifications:
        n.is_read = True

    db.commit()

    return {
        "success": True,
        "marked_count": marked_count,
    }


@router.post("/sync")
def sync_notifications(
    db: Session = Depends(get_db),
):
    res = sync_incoming_replies(db)
    return res
