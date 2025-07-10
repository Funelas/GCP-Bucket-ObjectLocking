from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from gcs_utils import list_gcs_objects, get_credentials
from google.cloud import storage
from config import SCOPES, CREDENTIALS_FILE, TOKEN_FILE, EXPIRY_JSON_URL, SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET_NAME, EXPIRY_JSON_FILENAME
from pydantic import BaseModel
from typing import Dict, Optional
from dotenv import load_dotenv
from supabase import create_client
import requests
import json
from collections import OrderedDict
from io import BytesIO
app = FastAPI()
load_dotenv()


# Enable CORS so your frontend can call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",  # allow all origins for dev (including localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/files")
def get_files():
    """
    Returns a list of object names from your GCS bucket.
    """
    creds = get_credentials(TOKEN_FILE= TOKEN_FILE, CREDENTIALS_FILE= CREDENTIALS_FILE, SCOPES = SCOPES)
    client = storage.Client(project="bucketdemoproject", credentials=creds)
    return list_gcs_objects("tempbucket24", client)

class MetadataUpdate(BaseModel):
    filename: str
    metadata: Dict[str, str]

@app.patch("/update-metadata")
def update_metadata(update: MetadataUpdate):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = client.bucket("tempbucket24")
    blob = bucket.blob(update.filename)
    blob.reload()
    # Step 1: Clear existing metadata
    blob.metadata = {}
    blob.update()

    # Step 2: Apply new metadata
    blob.metadata = OrderedDict(update.metadata)
    print(blob.metadata)
    blob.update()
    print(blob.metadata)
    return {"message": f"Metadata updated for {update.filename}"}

class LockStatus(BaseModel):
    temporary_hold: bool
    hold_expiry: Optional[str] = None

class ObjectLock(BaseModel):
    filename: str
    lockstatus: LockStatus

# Supabase client

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def update_expiry_json(filename: str, hold_expiry: str):
    try:
        # Try to download the existing JSON file
        response = supabase.storage.from_(BUCKET_NAME).download(EXPIRY_JSON_FILENAME)
        json_data = json.loads(response.decode())
    except Exception:
        # If file doesn't exist or is invalid, start fresh
        json_data = {}

    # ✅ Each file is its own key
    # If hold_expiry == None
    if not hold_expiry:
        json_data.pop(filename, None)
    else:
        json_data[filename] = hold_expiry

    # Convert dict to JSON bytes
    json_bytes = json.dumps(json_data, indent=2).encode("utf-8")
    print(json_data)
    # Upload the updated JSON to Supabase
    supabase.storage.from_(BUCKET_NAME).upload(
        EXPIRY_JSON_FILENAME,
        json_bytes,
        {
            "content-type": "application/json",
            "x-upsert": "true"
        }
    )



@app.patch("/update-lock")
def update_lock(file: ObjectLock):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = client.bucket("tempbucket24")
    blob = bucket.blob(file.filename)
    
    blob.reload()

    # ✅ Apply temporary hold
    blob.temporary_hold = file.lockstatus.temporary_hold
    blob.patch()
    print(file.lockstatus)


    
    update_expiry_json(file.filename, file.lockstatus.hold_expiry)

    return {"message": f"Lock updated for {file.filename}"}

@app.get("/expiry-locks")
def get_expiry_locks():
    try:
        response = supabase.storage.from_(BUCKET_NAME).download(EXPIRY_JSON_FILENAME)
        data = json.loads(response.decode())
        return data
    except Exception as e:
        print("❌ Error reading expiry.json:", e)
        return {}


