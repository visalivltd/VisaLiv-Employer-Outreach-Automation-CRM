import os
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.services.storage_service import StorageService, storage_service
from app.services.gmail_service import GmailService


def test_gcs_upload_and_retrieval_mocked():
    """Test upload and retrieval via GCS abstraction using mocked GCS client."""
    mock_blob = MagicMock()
    mock_blob.exists.return_value = True
    mock_blob.download_as_bytes.return_value = b"%PDF-1.5 GCS Persistent Content"

    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    service = StorageService(bucket_name="test-visaliv-bucket")
    service._gcs_bucket = mock_bucket

    # A. Test Upload
    rel_path = "uploads/cv/test_resume_123.pdf"
    uploaded_key = service.upload_file(rel_path, b"%PDF-1.5 GCS Persistent Content")
    assert uploaded_key == "uploads/cv/test_resume_123.pdf"
    mock_bucket.blob.assert_called_with("uploads/cv/test_resume_123.pdf")
    mock_blob.upload_from_string.assert_called_once()

    # B. Test Retrieval
    retrieved_bytes = service.get_file_bytes("uploads/cv/test_resume_123.pdf")
    assert retrieved_bytes == b"%PDF-1.5 GCS Persistent Content"


def test_draft_attachment_gcs_retrieval_mocked():
    """Test email draft attachment retrieval via GCS abstraction."""
    mock_blob = MagicMock()
    mock_blob.exists.return_value = True
    mock_blob.download_as_bytes.return_value = b"DOCX Draft Binary Attachment Data"

    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    service = StorageService(bucket_name="test-visaliv-bucket")
    service._gcs_bucket = mock_bucket

    draft_rel_path = "uploads/drafts/sample_draft_99.docx"
    bytes_result = service.get_file_bytes(draft_rel_path)
    assert bytes_result == b"DOCX Draft Binary Attachment Data"


def test_missing_gcs_object_raises_file_not_found():
    """Test missing GCS object throws proper FileNotFoundError when not on disk."""
    mock_blob = MagicMock()
    mock_blob.exists.return_value = False

    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    service = StorageService(bucket_name="test-visaliv-bucket")
    service._gcs_bucket = mock_bucket

    with pytest.raises(FileNotFoundError) as exc_info:
        service.get_file_bytes("uploads/missing_file_999.pdf")

    assert "missing_file_999.pdf" in str(exc_info.value)


def test_local_path_fallback_in_development():
    """Test existing local disk file fallback when GCS bucket is unconfigured or blob is missing."""
    service = StorageService(bucket_name=None)
    service._gcs_bucket = None

    # Write temporary file to local disk
    local_rel = "uploads/test_fallback_dev.pdf"
    full_local_fp = Path(__file__).resolve().parent / local_rel
    full_local_fp.parent.mkdir(parents=True, exist_ok=True)
    full_local_fp.write_bytes(b"Local Dev Disk Bytes")

    try:
        retrieved = service.get_file_bytes(local_rel)
        assert retrieved == b"Local Dev Disk Bytes"
    finally:
        if full_local_fp.exists():
            full_local_fp.unlink()


def test_regression_cloud_run_missing_local_file_resolution():
    """
    CRITICAL REGRESSION TEST:
    Specifically reproduces the current Cloud Run production failure path:
    uploads/031ce2ed03944c069894f18776c22c4c.pdf
    Verifies that GmailService attachment resolver fetches bytes from GCS even if
    the file is missing on Cloud Run local container filesystem.
    """
    target_path = "uploads/031ce2ed03944c069894f18776c22c4c.pdf"

    # Ensure file DOES NOT exist on local filesystem
    local_path = Path(__file__).resolve().parent / target_path
    if local_path.exists():
        local_path.unlink()

    mock_gcs_bytes = b"%PDF-1.4 Cloud Run Production GCS Resume Bytes"

    with patch.object(storage_service, "get_file_bytes", return_value=mock_gcs_bytes) as mock_get_bytes:
        gmail_account = MagicMock()
        gmail_account.access_token = "fake_access_token"
        gmail_account.refresh_token = "fake_refresh_token"

        service = GmailService(gmail_account)
        mock_creds = MagicMock()
        mock_creds.universe_domain = "googleapis.com"

        mock_resp = MagicMock()
        mock_resp.status = 200

        mock_http = MagicMock()
        mock_http.request.return_value = (mock_resp, b'{"id": "msg_12345"}')
        mock_http.credentials.universe_domain = "googleapis.com"
        mock_creds.create_scoped.return_value.authorize.return_value = mock_http

        with patch.object(service, "_get_credentials", return_value=mock_creds):
            msg_id = service.send_email(
                to_email="test@employer.com",
                subject="Regression Test",
                body="Body",
                attachment_paths=[target_path],
            )

            assert msg_id == "msg_12345"

        mock_get_bytes.assert_called_with(target_path)
