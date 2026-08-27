import logging
import os
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOCAL_UPLOADS_DIR = PROJECT_ROOT / "uploads"
LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class StorageService:
    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket_name = bucket_name or getattr(settings, "GCS_BUCKET_NAME", None) or os.environ.get("GCS_BUCKET_NAME")
        self._gcs_client = None
        self._gcs_bucket = None

        if self.bucket_name:
            try:
                from google.cloud import storage

                self._gcs_client = storage.Client()
                self._gcs_bucket = self._gcs_client.bucket(self.bucket_name)
                logger.info(f"Initialized StorageService with GCS bucket: '{self.bucket_name}'")
            except Exception as exc:
                logger.warning(f"Failed to initialize GCS client for bucket '{self.bucket_name}': {exc}")

    def normalize_path(self, relative_path: str) -> str:
        """Strip leading/trailing slashes and backslashes for clean object keys."""
        return (relative_path or "").strip().replace("\\", "/").lstrip("/")

    def upload_file(self, relative_path: str, data: bytes, content_type: Optional[str] = None) -> str:
        """Upload file bytes to GCS bucket (if configured) and save to local disk as fallback."""
        clean_path = self.normalize_path(relative_path)
        if not clean_path:
            raise ValueError("Invalid relative path for upload")

        # 1. Local disk write
        local_fp = PROJECT_ROOT / clean_path
        local_fp.parent.mkdir(parents=True, exist_ok=True)
        local_fp.write_bytes(data)

        # 2. GCS bucket upload
        if self._gcs_bucket:
            try:
                blob = self._gcs_bucket.blob(clean_path)
                blob.upload_from_string(data, content_type=content_type)
                logger.info(f"Uploaded {len(data)} bytes to GCS bucket '{self.bucket_name}' at object key '{clean_path}'")
            except Exception as exc:
                logger.error(f"GCS upload failed for object key '{clean_path}' in bucket '{self.bucket_name}': {exc}")

        return clean_path

    def get_file_bytes(self, relative_path: str) -> bytes:
        """Retrieve file bytes from GCS bucket first, falling back to local disk storage."""
        clean_path = self.normalize_path(relative_path)
        if not clean_path:
            raise FileNotFoundError("Empty attachment path provided")

        gcs_attempted = False
        gcs_error = None

        # 1. Attempt retrieval from GCS bucket if configured
        if self._gcs_bucket:
            gcs_attempted = True
            try:
                blob = self._gcs_bucket.blob(clean_path)
                if blob.exists():
                    data = blob.download_as_bytes()
                    logger.info(f"Successfully retrieved {len(data)} bytes from GCS bucket '{self.bucket_name}' for key '{clean_path}'")
                    return data
                else:
                    gcs_error = f"Object key '{clean_path}' does not exist in bucket '{self.bucket_name}'"
                    logger.warning(gcs_error)
            except Exception as exc:
                gcs_error = f"GCS download error: {exc}"
                logger.error(f"Failed retrieving object key '{clean_path}' from GCS bucket '{self.bucket_name}': {exc}")

        # 2. Fallback to local disk storage (for local development or migration)
        local_fp = PROJECT_ROOT / clean_path
        if local_fp.exists() and local_fp.is_file():
            try:
                data = local_fp.read_bytes()
                logger.info(f"Retrieved {len(data)} bytes from local disk at '{local_fp}' for key '{clean_path}'")

                # If GCS bucket is active but file was missing from GCS, auto-migrate file to GCS
                if self._gcs_bucket:
                    try:
                        blob = self._gcs_bucket.blob(clean_path)
                        blob.upload_from_string(data)
                        logger.info(f"Auto-migrated local file '{clean_path}' to GCS bucket '{self.bucket_name}'")
                    except Exception as exc:
                        logger.warning(f"Failed auto-migrating local file '{clean_path}' to GCS: {exc}")

                return data
            except Exception as exc:
                logger.error(f"Local disk read error for '{local_fp}': {exc}")

        # 3. Raise FileNotFoundError with detailed diagnostic log
        failure_msg = f"Attachment file not found: {clean_path} (GCS attempted: {gcs_attempted}, GCS details: {gcs_error or 'bucket not configured'})"
        logger.error(failure_msg)
        raise FileNotFoundError(f"Attachment file not found: {clean_path}")

    def file_exists(self, relative_path: str) -> bool:
        """Check if file exists in GCS bucket or local disk."""
        clean_path = self.normalize_path(relative_path)
        if not clean_path:
            return False

        if self._gcs_bucket:
            try:
                blob = self._gcs_bucket.blob(clean_path)
                if blob.exists():
                    return True
            except Exception as exc:
                logger.warning(f"Error checking blob existence in GCS for '{clean_path}': {exc}")

        local_fp = PROJECT_ROOT / clean_path
        return local_fp.exists() and local_fp.is_file()


# Singleton instance
storage_service = StorageService()
