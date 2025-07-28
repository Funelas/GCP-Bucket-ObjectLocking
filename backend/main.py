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
class BucketUpdate(BaseModel):
    name: str
    updates: List[FileUpdate]

class AllBucketsPayload(BaseModel):
    buckets: List[BucketUpdate]


@app.patch("/update-all-buckets")
def update_all_buckets(data: AllBucketsPayload):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)

    total_files_updated = 0

    for bucket_entry in data.buckets:
        bucket_name = bucket_entry.name
        updates = bucket_entry.updates
        print(f"Updates : {updates}")
        try:
            bucket = gcs_client.get_bucket(bucket_or_name= bucket_name)
        except:
            continue
        locked_map, _ = get_locked_file_with_generation(bucket)

        now = datetime.now(timezone.utc)
        for update in updates:
            filename = update.filename
            blob = bucket.get_blob(filename)

            if not blob:
                if filename in locked_map:
                    del locked_map[filename]
                continue

            blob.reload()
            retain_until = now + timedelta(seconds=30) 

            # 🔐 Lock update
            if update.lockstatus:
                blob.temporary_hold = update.lockstatus.temporary_hold
                blob.patch()

                expiry = update.lockstatus.hold_expiry
                if expiry:
                    expiry_dt = datetime.fromisoformat(expiry).replace(tzinfo=timezone.utc)
                    if expiry_dt > now:
                        retain_until = expiry_dt

                blob.retention.mode = "Unlocked"
                blob.retention.retain_until_time = retain_until
                blob.patch(override_unlocked_retention=True)

            # 📝 Metadata update
            if update.metadata or update.metadata == {}:
                blob.reload()
                blob.metadata = update.metadata
                blob.retention.mode = "Unlocked"
                blob.retention.retain_until_time = retain_until if blob.retention.retain_until_time < retain_until else blob.retention.retain_until_time
                blob.update(override_unlocked_retention=True)

            # 🔁 Update locked_map
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

            total_files_updated += 1

        # 📝 Save updated locked_objects.json for this bucket
        update_locked_file(bucket, locked_map)

    return {"message": f"✅ Successfully updated {total_files_updated} files across {len(data.buckets)} buckets"}




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


class SearchRequest(BaseModel):
    query: str
    buckets: List[str]

@app.post("/search-objects")
def search_objects(req: SearchRequest):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    client = storage.Client(project="bucketdemoproject", credentials=creds)

    all_results = {}

    for bucket_name in req.buckets:
        try:
            bucket = client.bucket(bucket_name)
            matching = [blob.name for blob in bucket.list_blobs(match_glob= f"**{req.query}**")]
        
            if matching:
                all_results[bucket_name] = matching

        except:
            continue

    return all_results

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