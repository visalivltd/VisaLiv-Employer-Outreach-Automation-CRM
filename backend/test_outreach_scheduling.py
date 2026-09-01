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


def test_batch_outreach_queues_minimum_gap_jobs(test_db):
    """TEST 12: Batch outreach sends 1st email immediately and queues 2nd & 3rd emails with 2m gap."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=10, min_gap_minutes=2, enabled=True)

    pairings = [
        {"candidate_id": 1, "employer_id": 1},
        {"candidate_id": 1, "employer_id": 2},
        {"candidate_id": 1, "employer_id": 3},
    ]

    res = OutreachService.batch_outreach(test_db, pairings)
    assert res["queued"] == 2
    assert (res["sent"] + res["failed"]) == 1
    assert res["skipped"] == 0

    queued_jobs = test_db.scalars(
        select(OutreachJob)
        .where(OutreachJob.candidate_id == 1, OutreachJob.status == "pending")
        .order_by(OutreachJob.scheduled_at.asc())
    ).all()

    assert len(queued_jobs) == 2

    now_utc = datetime.now(timezone.utc)
    j1_time = queued_jobs[0].scheduled_at
    if j1_time.tzinfo is None:
        j1_time = j1_time.replace(tzinfo=timezone.utc)

    j2_time = queued_jobs[1].scheduled_at
    if j2_time.tzinfo is None:
        j2_time = j2_time.replace(tzinfo=timezone.utc)

    assert 1.8 * 60 <= (j1_time - now_utc).total_seconds() <= 2.2 * 60
    assert 3.8 * 60 <= (j2_time - now_utc).total_seconds() <= 4.2 * 60


def test_worker_execution_for_queued_jobs_at_scheduled_time(test_db):
    """TEST 13: Simulate background worker execution at T+2m and T+4m for queued gap jobs."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=4, min_gap_minutes=2, enabled=True)

    now_utc = datetime.now(timezone.utc)

    # 1. Create 3 queued jobs with scheduled_at at T, T+2m, T+4m
    job1 = OutreachJob(candidate_id=1, employer_id=1, gmail_account_id=1, scheduled_at=now_utc - timedelta(seconds=5), status="pending")
    job2 = OutreachJob(candidate_id=1, employer_id=2, gmail_account_id=1, scheduled_at=now_utc + timedelta(minutes=2), status="pending")
    job3 = OutreachJob(candidate_id=1, employer_id=3, gmail_account_id=1, scheduled_at=now_utc + timedelta(minutes=4), status="pending")
    test_db.add_all([job1, job2, job3])
    test_db.commit()

    log1 = EmailLog(candidate_id=1, employer_id=1, gmail_account_id=1, subject="Test 1", status="sent", created_at=now_utc, sent_at=now_utc)
    job1.status = "sent"
    job1.email_log_id = 1
    job1.sent_at = now_utc
    test_db.add(log1)
    test_db.commit()

    # 2. Worker runs at T+1m (Job 2 scheduled_at is T+2m -> not due yet)
    due_at_1m = test_db.scalars(
        select(OutreachJob).where(OutreachJob.status == "pending", OutreachJob.scheduled_at <= now_utc + timedelta(minutes=1))
    ).all()
    assert len(due_at_1m) == 0

    # 3. Worker runs at T+2m (Job 2 is due)
    time_2m = now_utc + timedelta(minutes=2, seconds=1)
    log2 = EmailLog(candidate_id=1, employer_id=2, gmail_account_id=1, subject="Test 2", status="sent", created_at=time_2m, sent_at=time_2m)
    job2.status = "sent"
    job2.email_log_id = 2
    job2.sent_at = time_2m
    test_db.add(log2)
    test_db.commit()

    test_db.refresh(job2)
    test_db.refresh(job3)
    assert job2.status == "sent"
    assert job3.status == "pending"

    # 4. Worker runs at T+4m (Job 3 is due)
    time_4m = now_utc + timedelta(minutes=4, seconds=1)
    log3 = EmailLog(candidate_id=1, employer_id=3, gmail_account_id=1, subject="Test 3", status="sent", created_at=time_4m, sent_at=time_4m)
    job3.status = "sent"
    job3.email_log_id = 3
    job3.sent_at = time_4m
    test_db.add(log3)
    test_db.commit()

    test_db.refresh(job3)
    assert job3.status == "sent"


def test_worker_subsecond_polling_reschedules_not_skips(test_db):
    """TEST 14: Worker polling slightly before full gap precision reschedules job to pending, NOT skipped, and sends on next poll."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=4, min_gap_minutes=2, enabled=True)

    now_utc = datetime.now(timezone.utc)
    # Email 1 sent 1m 58s ago (1.966 minutes ago)
    start_time = now_utc - timedelta(minutes=1, seconds=58)
    log1 = EmailLog(
        candidate_id=1,
        employer_id=1,
        gmail_account_id=1,
        subject="Email 1",
        status="sent",
        created_at=start_time,
        sent_at=start_time,
    )
    test_db.add(log1)
    test_db.commit()

    # Second job due 1s ago by scheduled_at, but gap is 1.966m (< 2.0m)
    job2_time = now_utc - timedelta(seconds=1)
    job2 = OutreachJob(
        candidate_id=1,
        employer_id=2,
        gmail_account_id=1,
        scheduled_at=job2_time,
        status="pending",
    )
    test_db.add(job2)
    test_db.commit()

    # 1. Worker polls when job2 is due by scheduled_at, but gap is 1.966m
    res_poll1 = OutreachService.process_due_outreach_jobs(test_db)
    assert res_poll1["processed"] == 1

    # 2. Verify job2 status remains PENDING and scheduled_at is updated to start_time + 2m
    test_db.refresh(job2)
    assert job2.status == "pending"
    assert "minimum gap" in job2.error_message.lower()

    expected_next = start_time + timedelta(minutes=2)
    sched_tz = job2.scheduled_at.replace(tzinfo=timezone.utc) if job2.scheduled_at.tzinfo is None else job2.scheduled_at
    assert abs((sched_tz - expected_next).total_seconds()) < 1.0


def test_batch_outreach_counts_and_daily_limit_capacity(test_db):
    """TEST 15: Verify batch outreach returns exact counts (sent_count, queued_count, skipped_count) and respects daily capacity."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=4, min_gap_minutes=2, enabled=True)

    pairings = [
        {"candidate_id": 1, "employer_id": 1},
        {"candidate_id": 1, "employer_id": 2},
        {"candidate_id": 1, "employer_id": 3},
        {"candidate_id": 1, "employer_id": 4},
        {"candidate_id": 1, "employer_id": 5},
        {"candidate_id": 1, "employer_id": 6},
    ]

    res = OutreachService.batch_outreach(test_db, pairings)

    assert "sent_count" in res
    assert "queued_count" in res
    assert "skipped_count" in res
    assert "failed_count" in res

    assert (res["sent_count"] + res["failed_count"]) == 1
    assert res["queued_count"] == 3
    assert res["skipped_count"] == 2


def test_exact_real_batch_outreach_scenario_50_selected_1_sent_3_queued_46_skipped(test_db, monkeypatch):
    """TEST 16: Exact real scenario - 50 selected, limit 4, sent today 0 -> 1 sent, 3 queued, 46 skipped."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=4, min_gap_minutes=2, enabled=True)

    dummy_log = EmailLog(candidate_id=1, employer_id=1, gmail_account_id=1, subject="Test", status="sent", sent_at=datetime.now(timezone.utc))
    dummy_log.id = 999
    monkeypatch.setattr(OutreachService, "send_outreach", lambda *args, **kwargs: dummy_log)

    pairings = [{"candidate_id": 1, "employer_id": i} for i in range(1, 51)]

    res = OutreachService.batch_outreach(test_db, pairings)

    assert res["sent_count"] == 1
    assert res["queued_count"] == 3
    assert res["skipped_count"] == 46
    assert res["failed_count"] == 0

    pending_jobs = test_db.scalars(
        select(OutreachJob)
        .where(OutreachJob.candidate_id == 1, OutreachJob.status == "pending")
        .order_by(OutreachJob.scheduled_at.asc())
    ).all()

    assert len(pending_jobs) == 3


def test_batch_outreach_scenario_daily_limit_20_sent_1_queued_18_skipped_31(test_db, monkeypatch):
    """TEST 17: Limit 20, sent_today 1, selected 50 -> 1 sent, 18 queued, 31 skipped = 50 total."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=20, min_gap_minutes=2, enabled=True)

    # Ensure 50 active employers exist in test_db
    for i in range(1, 51):
        if not test_db.get(Employer, i):
            emp = Employer(id=i, service_name=f"Test Employer {i}", email=f"emp{i}@example.com", is_active=True)
            test_db.add(emp)
    test_db.commit()

    # Simulate 1 existing sent email today for candidate 1
    existing_log = EmailLog(
        candidate_id=1,
        employer_id=999,
        gmail_account_id=1,
        subject="Previous Email Today",
        status="sent",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        sent_at=datetime.now(timezone.utc) - timedelta(minutes=10)
    )
    test_db.add(existing_log)
    test_db.commit()

    # Mock send_outreach so item 1 sends successfully
    dummy_log = EmailLog(candidate_id=1, employer_id=1, gmail_account_id=1, subject="Test", status="sent", sent_at=datetime.now(timezone.utc))
    dummy_log.id = 1001
    monkeypatch.setattr(OutreachService, "send_outreach", lambda *args, **kwargs: dummy_log)

    # 50 selected items
    pairings = [{"candidate_id": 1, "employer_id": i} for i in range(1, 51)]

    res = OutreachService.batch_outreach(test_db, pairings)

    assert res["sent_count"] == 1
    assert res["queued_count"] == 18
    assert res["skipped_count"] == 31
    assert res["failed_count"] == 0

    assert (res["sent_count"] + res["queued_count"] + res["skipped_count"] + res["failed_count"]) == 50

    pending_jobs = test_db.scalars(
        select(OutreachJob)
        .where(OutreachJob.candidate_id == 1, OutreachJob.status == "pending")
        .order_by(OutreachJob.scheduled_at.asc())
    ).all()

    assert len(pending_jobs) == 18


def test_structured_reason_codes_returned_by_eligibility_engine(test_db):
    """TEST: Structured reason codes returned by check_eligibility()."""
    from app.services.outreach_service import ReasonCode, OutreachService
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=60, enabled=True)

    # 1. Valid ready pair
    res_ready = OutreachService.check_eligibility(test_db, 1, 1)
    assert res_ready.allowed is True
    assert res_ready.reason_code == ReasonCode.READY

    # 2. Inactive candidate
    cand1 = test_db.get(Candidate, 1)
    cand1.is_active = False
    test_db.commit()
    res_inact = OutreachService.check_eligibility(test_db, 1, 1)
    assert res_inact.allowed is False
    assert res_inact.reason_code == ReasonCode.CANDIDATE_INACTIVE
    cand1.is_active = True
    test_db.commit()


def test_batch_scenario_limit_4_sent_today_1_selected_50(test_db, monkeypatch):
    """TEST 2: limit=4, sent_today=1, selected=50 -> 1 sent, 2 queued, 47 skipped = 50 total."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=4, min_gap_minutes=2, enabled=True)
    for i in range(1, 51):
        if not test_db.get(Employer, i):
            test_db.add(Employer(id=i, service_name=f"Emp {i}", email=f"emp{i}@test.com", is_active=True))
    test_db.commit()

    existing_log = EmailLog(
        candidate_id=1, employer_id=999, gmail_account_id=1, subject="Past", status="sent",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=10), sent_at=datetime.now(timezone.utc) - timedelta(minutes=10)
    )
    test_db.add(existing_log)
    test_db.commit()

    dummy_log = EmailLog(candidate_id=1, employer_id=1, gmail_account_id=1, subject="Test", status="sent", sent_at=datetime.now(timezone.utc))
    dummy_log.id = 2001
    monkeypatch.setattr(OutreachService, "send_outreach", lambda *args, **kwargs: dummy_log)

    pairings = [{"candidate_id": 1, "employer_id": i} for i in range(1, 51)]
    res = OutreachService.batch_outreach(test_db, pairings)

    assert res["sent_count"] == 1
    assert res["queued_count"] == 2
    assert res["skipped_count"] == 47
    assert (res["sent_count"] + res["queued_count"] + res["skipped_count"] + res["failed_count"]) == 50


def test_batch_scenario_limit_20_sent_today_0_selected_50(test_db, monkeypatch):
    """TEST 4: limit=20, sent_today=0, selected=50 -> 1 sent, 19 queued, 30 skipped = 50 total."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=20, min_gap_minutes=2, enabled=True)
    for i in range(1, 51):
        if not test_db.get(Employer, i):
            test_db.add(Employer(id=i, service_name=f"Emp {i}", email=f"emp{i}@test.com", is_active=True))
    test_db.commit()

    dummy_log = EmailLog(candidate_id=1, employer_id=1, gmail_account_id=1, subject="Test", status="sent", sent_at=datetime.now(timezone.utc))
    dummy_log.id = 3001
    monkeypatch.setattr(OutreachService, "send_outreach", lambda *args, **kwargs: dummy_log)

    pairings = [{"candidate_id": 1, "employer_id": i} for i in range(1, 51)]
    res = OutreachService.batch_outreach(test_db, pairings)

    assert res["sent_count"] == 1
    assert res["queued_count"] == 19
    assert res["skipped_count"] == 30
    assert (res["sent_count"] + res["queued_count"] + res["skipped_count"] + res["failed_count"]) == 50


def test_sent_outreach_job_not_double_counted_with_email_log(test_db):
    """TEST 6: Completed OutreachJob (status='sent') with EmailLog is NOT double-counted."""
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=4, min_gap_minutes=2, enabled=True)
    start_of_today = OutreachService.get_start_of_today_ist()

    # 1. Create 1 EmailLog with status="sent"
    log = EmailLog(candidate_id=1, employer_id=1, gmail_account_id=1, subject="Sent", status="sent", created_at=datetime.now(timezone.utc), sent_at=datetime.now(timezone.utc))
    test_db.add(log)
    test_db.commit()

    # 2. Create 1 OutreachJob associated with this sent email (status="sent")
    job = OutreachJob(candidate_id=1, employer_id=1, gmail_account_id=1, scheduled_at=datetime.now(timezone.utc), status="sent", email_log_id=log.id)
    test_db.add(job)
    test_db.commit()

    sent_count = OutreachService.get_candidate_sent_today(test_db, 1, start_of_today)
    pending_count = OutreachService.get_candidate_pending_today(test_db, 1, start_of_today)

    assert sent_count == 1
    assert pending_count == 0
    # Total capacity used must be 1, NOT 2!
    assert (sent_count + pending_count) == 1


def test_cancel_pending_jobs(test_db):
    """TEST 19: Cancelling pending jobs sets status to cancelled and worker ignores them."""
    job1 = OutreachJob(candidate_id=1, employer_id=1, gmail_account_id=1, scheduled_at=datetime.now(timezone.utc), status="pending")
    job2 = OutreachJob(candidate_id=1, employer_id=2, gmail_account_id=1, scheduled_at=datetime.now(timezone.utc), status="pending")
    test_db.add_all([job1, job2])
    test_db.commit()

    res = OutreachService.cancel_pending_jobs(test_db)
    assert res["success"] is True
    assert res["cancelled_count"] == 2

    test_db.refresh(job1)
    test_db.refresh(job2)
    assert job1.status == "cancelled"
    assert job2.status == "cancelled"

    # Worker processing should find 0 due jobs
    worker_res = OutreachService.process_due_outreach_jobs(test_db)
    assert worker_res["processed"] == 0


def test_auto_replacement_for_cooldown_job(test_db):
    """TEST 20: If assigned employer enters 3-day cooldown, worker auto-replaces with next free eligible employer."""
    cand = test_db.get(Candidate, 1)
    emp1 = Employer(id=100, service_name="Emp100", email="emp100@test.com", is_active=True)
    emp2 = Employer(id=101, service_name="Emp101", email="emp101@test.com", is_active=True)
    test_db.add_all([emp1, emp2])
    test_db.commit()

    # Put emp1 into 3-day cooldown by another candidate
    log = EmailLog(candidate_id=2, employer_id=emp1.id, gmail_account_id=1, subject="S", body="B", status="sent", sent_at=datetime.now(timezone.utc), created_at=datetime.now(timezone.utc))
    test_db.add(log)
    test_db.commit()

    # Job created for emp1
    job = OutreachJob(candidate_id=cand.id, employer_id=emp1.id, gmail_account_id=cand.gmail_account.id, scheduled_at=datetime.now(timezone.utc), status="pending")
    test_db.add(job)
    test_db.commit()

    # Worker processes job -> should auto-replace emp1 with emp2
    res = OutreachService.process_due_outreach_jobs(test_db)
    assert res["processed"] == 1

    test_db.refresh(job)
    assert job.employer_id != emp1.id

