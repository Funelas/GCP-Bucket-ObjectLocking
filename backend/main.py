from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from gcs_utils import get_credentials, get_locked_file_with_generation, update_locked_file, update_blob_entry_in_locked_json
from google.cloud import storage
from config import SCOPES, CREDENTIALS_FILE, TOKEN_FILE, BUCKET_NAME
from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv
load_dotenv()
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
    query: str = "",
    bucket: str = "",
):
    
    try:
        # lock_blob always true
        creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
        gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
        bucket_name = bucket
        bucket = gcs_client.bucket(bucket_name)
        lock_blob, lock_generation = get_locked_file_with_generation(bucket)
    except:
        print("Goes Here")
        return {
        "files": [],
        "currentGeneration" : 0,
    }

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

    return {
        "files": filtered,
        "currentGeneration" : lock_generation,
    }

class LockStatus(BaseModel):
    temporary_hold: bool
    hold_expiry: Optional[str] = None  # ISO string like "2025-07-31"
class FileUpdate(BaseModel):
    filename: str
    metadata: Optional[Dict[str, str]] = None
    lockstatus: Optional[LockStatus] = None
class UpdateBatchPayload(BaseModel):
    updates: List[FileUpdate]


@app.patch("/update-files-batch")
def update_files_batch(new_data: UpdateBatchPayload, bucket: str = ""):
    print(new_data.updates)
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket_name = bucket
    bucket = gcs_client.bucket(bucket_name)

    # 🔁 Step 1: Load locked_objects.json
    latest_blob = bucket.get_blob(f'{bucket_name}_locked_objects.json')
    if not latest_blob:
        return
    # if str(new_data.currentGeneration) != str(latest_blob.generation):
    #     raise HTTPException(status_code= 409, detail= "Lock File Json Mismatch. Please refresh the page.")
    locked_map, _ = get_locked_file_with_generation(bucket)
    
    # 🧠 Step 2: Update each file individually
    for update in new_data.updates:
        filename = update.filename
        blob = bucket.get_blob(filename)
        if not blob:
            if filename in locked_map:
                del locked_map[filename] 
            continue
        blob.reload()
        now = datetime.now(timezone.utc)
        retain_until = now + timedelta(seconds=30)
        # 🔐 Lock update
        if update.lockstatus:
            blob.temporary_hold = update.lockstatus.temporary_hold
            blob.patch()
            expiry = update.lockstatus.hold_expiry
            expiry_dt = datetime.fromisoformat(expiry).replace(tzinfo=timezone.utc)
            

            # Determine retention time
            if expiry:
                if expiry_dt > now:
                    retain_until = expiry_dt
                else:
                    retain_until = now + timedelta(seconds=30)
            else:
                retain_until = now + timedelta(seconds=30)

            # Apply retention
            blob.retention.mode = "Unlocked"
            blob.retention.retain_until_time = retain_until

            blob.patch(override_unlocked_retention=True)
        # 📝 Metadata update
        if update.metadata or update.metadata == {}:
            blob.reload()
            blob.metadata = update.metadata
            blob.retention.mode = "Unlocked"
            blob.retention.retain_until_time = retain_until
            blob.update(override_unlocked_retention=True)
        # ✅ Update or remove entry in locked_map
        expiry_time = blob.retention.retain_until_time
        now_plus_30s = datetime.now(timezone.utc) + timedelta(seconds=30)
        if blob.temporary_hold or (expiry_time and expiry_time > now_plus_30s):
            locked_map[filename] = {
                "temporary_hold": blob.temporary_hold,
                "expiration_date": expiry_time.isoformat() if expiry_time else None,
                "metadata": blob.metadata or {},
                "updated_at": blob.updated.isoformat() if blob.updated else None,
                "metageneration": blob.metageneration
            }
        elif filename in locked_map:
            del locked_map[filename] 
            
  
    update_locked_file(bucket, locked_map, latest_blob.generation)


    return {"message": f"✅ Successfully updated {len(new_data.updates)} files"}



@app.get("/check-object-exists")
def check_object_exists(filename: str, bucket: str = ""):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket_name = bucket
    bucket = gcs_client.bucket(bucket_name)
    blob = bucket.get_blob(filename)
    
    if blob:
        return {"exists": True}
    return {"exists": False}

@app.get("/search-objects")
def search_objects(query : str = "", bucket: str = ""):
    try:
        bucket_name = bucket
        creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
        gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
        bucket = gcs_client.get_bucket(bucket_name)
        if bucket:
            return [blob.name for blob in bucket.list_blobs(match_glob= f"**{query}**")]
        return []
    except:
        return []

@app.get("/get-buckets")
def get_buckets():
    # If given credentials are for the whole project
    # project_id = "projectidstring"
    # creds = get_credentials(TOKEN_FILE = TOKEN_FILE, CREDENTIALS_FILE= CREDENTIALS_FILE, SCOPES= SCOPES)
    # client = storage.Client(project=project_id, credentials= creds)
    # buckets = client.list_buckets()

    # bucket_names = [bucket.name for bucket in buckets]
    # return {"buckets": bucket_names}
    bucket_names = [os.getenv(f"BUCKET{i}")for i in range(1,6)]
    return bucket_names 