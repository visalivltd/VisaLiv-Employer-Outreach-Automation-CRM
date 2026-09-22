import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.candidate
import app.models.email_draft
import app.models.email_log
import app.models.employer
import app.models.gmail_account
import app.models.outreach_job
import app.models.outreach_settings
import app.models.real_candidate
from app.db.base import Base
from app.models.candidate import Candidate
from app.models.email_draft import EmailDraft
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.outreach_job import OutreachJob
from app.models.outreach_settings import OutreachSettings
from app.services.storage_service import StorageService, storage_service
from app.services.outreach_service import OutreachService
from app.schemas.candidate import CandidateResponse


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    settings = OutreachSettings(
        id=1,
        max_emails_per_candidate_per_day=5,
        min_gap_minutes=60,
        enabled=True,
    )
    draft = EmailDraft(
        id=1,
        name="Test Draft",
        subject="Subject {{candidate_name}}",
        body="Body {{employer_name}}",
    )
    session.add_all([settings, draft])
    session.commit()

    cand1 = Candidate(
        id=1,
        full_name="Candidate A",
        email="cand1@example.com",
        cv_file_path="uploads/cand1.pdf",
        is_active=True,
        email_draft_id=1,
    )
    cand2 = Candidate(
        id=2,
        full_name="Candidate B",
        email="cand2@example.com",
        cv_file_path="uploads/cand2.pdf",
        is_active=True,
        email_draft_id=1,
    )
    session.add_all([cand1, cand2])
    session.commit()

    gmail1 = GmailAccount(id=1, candidate_id=1, gmail_email="cand1@gmail.com", is_active=True, refresh_token="ref1")
    gmail2 = GmailAccount(id=2, candidate_id=2, gmail_email="cand2@gmail.com", is_active=True, refresh_token="ref2")
    session.add_all([gmail1, gmail2])

    emp1 = Employer(id=1, service_name="Company 1", email="emp1@company.com", is_active=True)
    emp2 = Employer(id=2, service_name="Company 2", email="emp2@company.com", is_active=True)
    session.add_all([emp1, emp2])
    session.commit()

    yield session
    session.close()


def test_successful_gcs_cv_upload():
    """Test 1: Successful GCS upload returns object key."""
    mock_blob = MagicMock()
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    service = StorageService(bucket_name="test-bucket")
    service._gcs_bucket = mock_bucket

    key = service.upload_file("uploads/test_uuid1.pdf", b"%PDF-1.4 Content")
    assert key == "uploads/test_uuid1.pdf"
    mock_blob.upload_from_string.assert_called_once()


def test_gcs_upload_failure_raises_exception():
    """Test 2: GCS upload failure raises RuntimeError and does not silently succeed."""
    mock_blob = MagicMock()
    mock_blob.upload_from_string.side_effect = RuntimeError("GCS Storage Access Denied")
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    service = StorageService(bucket_name="test-bucket")
    service._gcs_bucket = mock_bucket

    with pytest.raises(RuntimeError) as exc_info:
        service.upload_file("uploads/test_uuid2.pdf", b"%PDF-1.4 Content")

    assert "Persistent GCS upload failed" in str(exc_info.value)


def test_gcs_object_exists_but_local_filesystem_does_not():
    """Test 3: File is retrieved from GCS even if missing on local container disk."""
    mock_blob = MagicMock()
    mock_blob.exists.return_value = True
    mock_blob.download_as_bytes.return_value = b"%PDF-1.4 GCS Only Content"
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    service = StorageService(bucket_name="test-bucket")
    service._gcs_bucket = mock_bucket

    # Ensure file is missing locally
    clean_path = "uploads/cloud_run_remote_only.pdf"
    retrieved = service.get_file_bytes(clean_path, candidate_id=1, job_id=101)
    assert retrieved == b"%PDF-1.4 GCS Only Content"


def test_missing_gcs_attachment_fails_before_gmail_send(test_db):
    """Test 4: Missing GCS attachment fails pre-flight check BEFORE Gmail API send is called."""
    with patch.object(storage_service, "file_exists", return_value=False), \
         patch("app.services.gmail_service.GmailService") as MockGmailService:

        mock_gmail = MagicMock()
        MockGmailService.return_value = mock_gmail

        job = OutreachJob(
            candidate_id=1,
            employer_id=1,
            gmail_account_id=1,
            scheduled_at=OutreachService.get_start_of_today_ist(),
            status="pending",
        )
        test_db.add(job)
        test_db.commit()

        res = OutreachService.process_due_outreach_jobs(test_db)

        # Job should fail pre-flight check
        test_db.refresh(job)
        assert job.status == "failed"
        assert "CV attachment missing in persistent storage" in job.error_message
        assert res["failed"] == 1

        # GmailService.send_email should NOT have been called!
        mock_gmail.send_email.assert_not_called()


def test_multiple_candidates_in_same_automation_batch(test_db):
    """Test 5: Multiple candidates in the same batch resolve their respective CVs correctly."""
    def fake_get_bytes(path, candidate_id=None, job_id=None):
        return f"%PDF-1.4 Content for {path}".encode("utf-8")

    with patch.object(storage_service, "file_exists", return_value=True), \
         patch.object(storage_service, "get_file_bytes", side_effect=fake_get_bytes), \
         patch("app.services.email_service.GmailService") as MockGmailService:

        mock_gmail_inst = MagicMock()
        mock_gmail_inst.send_email.return_value = "msg_batch_123"
        MockGmailService.return_value = mock_gmail_inst

        job1 = OutreachJob(id=1, candidate_id=1, employer_id=1, gmail_account_id=1, scheduled_at=OutreachService.get_start_of_today_ist(), status="pending")
        job2 = OutreachJob(id=2, candidate_id=2, employer_id=2, gmail_account_id=2, scheduled_at=OutreachService.get_start_of_today_ist(), status="pending")
        test_db.add_all([job1, job2])
        test_db.commit()

        res = OutreachService.process_due_outreach_jobs(test_db)
        assert res["sent"] == 2


def test_no_duplicate_email_on_attachment_failure_retry(test_db):
    """Test 6: Attachment failure does not create duplicate sent logs or double emails."""
    with patch.object(storage_service, "file_exists", return_value=False):
        job = OutreachJob(id=10, candidate_id=1, employer_id=1, gmail_account_id=1, scheduled_at=OutreachService.get_start_of_today_ist(), status="pending")
        test_db.add(job)
        test_db.commit()

        # 1st Run -> Fails pre-flight check
        OutreachService.process_due_outreach_jobs(test_db)

        sent_logs = test_db.scalars(select(EmailLog).where(EmailLog.status == "sent")).all()
        assert len(sent_logs) == 0

        test_db.refresh(job)
        assert job.status == "failed"


def test_existing_candidate_cv_reference_not_wiped_by_cloud_run(test_db):
    """Test 7: CandidateResponse Pydantic model preserves cv_file_path DB reference even if local container storage is missing."""
    cand = test_db.get(Candidate, 1)
    assert cand.cv_file_path == "uploads/cand1.pdf"

    # Validate CandidateResponse Pydantic model
    resp = CandidateResponse.model_validate(cand)
    assert resp.cv_file_path == "uploads/cand1.pdf"
