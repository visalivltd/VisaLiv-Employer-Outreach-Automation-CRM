from pathlib import Path
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session, selectinload

from app.models.candidate import Candidate
from app.models.email_draft import EmailDraft
from app.models.email_log import EmailLog
from app.models.notification import Notification
from app.models.scheduler_job import SchedulerJob

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _delete_file_if_exists(relative_path: str | None) -> None:
    if not relative_path or not relative_path.strip():
        return
    try:
        clean_rel = relative_path.strip().lstrip("/\\")
        fp1 = PROJECT_ROOT / clean_rel
        fp2 = PROJECT_ROOT.parent / clean_rel
        target_path = fp1 if fp1.exists() else (fp2 if fp2.exists() else None)
        if target_path and target_path.is_file():
            target_path.unlink()
            print(f"[FILE CLEANUP] Deleted file: {target_path}", flush=True)
    except Exception as exc:
        print(f"[FILE CLEANUP WARNING] Failed to delete file {relative_path}: {exc}", flush=True)


def create_candidate(
    db: Session,
    candidate: Candidate,
) -> Candidate:
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return candidate


def get_candidate_by_id(
    db: Session,
    candidate_id: int,
) -> Candidate | None:
    statement = (
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .options(
            selectinload(Candidate.gmail_account),
            selectinload(Candidate.email_draft),
        )
    )
    return db.scalar(statement)


def get_candidate_by_email(
    db: Session,
    email: str,
) -> Candidate | None:
    statement = select(Candidate).where(Candidate.email == email)

    return db.scalar(statement)


def get_candidates(
    db: Session,
    active_only: bool = False,
) -> list[Candidate]:
    statement = select(Candidate).options(
        selectinload(Candidate.gmail_account),
        selectinload(Candidate.email_draft),
    )
    if active_only:
        statement = statement.where(Candidate.is_active.is_(True))
    statement = statement.order_by(Candidate.id)

    return list(db.scalars(statement).all())


def update_candidate(
    db: Session,
    candidate: Candidate,
) -> Candidate:
    db.commit()
    db.refresh(candidate)

    return candidate


def delete_candidate(
    db: Session,
    candidate: Candidate,
) -> None:
    try:
        # 1. Delete notifications referencing candidate or candidate's email logs
        cand_log_ids = [log.id for log in candidate.email_logs] if candidate.email_logs else []
        notif_conditions = [Notification.candidate_id == candidate.id]
        if cand_log_ids:
            notif_conditions.append(Notification.email_log_id.in_(cand_log_ids))

        notifs = list(db.scalars(select(Notification).where(or_(*notif_conditions))).all())
        for notif in notifs:
            db.delete(notif)

        # 2. Delete scheduler jobs
        if candidate.scheduler_jobs:
            for job in list(candidate.scheduler_jobs):
                db.delete(job)

        # 3. Delete email logs
        if candidate.email_logs:
            for log in list(candidate.email_logs):
                db.delete(log)

        # 4. Delete Gmail account CRM DB record
        if candidate.gmail_account:
            db.delete(candidate.gmail_account)

        # 5. Check assigned EmailDraft
        draft_to_delete = None
        draft_attachment_to_clean = None

        draft = candidate.email_draft or (db.get(EmailDraft, candidate.email_draft_id) if candidate.email_draft_id else None)
        if draft:
            other_cands_count = db.scalar(
                select(func.count(Candidate.id)).where(
                    Candidate.email_draft_id == draft.id,
                    Candidate.id != candidate.id,
                )
            ) or 0

            candidate.email_draft_id = None

            if other_cands_count == 0:
                draft_to_delete = draft
                draft_attachment_to_clean = draft.attachment_path

        if draft_to_delete:
            db.delete(draft_to_delete)

        # 6. Save CV file path for cleanup after commit
        cv_file_to_clean = candidate.cv_file_path

        # Delete candidate model
        db.delete(candidate)

        # Commit single database transaction
        db.commit()

        # 7. Post-commit physical file cleanup
        if draft_attachment_to_clean:
            other_draft_count = db.scalar(
                select(func.count(EmailDraft.id)).where(
                    EmailDraft.attachment_path == draft_attachment_to_clean
                )
            ) or 0
            if other_draft_count == 0:
                _delete_file_if_exists(draft_attachment_to_clean)

        if cv_file_to_clean:
            other_cv_count = db.scalar(
                select(func.count(Candidate.id)).where(
                    Candidate.cv_file_path == cv_file_to_clean
                )
            ) or 0
            if other_cv_count == 0:
                _delete_file_if_exists(cv_file_to_clean)

    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Failed to delete candidate: {exc}") from exc
