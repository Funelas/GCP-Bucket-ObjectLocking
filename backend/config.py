from dotenv import load_dotenv
import os 
from supabase import create_client, Client

load_dotenv()

SCOPES = os.getenv('SCOPES')
CREDENTIALS_FILE = os.getenv("CREDENTIALS_FILE")
TOKEN_FILE = os.getenv("TOKEN_FILE")
SUPABASE_URL= os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY= os.getenv("SUPABASE_ANON_KEY")
EXPIRY_JSON_URL = os.getenv("EXPIRY_JSON_URL")
EXPIRY_JSON_FILENAME = os.getenv("EXPIRY_JSON_FILENAME")
BUCKET_NAME = os.getenv("BUCKET_NAME")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

