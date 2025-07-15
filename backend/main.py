from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from gcs_utils import get_credentials
from google.cloud import storage
from config import SCOPES, CREDENTIALS_FILE, TOKEN_FILE, BUCKET_NAME
from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime, timezone, timedelta
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/files")
def get_files(page: int = 1, limit: int = 5, query: str = ""):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = gcs_client.bucket(BUCKET_NAME)

    # Easier Filtering Using match_glob but only limited to object name
    blobs = list(bucket.list_blobs())
    
    start = (page - 1) * limit
    end = start + limit
    filtered_data = []
    for blob in blobs:
        metadata = blob.metadata or {}
        expiry_cutoff = datetime.now(timezone.utc) + timedelta(seconds=10)
        if blob.temporary_hold is True or (
                blob.retention.retain_until_time is not None and
                blob.retention.retain_until_time > expiry_cutoff
            ):
            if any(query in word for word in [blob.name] + list(metadata.keys()) + list(metadata.values())):
                blob.reload()
                filtered_data.append({
                    "name": blob.name,
                    "temporary_hold": blob.temporary_hold,
                    "expiration_date": blob.retention_expiration_time.isoformat() if blob.retention_expiration_time else None,
                    "metadata": blob.metadata or {},
                    "updated_at": blob.updated.isoformat() if blob.updated else None
                })
    total = len(filtered_data)
    paginated_blobs = filtered_data[start:end]
    return {
        "files": paginated_blobs,
        "page": page,
        "size": limit,
        "total": total,
        "pages": math.ceil((total or 1) / limit)
    }

class LockStatus(BaseModel):
    temporary_hold: bool
    hold_expiry: Optional[str] = None  # ISO string like "2025-07-31"

class FileUpdate(BaseModel):
    filename: str
    metadata: Optional[Dict[str, str]] = None
    lockstatus: Optional[LockStatus] = None

@app.patch("/update-files-batch")
def update_files_batch(updates: List[FileUpdate]):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = gcs_client.bucket(BUCKET_NAME)
    for update in updates:
        blob = bucket.blob(update.filename)
        blob.reload()
        if update.metadata is not None:
            blob.metadata = update.metadata
            blob.patch()

        if update.lockstatus:
            blob.temporary_hold = update.lockstatus.temporary_hold
            blob.patch()

            if update.lockstatus.hold_expiry:
                blob.retention.mode = "Unlocked"
                expiry_dt = datetime.fromisoformat(update.lockstatus.hold_expiry).replace(tzinfo=timezone.utc)
                blob.retention.retain_until_time = expiry_dt
                blob.patch(override_unlocked_retention=True)
                print("Saved Retention Time")
            else:
                blob.retention.mode = "Unlocked"
                new_time = datetime.now(timezone.utc) + timedelta(seconds= 10)
                blob.retention.retain_until_time = new_time
                blob.patch(override_unlocked_retention=True)
            

    return {"message": "✅ Batch metadata and lock update complete"}

@app.get("/check-object-exists")
def check_object_exists(filename: str):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = gcs_client.bucket(BUCKET_NAME)
    blob = bucket.get_blob(filename)
    
    if blob:
        return {"exists": True}
    return {"exists": False}

