from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from gcs_utils import get_credentials
from google.cloud import storage
from config import SCOPES, CREDENTIALS_FILE, TOKEN_FILE, BUCKET_NAME, SUPABASE_GCSOBJECTS_ANON_KEY, SUPABASE_GCSOBJECTS_URL
from pydantic import BaseModel
from typing import Dict, Optional, List
from supabase import create_client
import math
from collections import OrderedDict

app = FastAPI()
client = create_client(SUPABASE_GCSOBJECTS_URL, SUPABASE_GCSOBJECTS_ANON_KEY)

# Enable CORS so your frontend can call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/files")
def get_files(page: int = 1, limit: int = 5, query: str = ""):
    if query:
        result = client.rpc("search_files", {
            "search_query": query,
            "page": page,
            "page_limit": limit
        }).execute()
        data = result.data or []
        total = data[0]["total_count"] if data else 0
        print(len(data))
    else:
        offset = (page - 1) * limit
        result = client.table("gcs_object") \
            .select("*", count="exact") \
            .order("updated_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        data = result.data
        total = result.count or 0

    return {
        "files": data,
        "page": page,
        "size": limit,
        "total": total,
        "pages": math.ceil((total or 1) / limit)
    }

class LockStatus(BaseModel):
    temporary_hold: bool
    hold_expiry: Optional[str] = None

class FileUpdate(BaseModel):
    filename: str
    metadata: Optional[Dict[str, str]] = None
    lockstatus: Optional[LockStatus] = None

@app.patch("/update-files-batch")
def update_files_batch(updates: List[FileUpdate]):
    creds = get_credentials(TOKEN_FILE=TOKEN_FILE, CREDENTIALS_FILE=CREDENTIALS_FILE, SCOPES=SCOPES)
    gcs_client = storage.Client(project="bucketdemoproject", credentials=creds)
    bucket = gcs_client.bucket("tempbucket24")
    print(updates)
    for update in updates:
        blob = bucket.blob(update.filename)
        blob.reload()
        print(update.filename)
        print(update.metadata)
        # 1. Update metadata if provided
        if update.metadata is not None:
            blob.metadata = update.metadata
            blob.patch()

        # 2. Update lock status if provided
        if update.lockstatus is not None:
            blob.temporary_hold = update.lockstatus.temporary_hold
            blob.patch()
        
        update_info = {}
        if update.lockstatus:
            update_info["temporary_hold"] = update.lockstatus.temporary_hold
            update_info["expiry_date"] = update.lockstatus.hold_expiry
        if update.metadata:
            update_info["metadata"] = update.metadata

        # ✅ Sync to Supabase
        result = client.table("gcs_object").update(update_info
        ).eq("name", update.filename).execute()


    return {"message": "✅ Batch metadata and lock update complete"}
