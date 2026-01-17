import os
import typesense
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_system_secrets():
    """Fetches API Keys from the Admin-controlled database table."""
    try:
        response = supabase.table("system_settings").select("*").execute()
        secrets = {item['key']: item['value'] for item in response.data}
        return secrets
    except Exception as e:
        print(f"Error fetching secrets: {e}")
        return {}

def wipe_index():
    print("Starting Typesense Wipe...")
    secrets = get_system_secrets()
    typesense_key = secrets.get("TYPESENSE_API_KEY")
    typesense_host = secrets.get("TYPESENSE_HOST", "wg7oleaiq5cfpjz3p-1.a1.typesense.net")

    if not typesense_key:
        print("Error: TYPESENSE_API_KEY not found in Supabase system_settings.")
        return

    client = typesense.Client({
        'nodes': [{'host': typesense_host, 'port': '443', 'protocol': 'https'}],
        'api_key': typesense_key,
        'connection_timeout_seconds': 15
    })

    collection_name = "text_knowledge_base"

    try:
        print(f"Connecting to Typesense at {typesense_host}...")
        client.collections[collection_name].delete()
        print(f"Successfully deleted collection: {collection_name}")
        print("The search index is now empty. New uploads will be strictly private.")
    except Exception as e:
        if "not found" in str(e).lower():
            print(f"Collection '{collection_name}' does not exist. Higher safety achieved.")
        else:
            print(f"Error deleting collection: {e}")

if __name__ == "__main__":
    wipe_index()
