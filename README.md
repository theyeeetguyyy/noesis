---
title: Nexus RAG
emoji: 🔮
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
---

# Nexus — Document Intelligence

A general-purpose document RAG assistant. Upload any PDF or DOCX, then ask questions and get precise, source-grounded answers powered by OpenAI + ChromaDB.

Built by **Astitva Bandil**.

---

## ▶ Running locally

### 1. Backend

> Run from the **project root**, NOT from inside `backend/`.

```bash
# Install Python dependencies (once)
pip install -r requirements.txt

# Start the API server
uvicorn backend.main:app --reload --port 7860
```

The API will be live at `http://127.0.0.1:7860`.

### 2. Frontend

```bash
cd frontend-react

# Install node dependencies (once — also installs framer-motion)
npm install

# Start the dev server
npm run dev
```

The UI will be live at `http://localhost:5173`.

Open `http://localhost:5173` in your browser. Sign in with:

| Account | Username | Password | Notes |
|---------|----------|----------|-------|
| Admin   | `admin`  | `admin321` | Full access, manage workspaces |
| Demo    | `demo`   | `demo`   | 3 uploads · 10 messages · 3-day history |

---

## ⚙️ Environment variables

Set these in a `.env` file at the project root (or as HuggingFace Space secrets):

| Variable | Purpose | Default |
|----------|---------|---------|
| `GROQ_API_KEY` | Chat + vision (via Groq) | *(required)* |
| `HF_TOKEN` | Hugging Face embeddings | *(required)* |
| `MONGODB_URI` | Users, chats, document metadata | `mongodb://localhost:27017` |
| `MONGODB_DB` | Database name | `noesis_ragbot` |
| `GROQ_CHAT_MODEL` | Answer model | `llama3-70b-8192` |
| `GROQ_VISION_MODEL` | Chart-reading vision model | `llama-3.2-90b-vision-preview` |
| `GROQ_EMBED_MODEL` | Embedding model | `sentence-transformers/all-MiniLM-L6-v2` |
| `VISION_MAX_PAGES` | Max vision calls per document | `60` |

---

## 📄 Ingestion pipeline

Uploaded PDFs and DOCX files go through:

1. **Per-page extraction** with PyMuPDF
2. **Chart/diagram detection** — visually dense pages are rendered to PNG
3. **Vision pass** — chart images are sent to the OpenAI vision model, which transcribes plotted curves and tables to Markdown
4. **Markdown cleanup** (de-hyphenation, whitespace normalisation) and **structure-aware chunking**
5. **Embeddings** via `text-embedding-3-small`, stored in ChromaDB with **MMR retrieval** (`k=8`, `fetch_k=20`)

Ingestion runs **in the background** — the UI returns immediately and shows a toast notification when indexing completes.

---

## 🚀 Building the vector store from seed data

```bash
# From the project root
python ingest.py
```

Or just upload documents through the UI — the same pipeline runs.

---

## 🐳 Deployment (HuggingFace Spaces / Docker)

The `Dockerfile` builds the full app (backend serves the bundled frontend as static files).

```bash
# Build the frontend first
cd frontend-react && npm install && npm run build
cd ..

# Build and run the Docker image
docker build -t nexus-rag .
docker run -p 7860:7860 --env-file .env nexus-rag
```

> Mount persistent storage at `/data` on HuggingFace so ChromaDB and uploads survive restarts.
