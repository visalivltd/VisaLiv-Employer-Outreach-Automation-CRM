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
from app.api.v1.dashboard import get_dashboard


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    yield session
    session.close()


def test_email_sync_and_thread_matching(db):
    # Setup Candidate & Connected Account
    cand = Candidate(full_name="Simi Mathew", email="simi@visaliv.com", cv_file_path="uploads/simi_cv.pdf", is_active=True)
    db.add(cand)
    db.commit()

    gmail_acc = GmailAccount(candidate_id=cand.id, gmail_email="simi@visaliv.com", refresh_token="valid_token_123", is_active=True)
    db.add(gmail_acc)

    emp = Employer(service_name="Care Quality Commission", email="partner.employer@visaliv.com", is_active=True)
    db.add(emp)
    db.commit()

    # Outgoing Email Log in CRM
    outgoing_log = EmailLog(
        candidate_id=cand.id,
        employer_id=emp.id,
        gmail_account_id=gmail_acc.id,
        subject="Application for Registered Nurse Position",
        status="sent",
        direction="outgoing",
        gmail_message_id="out_msg_999",
    )
    db.add(outgoing_log)
    db.commit()

    # Check dashboard received count BEFORE sync
    dash_before = get_dashboard(db)
    assert dash_before["total_emails_received"] == 0

    mock_messages_list = {
        "messages": [
            {"id": "reply_msg_001", "threadId": "out_msg_999"},
        ]
    }

    mock_msg_details = {
        "reply_msg_001": {
            "snippet": "We have reviewed your application and would like to schedule an interview.",
            "payload": {
                "headers": [
                    {"name": "From", "value": "Care Quality Commission <partner.employer@visaliv.com>"},
                    {"name": "To", "value": "simi@visaliv.com"},
                    {"name": "Subject", "value": "Re: Application for Registered Nurse Position"},
                    {"name": "In-Reply-To", "value": "<out_msg_999>"},
                ]
            },
        }
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

        # Perform sync
        res = sync_incoming_replies(db)
        assert res["success"] is True
        assert res["new_replies_found"] == 1

        # Check EmailLog created
        logs = db.scalars(select(EmailLog).where(EmailLog.direction == "incoming")).all()
        assert len(logs) == 1
        assert logs[0].candidate_id == cand.id
        assert logs[0].employer_id == emp.id
        assert logs[0].gmail_message_id == "reply_msg_001"
        assert logs[0].status == "received"

        # Check Notification created
        notifs = db.scalars(select(Notification)).all()
        assert len(notifs) == 1
        assert notifs[0].candidate_id == cand.id
        assert notifs[0].employer_id == emp.id
        assert notifs[0].is_read is False

        # Dashboard KPI received count AFTER sync
        dash_after = get_dashboard(db)
        assert dash_after["total_emails_received"] == 1

        # Re-run sync (Deduplication Check)
        res_resync = sync_incoming_replies(db)
        assert res_resync["success"] is True
        assert res_resync["new_replies_found"] == 0
        assert res_resync["duplicates_skipped"] == 1

        # Counts remain 1 (no duplicate creation)
        logs_after = db.scalars(select(EmailLog).where(EmailLog.direction == "incoming")).all()
        assert len(logs_after) == 1


def test_existing_thread_multiple_incoming_messages(db):
    cand = Candidate(full_name="Rosily Vincent", email="rosily.vincent7@gmail.com", cv_file_path="uploads/rosily.pdf", is_active=True)
    db.add(cand)
    db.commit()

    gmail_acc = GmailAccount(candidate_id=cand.id, gmail_email="rosily.vincent7@gmail.com", refresh_token="token_rosily", is_active=True)
    db.add(gmail_acc)

    emp = Employer(service_name="VisaLiv Partner Employer", email="partner.employer@visaliv.com", is_active=True)
    db.add(emp)
    db.commit()

    # Outgoing Application Message
    out_log = EmailLog(
        candidate_id=cand.id,
        employer_id=emp.id,
        gmail_account_id=gmail_acc.id,
        subject="Application for Nurse Position",
        status="sent",
        direction="outgoing",
        gmail_message_id="out_msg_100",
    )
    # First Incoming Reply
    inc_log_1 = EmailLog(
        candidate_id=cand.id,
        employer_id=emp.id,
        gmail_account_id=gmail_acc.id,
        subject="Re: Application for Nurse Position",
        status="received",
        direction="incoming",
        gmail_message_id="inc_msg_101",
    )
    db.add_all([out_log, inc_log_1])
    db.commit()

    # Existing logs before second reply sync: 2 (1 outgoing, 1 incoming)
    assert len(db.scalars(select(EmailLog)).all()) == 2

    # Second incoming reply arrives in SAME thread (thread_100)
    mock_messages_list = {
        "messages": [
            {"id": "thread_100", "threadId": "thread_100"},
        ]
    }

    mock_msg_details = {
        "inc_msg_101": {
            "snippet": "First reply: Hi, we received your application.",
            "payload": {
                "headers": [
                    {"name": "From", "value": "partner.employer@visaliv.com"},
                    {"name": "Subject", "value": "Re: Application for Nurse Position"},
                ]
            },
        },
        "inc_msg_102": {
            "snippet": "Second reply: Could you attend an interview tomorrow at 10 AM?",
            "payload": {
                "headers": [
                    {"name": "From", "value": "recruitment@visaliv.com"},
                    {"name": "Subject", "value": "Re: Application for Nurse Position"},
                    {"name": "In-Reply-To", "value": "<inc_msg_101>"},
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

        # Sync 1: Processes newly arrived msg_102
        res = sync_incoming_replies(db)
        assert res["success"] is True
        assert res["new_messages"] == 1
        assert res["incoming_messages"] == 1
        assert res["duplicates_skipped"] == 1

        # Check total logs for thread: 3 logs total (1 outgoing, 2 incoming)
        all_logs = db.scalars(select(EmailLog).order_by(EmailLog.id.asc())).all()
        assert len(all_logs) == 3

        inc_logs = db.scalars(select(EmailLog).where(EmailLog.direction == "incoming")).all()
        assert len(inc_logs) == 2
        assert inc_logs[0].gmail_message_id == "inc_msg_101"
        assert inc_logs[1].gmail_message_id == "inc_msg_102"
        assert inc_logs[1].candidate_id == cand.id
        assert inc_logs[1].employer_id == emp.id
        assert inc_logs[1].error_message is None

        # Re-run sync: deduplication skips all 3 messages
        res_resync = sync_incoming_replies(db)
        assert res_resync["success"] is True
        assert res_resync["new_messages"] == 0
        assert res_resync["duplicates_skipped"] == 2
        assert len(db.scalars(select(EmailLog)).all()) == 3

