import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker

import app.models.admin
import app.models.candidate
import app.models.email_draft
import app.models.email_log
import app.models.employer
import app.models.gmail_account
import app.models.notification
import app.models.oauth_state
import app.models.outreach_job
import app.models.outreach_settings
import app.models.real_candidate
import app.models.scheduler_job
import app.models.system_gmail_account
from app.db.base import Base
from app.main import app
from app.models.candidate import Candidate
from app.models.email_draft import EmailDraft
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.outreach_job import OutreachJob
from app.models.outreach_settings import OutreachSettings



from app.repositories.outreach_settings_repository import (
    get_outreach_settings,
    update_outreach_settings,
)
from app.services.outreach_service import OutreachService


from sqlalchemy.pool import StaticPool

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





    # Seed initial test data
    settings = OutreachSettings(
        id=1,
        max_emails_per_candidate_per_day=5,
        min_gap_minutes=60,
        enabled=True,
    )
    draft = EmailDraft(
        id=1,
        name="Default Test Draft",
        subject="Test Subject {{candidate_name}}",
        body="Hello {{employer_name}}",
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

    gmail_1 = GmailAccount(id=1, candidate_id=1, gmail_email="cand1@gmail.com", is_active=True, refresh_token="ref1")
    gmail_2 = GmailAccount(id=2, candidate_id=2, gmail_email="cand2@gmail.com", is_active=True, refresh_token="ref2")
    session.add_all([gmail_1, gmail_2])

    employers = [
        Employer(id=i, service_name=f"Company {i}", email=f"emp{i}@company.com", is_active=True)
        for i in range(1, 15)
    ]
    session.add_all(employers)
    session.commit()

    yield session
    session.close()


def test_start_outreach_schedules_max_5_with_60m_gap(test_db):
    """TEST 1 & 2: Start Outreach schedules max 5 jobs with T, T+60, T+120, T+180, T+240 timestamps."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=60, enabled=True)

    result = OutreachService.start_outreach(test_db, candidate_id=1)
    assert result["success"] is True
    assert result["queued"] == 5

    jobs = test_db.scalars(
        select(OutreachJob)
        .where(OutreachJob.candidate_id == 1, OutreachJob.status == "pending")
        .order_by(OutreachJob.scheduled_at.asc())
    ).all()

    assert len(jobs) == 5

    # Verify spacing of 60 minutes between jobs
    for i in range(len(jobs) - 1):
        j1_time = jobs[i].scheduled_at
        j2_time = jobs[i + 1].scheduled_at
        if j1_time.tzinfo is None:
            j1_time = j1_time.replace(tzinfo=timezone.utc)
        if j2_time.tzinfo is None:
            j2_time = j2_time.replace(tzinfo=timezone.utc)
        diff_minutes = (j2_time - j1_time).total_seconds() / 60.0
        assert diff_minutes == 60.0


def test_worker_only_processes_due_jobs_not_future(test_db):
    """TEST 3, 4, 5 & 6: Worker does NOT send future jobs. Only due jobs are processed immediately."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=60, enabled=True)

    # 1. Start outreach creates 5 jobs
    start_res = OutreachService.start_outreach(test_db, candidate_id=1)
    assert start_res["queued"] == 5

    # 2. Run worker processing immediately at time T
    # Note: send_outreach in mock test setup tries to send via EmailService.
    # We verify that only 1 job is picked up by process_due_outreach_jobs.
    res = OutreachService.process_due_outreach_jobs(test_db)

    # Worker processed exactly 1 due job (the first job scheduled for now_utc)
    assert res["processed"] == 1

    # Remaining 4 jobs are still pending with future scheduled_at
    pending_jobs = test_db.scalars(
        select(OutreachJob).where(OutreachJob.candidate_id == 1, OutreachJob.status == "pending")
    ).all()
    assert len(pending_jobs) == 4

    now_utc = datetime.now(timezone.utc)
    for p_job in pending_jobs:
        p_time = p_job.scheduled_at
        if p_time.tzinfo is None:
            p_time = p_time.replace(tzinfo=timezone.utc)
        assert p_time > now_utc


def test_duplicate_start_outreach_does_not_duplicate_jobs(test_db):
    """TEST 7: Duplicate Start Outreach calls do not recreate existing queued jobs."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=60, enabled=True)

    first_res = OutreachService.start_outreach(test_db, candidate_id=1)
    assert first_res["queued"] == 5

    second_res = OutreachService.start_outreach(test_db, candidate_id=1)
    assert second_res["queued"] == 0

    total_jobs = test_db.scalar(
        select(func.count(OutreachJob.id)).where(OutreachJob.candidate_id == 1)
    )
    assert total_jobs == 5


def test_two_candidates_schedule_independently(test_db):
    """TEST 8: Candidate A's gap does not block Candidate B."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=60, enabled=True)

    # Candidate A sent email 10 mins ago
    now_utc = datetime.now(timezone.utc)
    log_a = EmailLog(
        candidate_id=1,
        employer_id=1,
        gmail_account_id=1,
        subject="A Recent",
        status="sent",
        created_at=now_utc - timedelta(minutes=10),
        sent_at=now_utc - timedelta(minutes=10),
    )
    test_db.add(log_a)
    test_db.commit()

    # Start outreach for both candidates
    result = OutreachService.start_outreach(test_db)
    assert result["success"] is True

    jobs_a = test_db.scalars(
        select(OutreachJob).where(OutreachJob.candidate_id == 1, OutreachJob.status == "pending")
    ).all()
    jobs_b = test_db.scalars(
        select(OutreachJob).where(OutreachJob.candidate_id == 2, OutreachJob.status == "pending")
    ).all()

    assert len(jobs_a) == 4
    assert len(jobs_b) == 5

    # Candidate B's first job scheduled immediately (now_utc)
    j_b_time = jobs_b[0].scheduled_at
    if j_b_time.tzinfo is None:
        j_b_time = j_b_time.replace(tzinfo=timezone.utc)
    assert abs((j_b_time - now_utc).total_seconds()) < 5.0


def test_start_outreach_disabled_setting(test_db):
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=60, enabled=False)

    result = OutreachService.start_outreach(test_db)
    assert result["success"] is False
    assert result["queued"] == 0
    assert "disabled" in result["message"].lower()


def test_process_due_outreach_jobs_reverifies_and_skips_inactive(test_db):
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=60, enabled=True)

    # Queue job for Candidate 1
    now_utc = datetime.now(timezone.utc)
    job = OutreachJob(
        candidate_id=1,
        employer_id=1,
        gmail_account_id=1,
        scheduled_at=now_utc - timedelta(minutes=5),  # due 5 minutes ago
        status="pending",
    )
    test_db.add(job)
    test_db.commit()

    # Inactivate Candidate 1 after job was created
    cand1 = test_db.get(Candidate, 1)
    cand1.is_active = False
    test_db.commit()

    # Run worker processing
    res = OutreachService.process_due_outreach_jobs(test_db)
    assert res["processed"] == 1
    assert res["skipped"] == 1

    # Job status updated to skipped
    test_db.refresh(job)
    assert job.status == "skipped"
    assert "inactive" in job.error_message.lower()


def test_get_and_put_outreach_settings_endpoints(test_db):
    """TEST 9 & 10: GET and PUT /outreach/settings return HTTP 200."""
    from app.db.session import get_db as get_db_session
    from app.api.v1.outreach import get_db as get_db_outreach

    def _override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db_session] = _override_get_db
    app.dependency_overrides[get_db_outreach] = _override_get_db
    try:
        client = TestClient(app)

        # GET /outreach/settings
        resp_get1 = client.get("/outreach/settings")
        assert resp_get1.status_code == 200
        data1 = resp_get1.json()
        assert "max_emails_per_candidate_per_day" in data1
        assert "min_gap_minutes" in data1

        # GET /api/v1/outreach/settings
        resp_get2 = client.get("/api/v1/outreach/settings")
        assert resp_get2.status_code == 200

        # PUT /outreach/settings
        resp_put1 = client.put(
            "/outreach/settings",
            json={"max_emails_per_candidate_per_day": 5, "min_gap_minutes": 60, "enabled": True},
        )
        assert resp_put1.status_code == 200

        # PUT /api/v1/outreach/settings
        resp_put2 = client.put(
            "/outreach/settings",
            json={"max_emails_per_candidate_per_day": 5, "min_gap_minutes": 60, "enabled": True},
        )
        assert resp_put2.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_updating_min_gap_reschedules_pending_jobs(test_db):
    """TEST 11: Updating min_gap_minutes from 90 to 15 updates scheduled_at on pending jobs."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=90, enabled=True)

    # Candidate 1 sends email 1 at time T-10 mins
    now_utc = datetime.now(timezone.utc)
    log_1 = EmailLog(
        candidate_id=1,
        employer_id=1,
        gmail_account_id=1,
        subject="Email 1",
        status="sent",
        created_at=now_utc - timedelta(minutes=10),
        sent_at=now_utc - timedelta(minutes=10),
    )
    test_db.add(log_1)
    test_db.commit()

    # Start outreach: schedules next job for T-10m + 90m = T+80m
    OutreachService.start_outreach(test_db, candidate_id=1)

    pending_job = test_db.scalars(
        select(OutreachJob).where(OutreachJob.candidate_id == 1, OutreachJob.status == "pending")
    ).first()
    assert pending_job is not None

    sched_time_before = pending_job.scheduled_at
    if sched_time_before.tzinfo is None:
        sched_time_before = sched_time_before.replace(tzinfo=timezone.utc)
    # With 90m gap, scheduled_at is around T+80m
    assert (sched_time_before - now_utc).total_seconds() > 60 * 60

    # User updates settings to 15m gap
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=15, enabled=True)

    test_db.refresh(pending_job)
    sched_time_after = pending_job.scheduled_at
    if sched_time_after.tzinfo is None:
        sched_time_after = sched_time_after.replace(tzinfo=timezone.utc)

    # With 15m gap, candidate is eligible at T-10m + 15m = T+5m (or now_utc)
    # The new scheduled_at must be significantly earlier than the old 90m scheduled_at
    assert (sched_time_after - now_utc).total_seconds() <= 15 * 60 + 5




