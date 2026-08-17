from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.gmail_account import GmailAccount
from app.models.email_log import EmailLog
from app.models.notification import Notification
from app.services.gmail_sync_service import sync_incoming_replies, extract_email_address


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    yield session
    session.close()


def test_extract_email_address():
    assert extract_email_address('John Doe <john@example.com>') == 'john@example.com'
    assert extract_email_address('hr@company.com') == 'hr@company.com'
    assert extract_email_address(None) == ''


def test_notifications_full_flow(db):
    # 1. Setup Candidate, GmailAccount, and Employers
    cand = Candidate(full_name="Vaitheeshwaran Yuvaraj", email="cand@visaliv.com", cv_file_path="uploads/dummy.pdf", is_active=True)
    db.add(cand)
    db.commit()

    gmail_acc = GmailAccount(candidate_id=cand.id, gmail_email="cand@visaliv.com", refresh_token="dummy_token", is_active=True)
    db.add(gmail_acc)

    emp1 = Employer(service_name="ABC Healthcare", email="hr@abchealthcare.com", is_active=True)
    emp2 = Employer(service_name="XYZ Healthcare", email="recruitment@xyz.com", is_active=True)
    db.add_all([emp1, emp2])
    db.commit()

    # Pre-existing outgoing email log
    outgoing_log = EmailLog(
        candidate_id=cand.id,
        employer_id=emp1.id,
        gmail_account_id=gmail_acc.id,
        subject="Application for Healthcare Assistant Position",
        status="sent",
        direction="outgoing",
        gmail_message_id="msg_out_001",
    )
    db.add(outgoing_log)
    db.commit()

    # Test 12: Existing outgoing EmailLog preserves direction="outgoing"
    assert outgoing_log.direction == "outgoing"

    # Mock Gmail API response
    mock_messages_list = {
        "messages": [
            {"id": "reply_msg_101", "threadId": "thread_101"},
            {"id": "own_outgoing_msg", "threadId": "thread_102"},
            {"id": "unrelated_msg_201", "threadId": "thread_201"},
            {"id": "reply_msg_102", "threadId": "thread_301"},
        ]
    }

    mock_msg_details = {
        "reply_msg_101": {
            "snippet": "We would like to invite you for an interview.",
            "payload": {
                "headers": [
                    {"name": "From", "value": "ABC Healthcare <hr@abchealthcare.com>"},
                    {"name": "To", "value": "cand@visaliv.com"},
                    {"name": "Subject", "value": "Re: Application for Healthcare Assistant Position"},
                    {"name": "In-Reply-To", "value": "<msg_out_001>"},
                ]
            },
        },
        "own_outgoing_msg": {
            "snippet": "Thank you for the update.",
            "payload": {
                "headers": [
                    {"name": "From", "value": "cand@visaliv.com"},
                    {"name": "To", "value": "hr@abchealthcare.com"},
                    {"name": "Subject", "value": "Re: Application for Healthcare Assistant Position"},
                ]
            },
        },
        "unrelated_msg_201": {
            "snippet": "Weekly Newsletter Digest",
            "payload": {
                "headers": [
                    {"name": "From", "value": "Newsletter <news@spam.com>"},
                    {"name": "To", "value": "cand@visaliv.com"},
                    {"name": "Subject", "value": "Weekly News"},
                ]
            },
        },
        "reply_msg_102": {
            "snippet": "Thank you for your CV. Can you start next Monday?",
            "payload": {
                "headers": [
                    {"name": "From", "value": "XYZ Healthcare <recruitment@xyz.com>"},
                    {"name": "To", "value": "cand@visaliv.com"},
                    {"name": "Subject", "value": "Re: Healthcare Assistant Application"},
                ]
            },
        },
    }

    class MockGmailResource:
        def users(self):
            return self

        def messages(self):
            return self

        def threads(self):
            return self

        def list(self, **kwargs):
            m = MagicMock()
            m.execute.return_value = {"threads": [{"id": m["id"]} for m in mock_messages_list["messages"]]}
            return m

        def get(self, id, **kwargs):
            m = MagicMock()
            if id in mock_msg_details:
                detail = dict(mock_msg_details[id])
                detail["id"] = id
                m.execute.return_value = {"id": id, "messages": [detail]}
            else:
                # Return list of all messages matching this thread ID
                msgs = []
                for msg_id, detail in mock_msg_details.items():
                    d = dict(detail)
                    d["id"] = msg_id
                    msgs.append(d)
                m.execute.return_value = {"id": id, "messages": msgs}
            return m

    with patch("app.services.gmail_sync_service.GmailService") as MockGmailService, \
         patch("app.services.gmail_sync_service.build", return_value=MockGmailResource()):
        
        mock_gs_inst = MagicMock()
        mock_gs_inst._get_credentials.return_value = MagicMock()
        MockGmailService.return_value = mock_gs_inst

        # Sync execution
        result = sync_incoming_replies(db)
        assert result["success"] is True

        # Test 1 & Test 2: Incoming employer reply creates Notification and incoming EmailLog
        logs = db.scalars(select(EmailLog).where(EmailLog.direction == "incoming")).all()
        notifs = db.scalars(select(Notification)).all()

        # All incoming emails imported without discarding missing employers (Requirement 11)
        assert len(logs) == 3
        assert len(notifs) == 3

        # Verify incoming EmailLogs fields
        l1 = logs[0]
        assert l1.direction == "incoming"
        assert l1.status == "received"
        assert l1.gmail_message_id in ["reply_msg_101", "reply_msg_102", "unrelated_msg_201"]

        # Test 4: Notification starts unread (is_read == False)
        for n in notifs:
            assert n.is_read is False

        unread_count = db.scalar(select(func.count(Notification.id)).where(Notification.is_read.is_(False)))
        assert unread_count == 3

        # Test 3: Re-syncing same Gmail message creates NO duplicates
        res_sync_2 = sync_incoming_replies(db)
        assert res_sync_2["success"] is True
        assert res_sync_2["new_notifications"] == 0

        notifs_after = db.scalars(select(Notification)).all()
        assert len(notifs_after) == 3

        # Test 5 & Test 6: Mark one notification read -> unread count decreases
        n1 = notifs[0]
        n1.is_read = True
        db.commit()

        unread_count_after_1 = db.scalar(select(func.count(Notification.id)).where(Notification.is_read.is_(False)))
        assert unread_count_after_1 == 2

        # Test 7: Mark all read -> unread count becomes 0
        for n in notifs:
            n.is_read = True
        db.commit()

        unread_count_after_all = db.scalar(select(func.count(Notification.id)).where(Notification.is_read.is_(False)))
        assert unread_count_after_all == 0


def test_invalid_oauth_token_handling(db):
    cand = Candidate(full_name="Broken Auth Candidate", email="broken@visaliv.com", cv_file_path="uploads/dummy.pdf", is_active=True)
    db.add(cand)
    db.commit()

    gmail_acc = GmailAccount(candidate_id=cand.id, gmail_email="broken@visaliv.com", refresh_token="invalid_token", is_active=True)
    db.add(gmail_acc)
    db.commit()

    with patch("app.services.gmail_sync_service.GmailService") as MockGmailService:
        mock_gs_inst = MagicMock()
        mock_gs_inst._get_credentials.side_effect = Exception("400: Google Gmail authentication failed")
        MockGmailService.return_value = mock_gs_inst

        # Test 11: Invalid/expired OAuth token returns success=False and logs REAUTH_REQUIRED error gracefully without crashing
        result = sync_incoming_replies(db)
        assert result["success"] is False
        assert len(result["account_errors"]) == 1
        assert result["account_errors"][0]["status"] == "REAUTH_REQUIRED"
        assert result["new_notifications"] == 0
