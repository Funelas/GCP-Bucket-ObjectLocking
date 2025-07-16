from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from gcs_utils import get_credentials, get_locked_file_with_generation, update_locked_file, update_blob_entry_in_locked_json
from google.cloud import storage
from config import SCOPES, CREDENTIALS_FILE, TOKEN_FILE, BUCKET_NAME
from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime, timezone, timedelta
import math
import json
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/files")
def get_files(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1),
    query: str = ""
):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = gcs_client.bucket(BUCKET_NAME)
    # 🔁 Load locked_objects.json
    try:
        # lock_blob always true
        lock_blob, _ = get_locked_file_with_generation(bucket)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading lock file: {str(e)}")

    # 🔍 Apply filtering based on filename or metadata
    query = query.lower()
    filtered = []
    for filename, info in lock_blob.items():
        if not isinstance(info, dict):
            continue

        # Combine all searchable fields
        searchable = [filename] + list(info.get("metadata", {}).keys()) + list(info.get("metadata", {}).values())
        searchable = [str(x).lower() for x in searchable]

        if any(query in item for item in searchable):
            filtered.append({
                "name": filename,
                "temporary_hold": info.get("temporary_hold", False),
                "expiration_date": info.get("expiration_date"),
                "metadata": info.get("metadata", {}),
                "updated_at": info.get("updated_at")
            })
    # 📄 Apply pagination
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    paginated_files = filtered[start:end]

    return {
        "files": paginated_files,
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
def update_files_batch(updates: List[FileUpdate] = Body(...)):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = gcs_client.bucket(BUCKET_NAME)

    # 🔁 Step 1: Load locked_objects.json + its generation
    locked_map, lockfile_generation = get_locked_file_with_generation(bucket)

    # 🧠 Step 2: Update each file individually
    for update in updates:
        filename = update.filename
        blob = bucket.blob(filename)
        blob.reload()

        # 🔒 Check generation match
        existing_lock = locked_map.get(filename)
        print(blob.name)
        print(existing_lock)
        print(blob.generation)
        if existing_lock and str(blob.generation) != str(existing_lock.get("generation")):
            
            try:
                update_blob_entry_in_locked_json(bucket, blob.name, blob)
            except Exception as e:
                print(f"Failed to update stale lock entry for {filename}:", e)
            raise HTTPException(status_code=409, detail=f"Conflict: {filename} has outdated generation. Please refresh.")

        # 📝 Metadata update
        if update.metadata:
            blob.metadata = update.metadata
            blob.patch()

        # 🔐 Lock update
        if update.lockstatus:
            blob.temporary_hold = update.lockstatus.temporary_hold
            blob.patch()

            expiry = update.lockstatus.hold_expiry
            if expiry:
                blob.retention.mode = "Unlocked"
                blob.retention.retain_until_time = datetime.fromisoformat(expiry).replace(tzinfo=timezone.utc)
            else:
                blob.retention.mode = "Unlocked"
                blob.retention.retain_until_time = datetime.now(timezone.utc) + timedelta(seconds=10)

            blob.patch(override_unlocked_retention=True)

        # 🧾 Update locked_map
        locked_map[filename] = {
            "temporary_hold": blob.temporary_hold,
            "expiration_date": blob.retention_expiration_time.isoformat() if blob.retention_expiration_time else None,
            "metadata": blob.metadata or {},
            "updated_at": blob.updated.isoformat() if blob.updated else None,
            "generation": blob.generation
        }

    # 💾 Step 3: Upload the updated lockfile
    try:
        update_locked_file(bucket, locked_map, generation=lockfile_generation)
    except Exception as e:
        print("🔴 Error updating locked_objects.json:", e)
        raise HTTPException(status_code=409, detail="Conflict: Lock file has changed. Please refresh.")

    return {"message": f"✅ Successfully updated {len(updates)} files"}

@app.get("/check-object-exists")
def check_object_exists(filename: str):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = gcs_client.bucket(BUCKET_NAME)
    blob = bucket.get_blob(filename)
    
    if blob:
        return {"exists": True}
    return {"exists": False}

