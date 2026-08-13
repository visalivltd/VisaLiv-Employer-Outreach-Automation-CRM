from sqlalchemy.orm import Session

from app.models.email_draft import EmailDraft
from app.repositories import email_draft_repository
from app.schemas.email_draft import EmailDraftCreate, EmailDraftUpdate


def create_email_draft(
    db: Session,
    data: EmailDraftCreate,
) -> EmailDraft:
    draft_name = data.name.strip() if data.name and data.name.strip() else None

    if draft_name:
        existing = email_draft_repository.get_email_draft_by_name(db, draft_name)
        if existing:
            raise ValueError("Email draft with this name already exists")

    draft = EmailDraft(
        name=draft_name,
        subject=data.subject.strip() if data.subject and data.subject.strip() else None,
        body=data.body.strip() if data.body and data.body.strip() else None,
        attachment_filename=data.attachment_filename,
        attachment_path=data.attachment_path,
    )

    return email_draft_repository.create_email_draft(db, draft)


def get_email_draft(
    db: Session,
    draft_id: int,
) -> EmailDraft | None:
    return email_draft_repository.get_email_draft_by_id(db, draft_id)


def get_email_drafts(
    db: Session,
) -> list[EmailDraft]:
    return email_draft_repository.get_email_drafts(db)


def update_email_draft(
    db: Session,
    draft_id: int,
    data: EmailDraftUpdate,
) -> EmailDraft | None:
    draft = email_draft_repository.get_email_draft_by_id(db, draft_id)
    if draft is None:
        return None

    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        raw_name = update_data.pop("name")
        new_name = raw_name.strip() if raw_name and raw_name.strip() else None
        if new_name and new_name != draft.name:
            existing = email_draft_repository.get_email_draft_by_name(db, new_name)
            if existing:
                raise ValueError("Email draft with this name already exists")
        draft.name = new_name

    if "subject" in update_data:
        raw_subj = update_data.pop("subject")
        draft.subject = raw_subj.strip() if raw_subj and raw_subj.strip() else None

    if "body" in update_data:
        raw_body = update_data.pop("body")
        draft.body = raw_body.strip() if raw_body and raw_body.strip() else None

    if update_data.get("remove_attachment"):
        draft.attachment_filename = None
        draft.attachment_path = None
        update_data.pop("remove_attachment", None)

    for field, value in update_data.items():
        setattr(draft, field, value)

    return email_draft_repository.update_email_draft(db, draft)


def delete_email_draft(
    db: Session,
    draft_id: int,
) -> bool:
    draft = email_draft_repository.get_email_draft_by_id(db, draft_id)
    if draft is None:
        return False

    email_draft_repository.delete_email_draft(db, draft)

    return True
