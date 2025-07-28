import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.cloud import storage
import json
from typing import Optional
from datetime import datetime, timedelta, timezone

def get_credentials(TOKEN_FILE, CREDENTIALS_FILE, SCOPES):
    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)

    return creds

def list_gcs_objects(bucket_name, client):
    bucket = client.bucket(bucket_name)
    blobs = bucket.list_blobs()
    return {blob.name : {
        "temporary_hold": blob.temporary_hold, 
        "metadata": blob.metadata}
        for blob in blobs }

def update_blob_entry_in_locked_json(bucket, filename, blob):
    lock_blob = bucket.get_blob(f"{bucket.name}_locked_objects.json")
    generation = lock_blob.generation
    try:
        locked_data = json.loads(lock_blob.download_as_bytes())
    except Exception:
        locked_data = {}

    # Refresh blob metadata
    blob.reload()
    lock_blob.temporary_hold = False
    lock_blob.patch()
    
    locked_data[filename] = {
        "temporary_hold": blob.temporary_hold,
        "expiration_date": blob.retention_expiration_time.isoformat() if blob.retention_expiration_time else None,
        "metadata": blob.metadata or {},
        "updated_at": blob.updated.isoformat() if blob.updated else None,
        "metageneration": blob.metageneration,
    }

    # Write it back using generation check
    lock_blob.upload_from_string(
        json.dumps(locked_data, indent=2),
        content_type="application/json",
        if_generation_match=generation
    )
    lock_blob.temporary_hold = True
    lock_blob.patch()

def get_locked_file_with_generation(bucket):
    blob = bucket.get_blob(f"{bucket.name}_locked_objects.json")

    # If file already exists, just read and return, automatically gets the latest version
    if blob:
        blob.reload()
        data = blob.download_as_bytes()
        return json.loads(data), blob.generation

    # ⏳ File does not exist: scan all blobs to find locked ones
    now = datetime.now(timezone.utc) + timedelta(seconds=30)  # Expiry buffer
    locked_data = {}

    for b in bucket.list_blobs():
        b.reload()
        if "locked_objects" in b.name:
            continue
        is_locked = (
            b.temporary_hold is True or
            (b.retention_expiration_time and b.retention_expiration_time > now)
        )

        if is_locked:
            locked_data[b.name] = {
                "temporary_hold": b.temporary_hold,
                "expiration_date": b.retention_expiration_time.isoformat() if b.retention_expiration_time else None,
                "metadata": b.metadata or {},
                "updated_at": b.updated.isoformat() if b.updated else None,
                "metageneration": b.metageneration,
            }

    blob = bucket.blob(f"{bucket.name}_locked_objects.json")
    blob.temporary_hold = False
    blob.patch()
    try:
        blob.upload_from_string(
            json.dumps(locked_data, indent=2),
            content_type="application/json"
        )
    except Exception as e:
        print(e)
    blob.temporary_hold = True
    blob.patch()
    blob.reload()

    return locked_data, blob.generation


def update_locked_file(bucket, new_data: dict):
    blob = bucket.blob(f"{bucket.name}_locked_objects.json")

    # 1. Release temporary hold (and commit it)
    blob.temporary_hold = False
    blob.patch()

    # 2. Upload updated content (with generation check)
    blob.upload_from_string(
        json.dumps(new_data, indent=2),
        content_type="application/json"
    )

    # 3. Reapply temporary hold (optional)
    blob.temporary_hold = True
    blob.patch()



