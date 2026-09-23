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
                import json
                from google.cloud import storage
                from google.oauth2 import service_account

                gcs_json_env = os.environ.get("GCS_CREDENTIALS_JSON") or getattr(settings, "GCS_CREDENTIALS_JSON", None)
                gcs_file_env = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or getattr(settings, "GOOGLE_APPLICATION_CREDENTIALS", None)

                if gcs_json_env and gcs_json_env.strip().startswith("{"):
                    info = json.loads(gcs_json_env.strip())
                    creds = service_account.Credentials.from_service_account_info(info)
                    self._gcs_client = storage.Client(credentials=creds, project=info.get("project_id"))
                elif gcs_file_env and Path(gcs_file_env).exists():
                    self._gcs_client = storage.Client.from_service_account_json(gcs_file_env)
                else:
                    self._gcs_client = storage.Client()

                self._gcs_bucket = self._gcs_client.bucket(self.bucket_name)
                logger.info(f"Initialized StorageService with GCS bucket: '{self.bucket_name}'")
            except Exception as exc:
                logger.warning(f"Failed to initialize GCS client for bucket '{self.bucket_name}': {exc}")

    def normalize_path(self, relative_path: str) -> str:
        """Strip leading/trailing slashes and backslashes for clean object keys."""
        return (relative_path or "").strip().replace("\\", "/").lstrip("/")

    def upload_file(self, relative_path: str, data: bytes, content_type: Optional[str] = None) -> str:
        """Upload file bytes to persistent GCS storage (if configured) and save to local disk as fallback/cache."""
        clean_path = self.normalize_path(relative_path)
        if not clean_path:
            raise ValueError("Invalid relative path for upload")

        # 1. Save to local disk as local fallback/cache
        local_fp = PROJECT_ROOT / clean_path
        local_fp.parent.mkdir(parents=True, exist_ok=True)
        local_fp.write_bytes(data)

        # 2. Upload to persistent GCS bucket
        if self._gcs_bucket:
            try:
                blob = self._gcs_bucket.blob(clean_path)
                blob.upload_from_string(data, content_type=content_type)
                logger.info(f"[STORAGE UPLOAD SUCCESS] Saved {len(data)} bytes to GCS bucket '{self.bucket_name}' for key '{clean_path}'")
            except Exception as exc:
                err_msg = f"Persistent GCS upload failed for object key '{clean_path}' in bucket '{self.bucket_name}': {exc}"
                logger.error(f"[STORAGE UPLOAD ERROR] {err_msg}")
                raise RuntimeError(err_msg) from exc

        return clean_path

    def save_bytes(self, relative_path_or_data, data_or_path=None, content_type: Optional[str] = None) -> str:
        """Alias for upload_file to maintain backward compatibility across API routers."""
        if isinstance(relative_path_or_data, (bytes, bytearray)):
            data = relative_path_or_data
            relative_path = str(data_or_path)
        else:
            relative_path = str(relative_path_or_data)
            data = data_or_path
        return self.upload_file(relative_path, data, content_type=content_type)

    def get_storage_provider(self, relative_path: str) -> str:
        """Returns storage provider ('gcs', 'local_disk', or 'missing')."""
        clean_path = self.normalize_path(relative_path)
        if not clean_path:
            return "missing"

        if self._gcs_bucket:
            try:
                blob = self._gcs_bucket.blob(clean_path)
                if blob.exists():
                    return "gcs"
            except Exception:
                pass

        local_fp = PROJECT_ROOT / clean_path
        if local_fp.exists() and local_fp.is_file():
            return "local_disk"

        return "missing"

    def get_file_bytes(
        self,
        relative_path: str,
        candidate_id: Optional[int] = None,
        job_id: Optional[int] = None,
    ) -> bytes:
        """Retrieve file bytes from GCS bucket first, falling back to local disk storage with structured logging."""
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
                    logger.info(
                        "[STORAGE RESOLUTION SUCCESS] "
                        f"candidate_id={candidate_id or 'N/A'} job_id={job_id or 'N/A'} "
                        f"storage_key='{clean_path}' provider='gcs' "
                        f"exists=True file_size={len(data)} bytes"
                    )
                    return data
                else:
                    gcs_error = f"Object key '{clean_path}' does not exist in bucket '{self.bucket_name}'"
                    logger.warning(
                        "[STORAGE RESOLUTION GCS MISS] "
                        f"candidate_id={candidate_id or 'N/A'} job_id={job_id or 'N/A'} "
                        f"storage_key='{clean_path}' provider='gcs' "
                        f"exists=False error='{gcs_error}'"
                    )
            except Exception as exc:
                gcs_error = f"GCS download error: {exc}"
                logger.error(
                    "[STORAGE RESOLUTION GCS ERROR] "
                    f"candidate_id={candidate_id or 'N/A'} job_id={job_id or 'N/A'} "
                    f"storage_key='{clean_path}' provider='gcs' "
                    f"error='{gcs_error}'"
                )

        # 2. Fallback to local disk storage (for local development or migration)
        local_fp = PROJECT_ROOT / clean_path
        if local_fp.exists() and local_fp.is_file():
            try:
                data = local_fp.read_bytes()
                logger.info(
                    "[STORAGE RESOLUTION LOCAL FALLBACK] "
                    f"candidate_id={candidate_id or 'N/A'} job_id={job_id or 'N/A'} "
                    f"storage_key='{clean_path}' provider='local_disk' "
                    f"exists=True file_size={len(data)} bytes"
                )

                # Auto-migrate local file to GCS if GCS is active
                if self._gcs_bucket:
                    try:
                        blob = self._gcs_bucket.blob(clean_path)
                        blob.upload_from_string(data)
                        logger.info(f"[STORAGE AUTO-MIGRATE] Migrated local file '{clean_path}' to GCS bucket '{self.bucket_name}'")
                    except Exception as exc:
                        logger.warning(f"[STORAGE AUTO-MIGRATE FAILED] '{clean_path}': {exc}")

                return data
            except Exception as exc:
                logger.error(f"[STORAGE LOCAL READ ERROR] '{local_fp}': {exc}")

        # 3. Raise FileNotFoundError with detailed diagnostic log
        failure_msg = (
            f"[STORAGE RESOLUTION FAILURE] candidate_id={candidate_id or 'N/A'} job_id={job_id or 'N/A'} "
            f"storage_key='{clean_path}' exists=False "
            f"gcs_attempted={gcs_attempted} gcs_details='{gcs_error or 'bucket not configured'}'"
        )
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
