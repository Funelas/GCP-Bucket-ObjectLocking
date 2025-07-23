from dotenv import load_dotenv
import os 


load_dotenv()

SCOPES = os.getenv('SCOPES')
CREDENTIALS_FILE = os.getenv("CREDENTIALS_FILE")
TOKEN_FILE = os.getenv("TOKEN_FILE")
EXPIRY_JSON_URL = os.getenv("EXPIRY_JSON_URL")
EXPIRY_JSON_FILENAME = os.getenv("EXPIRY_JSON_FILENAME")
BUCKET_NAME = os.getenv("BUCKET_NAME")


