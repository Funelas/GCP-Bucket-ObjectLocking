import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.cloud import storage

# -----------------------🔐 PART 1: LOGIN + DISPLAY -----------------------



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



# -----------------------🛠️ PART 2: MODIFY OBJECTS -----------------------

# 👆 Upload a file
# def upload_to_bucket(bucket_name, source_file_path, destination_blob_name, client):
#     bucket = client.bucket(bucket_name)
#     blob = bucket.blob(destination_blob_name)
#     blob.upload_from_filename(source_file_path)
#     print(f"✅ Uploaded '{source_file_path}' to 'gs://{bucket_name}/{destination_blob_name}'")

# 🖑️ Delete a file
# def delete_blob(bucket_name, blob_name, client):
#     bucket = client.bucket(bucket_name)
#     blob = bucket.blob(blob_name)
#     blob.delete()
#     print(f"🖑️ Deleted blob '{blob_name}' from bucket '{bucket_name}'")

# 🕵️ View all attributes of a blob
# def print_blob_attributes(bucket_name, blob_name, client):
#     bucket = client.bucket(bucket_name)
#     blob = bucket.get_blob(blob_name)

#     if blob is None:
#         print(f"❌ Blob '{blob_name}' not found in bucket '{bucket_name}'")
#         return

#     print(f"\n📦 All attributes of blob '{blob_name}':")
#     for attr in dir(blob):
#         if not attr.startswith("_") and not callable(getattr(blob, attr)):
#             try:
#                 value = getattr(blob, attr)
#                 print(f"{attr}: {value}")
#             except Exception as e:
#                 print(f"{attr}: ⚠️ Error reading this attribute ({e})")

# -----------------------🔒 PART 3: CLEANUP + SECURITY -----------------------

# 🩼 Optional: Clear credentials/token if needed (for logout)
# def clear_credentials():
#     if os.path.exists(TOKEN_FILE):
#         os.remove(TOKEN_FILE)
#         print("🩹 Removed saved token. You'll need to log in again next time.")
