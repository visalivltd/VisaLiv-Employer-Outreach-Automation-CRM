import concurrent.futures
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.candidate import Candidate
from app.models.email_draft import EmailDraft
from app.models.email_log import EmailLog
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.outreach_settings import OutreachSettings
from app.repositories.outreach_settings_repository import (
    get_outreach_settings,
    update_outreach_settings,
)
from app.services.outreach_service import OutreachService


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Seed initial test data
    draft = EmailDraft(
        id=1,
        name="Default Test Draft",
        subject="Test Subject {{candidate_name}}",
        body="Hello {{employer_name}}",
    )
    session.add(draft)
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


def test_settings_persistence_and_update(test_db):
    settings = get_outreach_settings(test_db)
    assert settings.max_emails_per_candidate_per_day == 5
    assert settings.min_gap_minutes == 60
    assert settings.enabled is True

    # Update settings
    updated = update_outreach_settings(
        db=test_db,
        max_emails_per_candidate_per_day=10,
        min_gap_minutes=30,
        enabled=False,
    )
    assert updated.max_emails_per_candidate_per_day == 10
    assert updated.min_gap_minutes == 30
    assert updated.enabled is False

    # Fetch again from DB
    re_fetched = get_outreach_settings(test_db)
    assert re_fetched.max_emails_per_candidate_per_day == 10
    assert re_fetched.min_gap_minutes == 30
    assert re_fetched.enabled is False


def test_min_gap_interval_enforcement(test_db):
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=60, enabled=True)

    # Candidate 1 sends first email now
    log1 = EmailLog(
        candidate_id=1,
        employer_id=1,
        gmail_account_id=1,
        subject="Test 1",
        status="sent",
        created_at=datetime.now(timezone.utc),
        sent_at=datetime.now(timezone.utc),
    )
    test_db.add(log1)
    test_db.commit()

    # Attempt second email immediately (0 minutes elapsed)
    can_send, reason = OutreachService.can_send(test_db, candidate_id=1, employer_id=2)
    assert can_send is False
    assert "Minimum gap of 60m" in reason

    # Simulate 65 minutes passed
    past_time = datetime.now(timezone.utc) - timedelta(minutes=65)
    log1.created_at = past_time
    log1.sent_at = past_time
    test_db.commit()

    # Attempt second email after gap
    can_send, reason = OutreachService.can_send(test_db, candidate_id=1, employer_id=2)
    assert can_send is True


def test_daily_limit_and_per_candidate_independence(test_db):
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=0, enabled=True)

    # Candidate 1 sends 5 emails today to employers 1..5
    for emp_id in range(1, 6):
        log = EmailLog(
            candidate_id=1,
            employer_id=emp_id,
            gmail_account_id=1,
            subject=f"Test {emp_id}",
            status="sent",
            created_at=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc),
        )
        test_db.add(log)
    test_db.commit()

    # 6th email for Candidate 1 is BLOCKED by daily limit
    can_send, reason = OutreachService.can_send(test_db, candidate_id=1, employer_id=6)
    assert can_send is False
    assert "Daily limit reached" in reason

    # Candidate 2 (different candidate) can STILL send to employer 10
    can_send_c2, reason_c2 = OutreachService.can_send(test_db, candidate_id=2, employer_id=10)
    assert can_send_c2 is True, f"Failed with reason: {reason_c2}"


def test_duplicate_candidate_employer_pair_blocked(test_db):
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=5, min_gap_minutes=0, enabled=True)

    # Record email sent from Candidate 1 to Employer 1
    log = EmailLog(
        candidate_id=1,
        employer_id=1,
        gmail_account_id=1,
        subject="Test",
        status="sent",
        created_at=datetime.now(timezone.utc),
        sent_at=datetime.now(timezone.utc),
    )
    test_db.add(log)
    test_db.commit()

    # Candidate 1 sending to Employer 1 again is BLOCKED
    can_send, reason = OutreachService.can_send(test_db, candidate_id=1, employer_id=1)
    assert can_send is False
    assert "Already contacted by this candidate" in reason


def test_concurrent_send_enforces_limit_and_gap(test_db):
    """
    CONCURRENCY & INTERVAL TEST:
    Verifies that send attempts for the same candidate enforce the daily limit
    and minimum gap rule.
    """
    update_outreach_settings(test_db, max_emails_per_candidate_per_day=2, min_gap_minutes=60, enabled=True)

    results = []

    for emp_id in range(1, 6):
        can_send, reason = OutreachService.can_send(test_db, candidate_id=1, employer_id=emp_id)
        if can_send:
            log = EmailLog(
                candidate_id=1,
                employer_id=emp_id,
                gmail_account_id=1,
                subject=f"Concurrent Test {emp_id}",
                status="sent",
                created_at=datetime.now(timezone.utc),
                sent_at=datetime.now(timezone.utc),
            )
            test_db.add(log)
            test_db.commit()
            results.append((emp_id, True, "sent"))
        else:
            results.append((emp_id, False, reason))

    # Exactly 1 send must succeed (because min_gap is 60m), and all remaining 4 attempts must be blocked
    successful_sends = [r for r in results if r[1] is True]
    assert len(successful_sends) == 1
    assert len(results) == 5
    assert "Minimum gap of 60m" in results[1][2]
