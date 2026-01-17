import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from supabase import create_client, Client
from PyPDF2 import PdfReader
import datetime
import typesense

# LangChain Imports
from langchain_groq import ChatGroq
from gradio_client import Client as GradioClient
from langchain_core.embeddings import Embeddings
from langchain_community.vectorstores import Typesense
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import StructuredTool
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_classic.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter

# --- CONFIGURATION ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in Render Environment Variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# --- REMOTE EMBEDDING CLASS ---
class RemoteEmbeddings(Embeddings):
    """Calls your specialized Hugging Face Space for embeddings."""
    def __init__(self, space_url: str):
        self.client = GradioClient(space_url)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Remote call to the Gradio API
        result = self.client.predict(texts, api_name="/predict")
        return result

    def embed_query(self, text: str) -> List[float]:
        result = self.client.predict([text], api_name="/predict")
        return result[0]

# Initialize Remote Embeddings
# You will set HF_SPACE_URL in your Supabase 'system_settings' or Render Env
HF_SPACE_URL = os.environ.get("HF_SPACE_URL", "jeyanthangj2004/docmind-embeddings") 
embeddings = RemoteEmbeddings(HF_SPACE_URL)

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INPUT MODEL ---
class ChatRequest(BaseModel):
    query: str
    session_id: str
    user_id: str
    model_name: str
    use_web: bool = False

# --- HELPERS ---
def get_system_secrets():
    """Fetches API Keys from the Admin-controlled database table."""
    try:
        response = supabase.table("system_settings").select("*").execute()
        secrets = {item['key']: item['value'] for item in response.data}
        return secrets
    except Exception as e:
        print(f"Error fetching secrets: {e}")
        return {}

def get_chat_history(session_id: str):
    """Fetches last 6 messages from Supabase to give the AI context."""
    try:
        response = supabase.table("chat_messages")\
            .select("*")\
            .eq("session_id", session_id)\
            .order("created_at", desc=True)\
            .limit(6)\
            .execute()
        
        data = response.data[::-1]
        
        history = ChatMessageHistory()
        for msg in data:
            if msg['role'] == 'user':
                history.add_user_message(msg['content'])
            else:
                history.add_ai_message(msg['content'])
        return history
    except Exception as e:
        print(f"History fetch error: {e}")
        return ChatMessageHistory()

def get_user_profile(user_id: str):
    """Fetches user details like full_name for context."""
    try:
        response = supabase.table("profiles").select("full_name").eq("id", user_id).single().execute()
        return response.data if response.data else {"full_name": "User"}
    except Exception as e:
        print(f"Profile fetch error: {e}")
        return {"full_name": "User"}

def format_results_as_toon(docs):
    results = []
    seen = set()
    for doc in docs:
        if doc.page_content in seen: continue
        seen.add(doc.page_content)
        
        source = doc.metadata.get('source', 'document')
        # Truncate content slightly to save tokens
        clean_text = doc.page_content.replace("\n", " ").strip()[:800]
        results.append(f"[{source}] {clean_text}")
    return "\n".join(results)

# --- ENDPOINTS ---

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), user_id: str = Form(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        # 1. Read PDF
        reader = PdfReader(file.file)
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="The PDF appears to be empty or contains no extractable text.")

        print(f"📊 Extracted {len(text)} characters from {file.filename}")

        # 2. Chunk Text
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = text_splitter.split_text(text)
        print(f"📦 Split into {len(chunks)} chunks")
        
        # 3. Setup Typesense
        secrets = get_system_secrets()
        typesense_key = secrets.get("TYPESENSE_API_KEY")
        typesense_host = secrets.get("TYPESENSE_HOST", "wg7oleaiq5cfpjz3p-1.a1.typesense.net")

        if not typesense_key:
            raise HTTPException(status_code=500, detail="Typesense API Key not found.")

        client = typesense.Client({
            'nodes': [{'host': typesense_host, 'port': '443', 'protocol': 'https'}],
            'api_key': typesense_key,
            'connection_timeout_seconds': 15
        })

        vector_db = Typesense(
            typesense_client=client, 
            embedding=embeddings,
            typesense_collection_name="text_knowledge_base",
            text_key="content"
        )

        # 4. Ingest with user_id metadata
        metadatas = [{"source": file.filename, "user_id": user_id}] * len(chunks)
        vector_db.add_texts(chunks, metadatas=metadatas)
        print(f"✅ Ingested {len(chunks)} chunks for user {user_id}.")
        
        return {"status": "success", "message": f"Successfully processed {file.filename}"}
    except Exception as e:
        print(f"❌ Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    secrets = get_system_secrets()
    groq_key = secrets.get("GROQ_API_KEY")
    typesense_key = secrets.get("TYPESENSE_API_KEY")
    typesense_host = secrets.get("TYPESENSE_HOST", "wg7oleaiq5cfpjz3p-1.a1.typesense.net")

    if not groq_key or not typesense_key:
        raise HTTPException(status_code=500, detail="API Keys not configured.")

    # 1. Fetch User Profil for Identity Context
    profile = get_user_profile(request.user_id)
    user_name = profile.get("full_name", "User")

    try:
        llm = ChatGroq(model=request.model_name, api_key=groq_key, temperature=0.1)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Model: {e}")

    # Initialize Internal Search Tool
    try:
        ts_client = typesense.Client({
            'nodes': [{'host': typesense_host, 'port': '443', 'protocol': 'https'}],
            'api_key': typesense_key,
            'connection_timeout_seconds': 10
        })
        
        vector_db = Typesense(
            typesense_client=ts_client,
            embedding=embeddings,
            typesense_collection_name="text_knowledge_base",
            text_key="content"
        )
        
        def internal_search_logic(query: str):
            print(f"🔍 Original Query: {query}")
            try:
                is_summary = any(kw in query.lower() for kw in ["summary", "summarize", "overview", "all"])
                
                # --- ADVANCED QUERY EXPANSION ---
                if is_summary:
                    # For a summary, we ask the LLM to identify the "likely core themes" to search for
                    extraction_prompt = f"Identify 3-5 main research topics or keywords that would be in a document related to: '{query}'. Return only the keywords separated by commas."
                    expansion = llm.invoke(extraction_prompt).content
                    search_query = f"{query}, {expansion}"
                else:
                    # For specific questions, expand with synonyms and technical terms
                    expansion_prompt = f"Expand this query into 5 technical keywords to improve document retrieval: '{query}'. Return only the keywords separated by commas."
                    expansion = llm.invoke(expansion_prompt).content
                    search_query = f"{query}, {expansion}"
                
                print(f"🚀 Expanded Search Query: {search_query}")

                # Fetch FEWER documents to avoid Groq's low TPM limits (6000 tokens)
                search_k = 10 if is_summary else 4
                docs = vector_db.similarity_search(search_query, k=search_k, filter_by=f"user_id:={request.user_id}")
                
                if not docs:
                    # Final fallback: generic search to at least get something (still filtered)
                    print("⚠️ No results for expanded query, trying generic search...")
                    docs = vector_db.similarity_search(
                        "research findings technical details", 
                        k=10,
                        filter_by=f"user_id:={request.user_id}"
                    )

                if not docs:
                    return "Zero snippets retrieved. The document may not be indexed or is empty."
                
                print(f"🎯 Retrieved {len(docs)} snippets.")
                return format_results_as_toon(docs)
            except Exception as e:
                print(f"❌ Search Error: {e}")
                return f"Internal search failure: {str(e)}"

        internal_tool = StructuredTool.from_function(
            name="search_internal_documents",
            description="Searches through the user's uploaded PDF documents for specific facts, topics, or to generate a summary.",
            func=internal_search_logic
        )
    except Exception as e:
        print(f"❌ Typesense Setup Error: {e}")
        internal_tool = None

    # External Tool
    ddg = DuckDuckGoSearchRun()
    external_tool = StructuredTool.from_function(
        name="search_web",
        description="Searches the web for general knowledge, news, or facts NOT present in the user's documents.",
        func=lambda q: ddg.invoke(q)
    )

    # Select Tools based on User Toggle
    tools = [internal_tool]
    if request.use_web:
        tools.append(external_tool)
        print("🌐 Web Search Enabled for this request.")
    else:
        print("📄 Document Search ONLY for this request.")

    history = get_chat_history(request.session_id)
    today = datetime.date.today().strftime("%B %d, %Y")

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"""You are DocMind, an expert research assistant. Date: {today}.
        
        IDENTITY CONTEXT:
        - Your Name: DocMind
        - User's Name: {user_name}
        
        STRICT OPERATING RULES:
        1. IF the user asks "who am I?", "what is my name?", or greets you, ANSWER using the IDENTITY CONTEXT. DO NOT use tools.
        
        2. TOOL USAGE:
           - You are provided with tools based on a user-selected mode.
           - If 'search_web' is available, use it for facts NOT in the document.
           - If ONLY 'search_internal_documents' is available, you MUST NOT ask for web search. 
        
        3. IF 'search_internal_documents' is used and returns nothing, do not apologize for lack of web search unless 'search_web' is actually available.
        
        4. ONCE YOU FIND THE ANSWER, STOP.
        
        5. Formatting: Use Markdown (## Headers, **bold**, - lists).
        """),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(
        agent=agent, 
        tools=tools, 
        verbose=True, 
        handle_parsing_errors=True,
        max_iterations=10,
        early_stopping_method="generate"
    )

    try:
        response = agent_executor.invoke({"input": request.query, "chat_history": history.messages})
        return {"response": response.get('output', "I'm sorry, I couldn't generate a response.")}
    except Exception as e:
        print(f"❌ Agent Error: {e}")
        return {"response": f"AI Error: {str(e)}"}

@app.get("/")
def home():
    return {"status": "DocMind Backend running with Agentic RAG"}
