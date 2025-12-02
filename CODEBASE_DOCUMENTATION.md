# MathMentor Codebase Documentation

## Executive Summary

MathMentor is a **RAG (Retrieval-Augmented Generation) powered AI math tutoring platform** designed to teach high school mathematics through interactive conversations, personalized learning paths, and adaptive practice problems. The system combines vector similarity search with large language models to provide contextually relevant, pedagogically sound math explanations and problem-solving assistance.

---

## System Architecture

### High-Level Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   FastAPI    │────▶│  Supabase  │
│  (Next.js)  │     │   Backend    │     │ (PostgreSQL │
│             │◀────│              │◀────│  + pgvector)│
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   OpenAI API  │
                    │ (Embeddings  │
                    │  + GPT-3.5)  │
                    └──────────────┘
```

### Core Components

1. **Frontend (Next.js/React)**: User interface for chat-based tutoring
2. **Backend (FastAPI)**: REST API handling all tutoring logic
3. **RAG Engine**: Content retrieval and response generation
4. **Vector Store**: Supabase with pgvector for semantic search
5. **Data Processing**: Content chunking and embedding generation

---

## Detailed Component Breakdown

### 1. Frontend (`frontend/`)

#### **Main Application (`app/page.tsx`)**
- **Purpose**: Root component managing application state and routing
- **Key Features**:
  - View management (Chat, Progress)
  - User authentication (localStorage-based, simplified)
  - Conversation history management
  - Mobile-responsive sidebar with slide-in/out animation
- **State Management**:
  - `activeView`: Current view ('chat' or 'progress')
  - `user`: Current user session
  - `conversations`: List of saved conversations
  - `sidebarOpen`: Mobile sidebar state

#### **Chat Interface (`components/ChatInterface.tsx`)**
- **Purpose**: Main chat interface for student-tutor interactions
- **Performance Optimizations**:
  - **Lazy Loading**: Markdown renderer loaded dynamically
  - **Intersection Observer**: Only renders markdown for visible messages (last 5 always rendered)
  - **Memoization**: Message components memoized with custom comparison
  - **Debounced Saves**: Conversations saved to localStorage with 2-second debounce
  - **Request Deduplication**: Prevents duplicate API calls
  - **CSS Containment**: Optimizes rendering performance
- **Features**:
  - Real-time message display with markdown rendering
  - LaTeX math equation support (via KaTeX)
  - Conversation persistence in localStorage
  - Optimistic UI updates
  - Loading states and error handling
  - Auto-scroll to latest message

#### **API Client (`lib/api.ts`)**
- **Purpose**: Centralized API communication layer
- **Optimizations**:
  - **Request Caching**: GET requests cached with TTL (5 minutes default)
  - **Request Deduplication**: Prevents concurrent duplicate requests
  - **Keepalive Connections**: Faster subsequent requests
  - **Timeout Handling**: 30-second request timeout
  - **Automatic Cache Invalidation**: Progress cache cleared on mastery updates
- **Methods**:
  - `askQuestion()`: Main tutoring endpoint
  - `explainConcept()`: Concept explanations (cached 10 min)
  - `solveProblem()`: Step-by-step problem solving
  - `getHint()`: Progressive hints (levels 1-3)
  - `generatePractice()`: Practice problem generation
  - `generateTest()`: Multiple choice test questions
  - `getProgress()`: Student progress tracking
  - `getRecommendations()`: Learning path recommendations

#### **Markdown Renderer (`components/MarkdownRenderer.tsx`)**
- **Purpose**: Renders markdown content with math equation support
- **Features**:
  - ReactMarkdown with remark-math and rehype-katex plugins
  - LaTeX equation rendering (inline `$...$` and block `$$...$$`)
  - Custom styling for code blocks, lists, headings
  - Memoized to prevent unnecessary re-renders
  - CSS containment for performance

---

### 2. Backend (`api/main.py`)

#### **FastAPI Application**
- **Framework**: FastAPI with async support
- **Middleware**:
  - CORS: Allows cross-origin requests
  - GZip: Response compression for large payloads
- **Lazy Initialization**: Services initialized on first use to handle missing env vars gracefully

#### **API Endpoints**

1. **`POST /api/ask-question`**
   - Main tutoring endpoint
   - Accepts: `{ question: str, concept_id?: str }`
   - Returns: `{ answer: str, context_used: bool, skill_level: str }`
   - Flow: Retrieves context → Generates personalized answer

2. **`POST /api/explain-concept`**
   - Concept explanations
   - Accepts: `{ concept_name: str, concept_id?: str }`
   - Returns: Explanation with concept details

3. **`POST /api/solve-problem`**
   - Step-by-step problem solving
   - Accepts: `{ problem: str, concept_id?: str }`
   - Returns: Detailed solution with steps

4. **`POST /api/get-hint`**
   - Progressive hints (1-3 levels)
   - Accepts: `{ problem: str, attempt: str, hint_level: int, concept_id?: str }`
   - Returns: Contextual hint based on student's attempt

5. **`POST /api/generate-practice`**
   - Practice problem generation
   - Accepts: `{ concept_name: str, difficulty: str, num_problems: int, concept_id?: str }`
   - Returns: Generated problems with solutions

6. **`POST /api/generate-test`**
   - Multiple choice test questions
   - Accepts: `{ concept_name: str, difficulty: str, num_questions: int, concept_id?: str }`
   - Returns: JSON array of questions with options and correct answers

7. **`GET /api/progress`**
   - Student progress tracking
   - Requires: User authentication
   - Returns: `{ total_concepts_studied, mastered, in_progress, not_started, concepts[] }`

8. **`GET /api/recommendations`**
   - Learning path recommendations
   - Requires: User authentication
   - Returns: Recommended concepts based on mastery

9. **`GET /api/concepts`**
   - List all math concepts
   - Optional filter by topic
   - Returns: Array of concept objects

10. **`POST /api/update-mastery`**
    - Update concept mastery score
    - Requires: User authentication
    - Accepts: `{ concept_id: str, mastery_score: float }`

---

### 3. RAG Engine (`rag_engine/`)

#### **Content Retriever (`retriever.py`)**
- **Purpose**: Retrieves relevant math content using vector similarity search
- **Process**:
  1. Generates embedding for user query using OpenAI
  2. Searches vector store for similar content chunks
  3. Filters by concept_id if provided
  4. Formats retrieved chunks into context string
- **Key Methods**:
  - `retrieve()`: Vector similarity search (max 5 chunks)
  - `format_context()`: Formats chunks with concept metadata
  - `retrieve_and_format()`: Combined retrieval and formatting

#### **Response Generator (`generator.py`)**
- **Purpose**: Generates LLM responses using retrieved context
- **Model**: GPT-3.5-turbo (configurable via env var)
- **Features**:
  - System prompt: "MathMentor, expert high school math tutor"
  - LaTeX notation enforcement
  - Token limits optimized for speed (800-1500 tokens)
  - Performance monitoring (warns if response > 10s)
- **Methods**:
  - `answer_question()`: General Q&A with context
  - `explain_concept()`: Concept explanations
  - `solve_problem()`: Step-by-step solutions
  - `provide_hint()`: Progressive hints
  - `generate_practice_problems()`: Practice generation
  - `generate_test_questions()`: Test question generation with JSON parsing

#### **Prompts (`prompts.py`)**
- **Purpose**: Math-specific prompt templates
- **Templates**:
  - `format_tutor_prompt()`: General tutoring with context
  - `format_concept_explanation()`: Concept-focused explanations
  - `format_problem_solving()`: Step-by-step problem solving
  - `format_hint()`: Progressive hint system
  - `format_practice_generator()`: Practice problem generation
  - `format_test_question_generator()`: JSON-formatted test questions
- **Features**:
  - Context-aware prompts
  - Skill level adaptation
  - LaTeX notation instructions
  - Pedagogical guidelines

---

### 4. Data Processing (`data_processing/`)

#### **Embedding Generator (`embeddings.py`)**
- **Purpose**: Generates embeddings for text content
- **Model**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Features**:
  - Single text embedding
  - Batch processing (100 texts per batch)
  - Error handling and retry logic
- **Usage**: Used during content ingestion and query time

#### **Vector Store (`vector_store.py`)**
- **Purpose**: Manages vector storage and retrieval in Supabase
- **Features**:
  - **Primary Method**: PostgreSQL RPC function `match_content_chunks` for efficient similarity search
  - **Fallback**: Manual cosine similarity calculation if RPC unavailable
  - **Error Handling**: Multiple fallback layers for reliability
  - **Cosine Similarity**: Custom implementation for fallback
- **Methods**:
  - `store_chunks()`: Stores chunks with embeddings
  - `similarity_search()`: Vector similarity search with threshold filtering
  - `get_chunks_by_concept()`: Retrieves all chunks for a concept
  - `delete_chunks_by_concept()`: Deletes concept chunks

#### **Chunkers (`chunkers.py`)**
- **Purpose**: Intelligently chunks math content for RAG
- **Strategies**:
  - `chunk_by_concept()`: Splits by concept boundaries (definitions, theorems, examples)
  - `chunk_by_difficulty()`: Adds difficulty metadata to chunks
  - `chunk_by_section()`: Organizes by predefined sections
  - `chunk_simple()`: Fallback fixed-size chunking
- **Configuration**:
  - Default chunk size: 500 characters
  - Overlap: 50 characters (prevents context loss)
  - Regex-based section detection

---

### 5. Tutoring Logic (`tutoring/`)

#### **Math Tutor (`math_tutor.py`)**
- **Purpose**: Main orchestrator combining RAG retrieval and response generation
- **Components**:
  - `ContentRetriever`: Handles content retrieval
  - `ResponseGenerator`: Handles LLM generation
  - `Supabase Client`: User context and data access
- **Methods**:
  - `ask_question()`: Main Q&A with personalization
  - `explain_concept()`: Concept explanations
  - `solve_problem()`: Problem solving
  - `provide_hint()`: Progressive hints
  - `generate_practice()`: Practice generation
  - `generate_test_questions()`: Test generation
  - `_get_user_context()`: Retrieves user skill level and preferences

#### **Progress Tracker (`progress_tracker.py`)**
- **Purpose**: Tracks student learning progress and mastery
- **Features**:
  - Mastery score tracking (0.0-1.0)
  - Practice session recording
  - Progress analytics
  - Learning recommendations based on prerequisites
- **Methods**:
  - `update_mastery()`: Updates concept mastery score
  - `get_progress()`: Returns progress summary
  - `get_recommendations()`: Suggests next concepts to study
  - `record_practice_session()`: Logs practice sessions

---

### 6. Database Schema (`supabase/migrations/`)

#### **Tables**

1. **`users`**
   - Extends Supabase auth.users
   - Fields: `id`, `name`, `email`, `skill_level`, `preferred_learning_style`
   - RLS: Users can only view/update own profile

2. **`math_concepts`**
   - Math topics and concepts
   - Fields: `concept_id`, `name`, `description`, `prerequisites[]`, `difficulty`, `topic_category`
   - RLS: Public read access

3. **`content_chunks`**
   - RAG content with embeddings
   - Fields: `chunk_id`, `concept_id`, `content`, `embedding vector(1536)`, `metadata jsonb`, `chunk_index`
   - Index: IVFFlat index on embeddings for fast similarity search
   - RLS: Public read access

4. **`practice_problems`**
   - Generated practice problems
   - Fields: `problem_id`, `concept_id`, `problem_text`, `solution`, `difficulty`, `hints[]`
   - RLS: Public read access

5. **`concepts_mastered`**
   - User progress tracking
   - Fields: `id`, `user_id`, `concept_id`, `mastery_score`, `last_practiced`, `times_practiced`
   - Unique constraint: (user_id, concept_id)
   - RLS: Users can only view/update own progress

6. **`practice_sessions`**
   - Practice session analytics
   - Fields: `session_id`, `user_id`, `concept_id`, `problems_attempted`, `problems_correct`, `accuracy`, timestamps
   - RLS: Users can only view/update own sessions

#### **Functions**

1. **`match_content_chunks()`**
   - PostgreSQL RPC function for vector similarity search
   - Parameters: `query_embedding`, `match_threshold`, `match_count`, `concept_filter`
   - Returns: Chunks with similarity scores
   - Uses pgvector cosine distance operator (`<=>`)
   - Performance: IVFFlat index for approximate nearest neighbor search

2. **`update_updated_at_column()`**
   - Trigger function to auto-update `updated_at` timestamp

#### **Indexes**
- `content_chunks`: IVFFlat index on embeddings (vector_cosine_ops)
- Foreign key indexes on concept_id, user_id
- Composite indexes for common queries

---

## Data Flow

### Question Answering Flow

```
1. User submits question in frontend
   ↓
2. Frontend API client sends POST /api/ask-question
   ↓
3. FastAPI endpoint calls MathTutor.ask_question()
   ↓
4. MathTutor retrieves user context (skill level, preferences)
   ↓
5. ContentRetriever.retrieve_and_format():
   a. EmbeddingGenerator generates query embedding
   b. VectorStore.similarity_search() finds relevant chunks
   c. Formats chunks into context string
   ↓
6. ResponseGenerator.answer_question():
   a. Formats prompt with context, question, user context
   b. Calls OpenAI GPT-3.5-turbo
   c. Returns generated answer
   ↓
7. Response sent back through API → Frontend
   ↓
8. Frontend renders markdown with LaTeX support
   ↓
9. Conversation saved to localStorage (debounced)
```

### Content Ingestion Flow

```
1. Admin runs load_content.py script
   ↓
2. MathChunker.chunk_by_difficulty() splits content
   ↓
3. EmbeddingGenerator.embed_chunks() generates embeddings
   ↓
4. VectorStore.store_chunks() saves to Supabase
   ↓
5. Content available for retrieval via vector search
```

---

## Technologies Used

### Frontend
- **Next.js 14**: React framework with SSR/SSG
- **React 18**: UI library with hooks
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **ReactMarkdown**: Markdown rendering
- **KaTeX**: LaTeX math rendering
- **Lucide React**: Icon library

### Backend
- **FastAPI**: Modern Python web framework
- **Python 3.12**: Programming language
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation

### Database & Storage
- **Supabase**: PostgreSQL database + auth
- **pgvector**: Vector similarity search extension
- **PostgreSQL**: Relational database

### AI/ML
- **OpenAI API**:
  - `text-embedding-3-small`: Embeddings (1536 dim)
  - `gpt-3.5-turbo`: Chat completions

### Utilities
- **python-dotenv**: Environment variable management
- **uuid**: Unique identifier generation

---

## Key Features

### 1. RAG-Powered Tutoring
- Semantic search over math content
- Context-aware responses
- Personalized based on skill level

### 2. Performance Optimizations
- Lazy loading of heavy components
- Intersection Observer for visible-only rendering
- Request caching and deduplication
- Debounced localStorage saves
- CSS containment for rendering performance

### 3. Math-Specific Features
- LaTeX equation rendering
- Step-by-step problem solving
- Progressive hint system (3 levels)
- Practice problem generation
- Multiple choice test generation

### 4. Progress Tracking
- Mastery score tracking (0.0-1.0)
- Practice session analytics
- Learning recommendations
- Prerequisite-based learning paths

### 5. User Experience
- Real-time chat interface
- Conversation history
- Mobile-responsive design
- Optimistic UI updates
- Error handling and loading states

---

## Configuration

### Environment Variables

**Backend (.env)**:
- `OPENAI_API_KEY`: OpenAI API key (required)
- `OPENAI_MODEL`: Model name (default: gpt-3.5-turbo)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for backend
- `SUPABASE_ANON_KEY`: Anonymous key for client

**Frontend (.env.local)**:
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8000)

---

## Performance Characteristics

### Frontend Optimizations
- **Initial Load**: ~2-3s (with lazy loading)
- **Message Rendering**: Only visible messages render markdown
- **API Caching**: GET requests cached 5-10 minutes
- **LocalStorage**: Debounced saves (2 seconds)

### Backend Optimizations
- **Vector Search**: Uses pgvector IVFFlat index (fast approximate search)
- **Token Limits**: Reduced for faster responses (800-1500 tokens)
- **Response Time**: Typically 2-5 seconds per question
- **Fallback**: Manual similarity calculation if RPC unavailable

### Database
- **Vector Index**: IVFFlat with 100 lists (good for < 1M vectors)
- **Query Performance**: Sub-100ms for similarity search
- **RLS**: Row-level security for user data isolation

---

## Security Considerations

### Current Implementation
- **Authentication**: Simplified localStorage-based (not production-ready)
- **RLS Policies**: Database-level security for user data
- **API Security**: CORS configured (currently allows all origins)
- **Input Validation**: Pydantic models validate all inputs

### Production Recommendations
- Implement proper JWT authentication via Supabase Auth
- Restrict CORS to specific frontend domains
- Add rate limiting to API endpoints
- Implement request signing/verification
- Add input sanitization for user queries

---

## Limitations & Future Improvements

### Current Limitations
1. **Authentication**: Simplified localStorage-based (needs Supabase Auth integration)
2. **Error Handling**: Basic error messages (could be more user-friendly)
3. **Content Coverage**: Limited to loaded content (needs more math domains)
4. **Vector Search**: Fallback to manual calculation if RPC fails
5. **Mobile UX**: Could be further optimized

### Potential Improvements
1. **Streaming Responses**: Real-time token streaming for faster perceived performance
2. **Multi-modal Support**: Graph visualization, interactive diagrams
3. **Advanced Analytics**: Learning path optimization, difficulty adaptation
4. **Content Management**: Admin UI for content ingestion
5. **Collaborative Features**: Study groups, peer learning
6. **Offline Support**: Service worker for offline access
7. **Voice Input**: Speech-to-text for questions
8. **Multi-language Support**: Internationalization

---

## Development Workflow

### Running the Application

1. **Start Backend**:
   ```bash
   cd mathmentor
   python -m uvicorn api.main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Load Content**:
   ```bash
   python scripts/load_content.py --example
   ```

### Testing
- Backend API docs: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Test Supabase connection: `python test_supabase.py`

---

## Conclusion

MathMentor is a sophisticated RAG-based tutoring platform that combines semantic search, large language models, and personalized learning to provide effective math education. The architecture is designed for scalability, performance, and maintainability, with clear separation of concerns between frontend, backend, and data layers.

The system demonstrates modern best practices in:
- RAG implementation
- Performance optimization
- User experience design
- Database schema design
- API architecture

With proper authentication and content expansion, this platform could serve as a production-ready math tutoring solution.

