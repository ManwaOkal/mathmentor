# MathMentor - RAG-Based AI Math Tutor Platform

A RAG-powered platform that teaches high school math concepts through interactive AI tutoring, personalized learning paths, and adaptive practice problems.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (if using Next.js/React)
- Python 3.9+ (if using FastAPI)
- Supabase account
- OpenAI API key

### Setup

1. **Clone and install dependencies**
   ```bash
   cd mathmentor
   npm install  # or pip install -r requirements.txt
   ```

2. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and API keys
   - Run migrations:
     ```bash
     # If using Supabase CLI locally
     supabase db push
     
     # Or run the SQL in supabase/migrations/001_initial_schema.sql via Supabase Dashboard
     ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and OpenAI credentials
   ```

4. **Run database migrations**
   - Run `001_initial_schema.sql` in Supabase SQL Editor
   - Run `002_match_content_chunks_function.sql` for vector search
   - (Optional) Run `seed_data.sql` for sample data

5. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

6. **Load math content** (optional)
   ```bash
   python scripts/load_content.py --example
   ```

7. **Start API server**
   ```bash
   python -m uvicorn api.main:app --reload
   # API will be available at http://localhost:8000
   # API docs at http://localhost:8000/docs
   ```

## 📁 Project Structure

```
mathmentor/
├── supabase/
│   ├── migrations/          # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   └── 002_match_content_chunks_function.sql
│   ├── seed_data.sql        # Sample data
│   └── config.toml          # Supabase local config
├── data_processing/          # Content chunking and embeddings
│   ├── chunkers.py          # Text chunking strategies
│   ├── embeddings.py         # OpenAI embedding generation
│   └── vector_store.py      # Supabase pgvector operations
├── rag_engine/              # RAG query processing
│   ├── retriever.py         # Content retrieval
│   ├── generator.py         # LLM response generation
│   └── prompts.py           # Prompt templates
├── tutoring/                 # Tutor logic
│   ├── math_tutor.py        # Main tutor interface
│   └── progress_tracker.py  # Progress tracking
├── api/
│   └── main.py              # FastAPI backend
├── scripts/
│   └── load_content.py      # Utility to load math content
└── lib/
    └── supabase_client.py   # Supabase client configuration
```

## 🗄️ Database Schema

The database includes:
- **users**: User profiles and preferences
- **math_concepts**: Math topics and concepts
- **content_chunks**: RAG embeddings with pgvector
- **practice_problems**: Generated practice problems
- **concepts_mastered**: User progress tracking
- **practice_sessions**: Session analytics

## 🔑 Environment Variables

See `.env.example` for required variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPENAI_API_KEY`: OpenAI API key for embeddings and chat

## 📚 Tech Stack

- **Database**: Supabase (PostgreSQL + pgvector)
- **Backend**: FastAPI or Node.js/Express
- **Frontend**: React/Next.js or Streamlit
- **Embeddings**: OpenAI text-embedding-3-small
- **LLM**: OpenAI GPT-4/GPT-3.5-turbo

## 🛠️ Development

### API Endpoints

The FastAPI backend provides these endpoints:

- `POST /api/ask-question` - Answer student questions
- `POST /api/explain-concept` - Explain math concepts
- `POST /api/solve-problem` - Step-by-step problem solving
- `POST /api/get-hint` - Get hints for problems
- `POST /api/generate-practice` - Generate practice problems
- `GET /api/progress` - Get student progress
- `GET /api/recommendations` - Get learning recommendations
- `GET /api/concept/{id}` - Get concept details
- `GET /api/concepts` - List all concepts

### Loading Content

To add math content to the system:

```bash
# Get concept ID from database first
python scripts/load_content.py "Concept Name" content.txt <concept_id> intermediate
```

### Testing

Test Supabase connection:
```bash
python test_supabase.py
# or
npm run test:supabase
```

### Example API Usage

```python
import requests

# Ask a question
response = requests.post("http://localhost:8000/api/ask-question", json={
    "question": "How do I solve quadratic equations?",
    "concept_id": None  # Optional
})
print(response.json())
```

See `instructions.md` for detailed implementation roadmap.

## 📝 License

MIT

