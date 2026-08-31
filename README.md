# MedPulse AI CRM 🩺⚡

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Redux](https://img.shields.io/badge/Redux%20Toolkit-2.2.3-764ABC?style=for-the-badge&logo=redux&logoColor=white)](https://redux-toolkit.js.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-AI%20Agent-orange?style=for-the-badge)](https://langchain-ai.github.io/langgraph/)
[![Groq Llama 3.3](https://img.shields.io/badge/LLM-Groq%20Llama%203.3%2070B-f55036?style=for-the-badge)](https://groq.com)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0.30-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)

An autonomous, **AI-First Customer Relationship Management (CRM)** system designed for pharmaceutical field sales representatives to log, analyze, and track Healthcare Professional (HCP) interactions with conversational AI, voice-to-text, and automated workflow intelligence.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [AI Agent Architecture & Tools](#-ai-agent-architecture--tools)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Frontend State Management](#-frontend-state-management)
- [Evaluation & Verification](#-evaluation--verification)
- [License](#-license)

---

## 🏛 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React 18)                           │
│  ┌────────────┐   ┌───────────────┐   ┌─────────────┐   ┌────────────┐  │
│  │  Log Form  │   │  AI Assistant │   │   History   │   │ Dashboard  │  │
│  │  + Voice   │   │  Chat (Groq)  │   │  Timeline   │   │ Analytics  │  │
│  └─────┬──────┘   └───────┬───────┘   └──────┬──────┘   └─────┬──────┘  │
│        │                  │                  │                │         │
│        └──────────────────┴─────────┬────────┴────────────────┘         │
│                                     │  Redux Toolkit (Global State)     │
│                                     │  Axios HTTP Client                │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │  REST API
┌─────────────────────────────────────┼───────────────────────────────────┐
│                         BACKEND (FastAPI)                               │
│                                     │                                   │
│  ┌──────────────────────────────────┴────────────────────────────────┐  │
│  │                       Route Handlers                              │  │
│  │   /api/hcps/       /api/interactions/       /api/agent/chat       │  │
│  └───────┬──────────────────────┬──────────────────────┬─────────────┘  │
│          │                      │                      │                │
│  ┌───────┴──────┐       ┌───────┴──────┐      ┌────────┴─────────────┐  │
│  │  SQLAlchemy  │       │   Pydantic   │      │   LangGraph Agent    │  │
│  │     ORM      │       │  Validation  │      │  ┌─────────────────┐ │  │
│  │    Models    │       │   Schemas    │      │  │   8 AI Tools    │ │  │
│  └───────┬──────┘       └──────────────┘      │  │  + ChatGroq LLM │ │  │
│          │                                    │  │ (Llama 3.3 70B) │ │  │
│  ┌───────┴──────────────┐                     │  └─────────────────┘ │  │
│  │  SQLite / PostgreSQL │                     └──────────┬───────────┘  │
│  └──────────────────────┘                                │              │
│                                                   ┌──────┴──────┐       │
│                                                   │  Groq Cloud │       │
│                                                   │   API LLM   │       │
│                                                   └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🎙️ AI & Voice-Enabled Logging
- **Natural Language Extraction:** Describe or paste unformatted meeting notes; the AI parses doctor name, topics, sample quantities, materials, sentiment, and outcomes to auto-populate CRM records.
- **Voice-to-Text Dictation:** Hands-free meeting logging powered by Web Speech API.
- **Live Auto-Fill:** One-click confirmation to sync AI-parsed data straight into the structured form.

### 🧠 Autonomous LangGraph AI Agent
- Powered by **Llama 3.3 70B Versatile** via Groq Cloud.
- Equipped with **8 specialized agent tools** for multi-step reasoning, retrieval, and action execution.
- Context-aware conversational memory across chat sessions.

### 📊 Performance Analytics & Dashboard
- Real-time KPI summaries: Total interactions, sentiment breakdown, pending follow-ups.
- **Sentiment Gauge & Outcome Charts:** Visual metrics across rep engagement.
- **Top HCPs Feed:** Quick glance at most engaged healthcare providers and recent interactions.

### 📜 History & Timeline Management
- Dual-view interface: Interactive **Timeline View** and filterable **Table View**.
- Instant search and filtering by HCP, interaction type (Visit, Call, Email, Conference), and outcome.
- Complete CRUD capabilities (Create, Read, Update, Delete).

---

## 🛠 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Frontend UI** | React 18.2, Redux Toolkit, Axios | SPA with reactive state and responsive CSS |
| **Voice Interface** | Web Speech API | Client-side speech-to-text transcription |
| **Backend API** | FastAPI, Uvicorn (ASGI), Pydantic v2 | High-performance async Python backend |
| **ORM & Database** | SQLAlchemy 2.0, SQLite / PostgreSQL | Database abstraction with automatic seeding |
| **AI Orchestration** | LangGraph, LangChain Core | State-graph agent with tool-calling loops |
| **LLM Provider** | Groq (`llama-3.3-70b-versatile`) | Ultra-fast inference with fallback to `llama-3.1-8b` |

---

## 🤖 AI Agent Architecture & Tools

The backend agent operates as a **LangGraph StateGraph** that evaluates incoming user intent, triggers tools dynamically, and loops until all actions or extractions are resolved.

### 🛠️ 8 Specialized AI Tools

| Tool | Purpose | Example Query |
|---|---|---|
| `log_interaction` | Extracts structured fields from freeform text and saves record | *"Met Dr. Sarah Chen at 10am, discussed Cardiomax dosage, gave 5 samples"* |
| `edit_interaction` | Updates fields of an existing interaction | *"Change sentiment of meeting #3 to Positive"* |
| `suggest_followup` | Formulates action items, scheduling, and materials | *"Suggest a follow-up strategy for Dr. Patel"* |
| `summarize_interaction` | Condenses lengthy doctor meeting notes into concise CRM bullets | *"Summarize these clinic visit notes..."* |
| `search_hcp_history` | Searches historical logs for a given HCP | *"What did we discuss in our last meeting with Dr. Rodriguez?"* |
| `analyze_sentiment` | Computes tone score (Positive / Neutral / Negative) | *"Doctor expressed skepticism regarding drug side effects"* |
| `recommend_products` | Matches pharmaceutical catalog products to doctor specialty | *"What drugs should I present to a pediatric cardiologist?"* |
| `analyze_territory_performance` | Aggregates rep metrics across assigned geographic zones | *"Analyze territory performance for the North region"* |

---

## 📁 Project Structure

```
medpulse-ai-crm/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application, CORS, startup hooks
│   │   ├── agents/
│   │   │   └── hcp_agent.py        # LangGraph agent definition & 8 tools
│   │   ├── db/
│   │   │   └── database.py         # SQLAlchemy models, SQLite engine & seeder
│   │   ├── models/
│   │   │   └── schemas.py          # Pydantic validation schemas
│   │   └── routes/
│   │       ├── hcps.py             # HCP CRUD routes
│   │       ├── interactions.py     # Interaction CRUD & history routes
│   │       └── agent.py            # AI agent chat endpoint
│   ├── .env.example                # Backend environment variable template
│   ├── run.py                      # Uvicorn entry point script
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── public/
│   │   └── index.html              # HTML shell & font definitions
│   ├── src/
│   │   ├── App.js                  # Root application component
│   │   ├── index.js                # React DOM entry
│   │   ├── api/
│   │   │   └── api.js              # Axios client configuration
│   │   ├── components/
│   │   │   ├── Dashboard.js        # Analytics & KPI overview
│   │   │   ├── LogInteractionScreen.js # Split-screen form + AI chat
│   │   │   ├── LogForm.js          # Interaction entry form
│   │   │   ├── ChatInterface.js    # AI Copilot chat window
│   │   │   ├── InteractionHistory.js # Timeline & table views
│   │   │   └── Sidebar.js          # Navigation sidebar
│   │   ├── store/                  # Redux Toolkit slices
│   │   └── styles/
│   │       └── global.css          # Premium modern UI styling
│   ├── .env.example                # Frontend environment template
│   └── package.json                # Frontend dependencies
├── requirements.txt                # Root Python dependencies
├── .gitignore                      # Git exclusion rules
└── README.md                       # Documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** & **npm 9+**
- **Groq API Key** (Free tier available at [console.groq.com](https://console.groq.com))

---

### 1. Clone Repository

```bash
git clone https://github.com/Lohith-RC/medpulse-ai-crm.git
cd medpulse-ai-crm
```

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt
```

---

### 3. Frontend Setup

```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install node dependencies
npm install
```

---

## ⚙️ Configuration

### Backend Environment (`backend/.env`)

Create a `.env` file inside `backend/`:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional: PostgreSQL Connection (defaults to SQLite crm_hcp.db if omitted)
# DATABASE_URL=postgresql://user:password@localhost:5432/crm_hcp
```

### Frontend Environment (`frontend/.env`)

Create a `.env` file inside `frontend/` (optional):

```env
REACT_APP_API_URL=http://localhost:8000/api
```

---

## 🏃 Running the Application

### 1. Start the Backend API
```bash
cd backend
python run.py
```
- API Server: `http://localhost:8000`
- Interactive Docs: `http://localhost:8000/docs` (Swagger UI)

### 2. Start the Frontend Application
```bash
cd frontend
npm start
```
- Web Application: `http://localhost:3000`

---

## 🔌 API Reference

### Healthcare Professionals (`/api/hcps`)
- `GET /api/hcps/` — List all registered doctors / HCPs
- `GET /api/hcps/{id}` — Retrieve HCP details by ID
- `POST /api/hcps/` — Create a new HCP record

### Interactions (`/api/interactions`)
- `GET /api/interactions/` — Fetch all interaction logs (supports `?hcp_id=` filtering)
- `GET /api/interactions/{id}` — Fetch single interaction details
- `POST /api/interactions/` — Create a new interaction record
- `PUT /api/interactions/{id}` — Update an existing interaction
- `DELETE /api/interactions/{id}` — Remove an interaction record
- `GET /api/interactions/hcp-history/{hcp_id}` — Get chronological history for an HCP

### AI Agent (`/api/agent`)
- `POST /api/agent/chat` — Conversational interface with LangGraph agent
- `GET /api/agent/tools` — List registered agent tools and signatures

---

## 📊 Database Schema

```mermaid
erDiagram
    HCP ||--o{ INTERACTION : "has logged"
    INTERACTION ||--o{ CHAT_MESSAGE : "linked to"

    HCP {
        int id PK
        string name
        string specialization
        string hospital
        string email
        string phone
        string territory
        string tier
        datetime created_at
    }

    INTERACTION {
        int id PK
        int hcp_id FK
        string hcp_name
        string interaction_type
        string date
        string time
        string attendees
        string topic
        string materials
        string samples
        string sentiment
        float sentiment_score
        string outcomes
        string outcome
        string follow_up
        string notes
        string summary
        string ai_insights
        datetime created_at
    }

    CHAT_MESSAGE {
        int id PK
        string session_id
        string role
        string content
        datetime timestamp
        int interaction_id FK
    }
```

---

## 🧪 Evaluation & Verification

- **API Robustness:** All 8 AI tools tested and verified with LangGraph state transitions.
- **Auto-Seeding:** Automatic initialization of sample HCP profiles and representative interactions on first boot.
- **Responsive UI:** Clean split-view design with real-time Redux synchronization.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
