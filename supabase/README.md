# Supabase Setup

This directory contains Supabase configuration and database migrations.

## Initial Setup

1. **Install Supabase CLI** (optional, for local development):
   ```bash
   npm install -g supabase
   ```

2. **Link to your Supabase project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Run migrations**:
   ```bash
   # Push migrations to remote
   supabase db push
   
   # Or apply manually via Supabase Dashboard:
   # Go to SQL Editor → Run the SQL from migrations/001_initial_schema.sql
   ```

## Database Schema

The initial migration (`001_initial_schema.sql`) creates:

- **pgvector extension** for embedding storage
- **users** table (extends auth.users)
- **math_concepts** table
- **content_chunks** table with vector embeddings
- **practice_problems** table
- **concepts_mastered** table (user progress)
- **practice_sessions** table
- **Row Level Security (RLS)** policies
- **Indexes** for performance

## Vector Search

The `content_chunks` table uses pgvector for similarity search:
- Embedding dimension: 1536 (OpenAI text-embedding-3-small)
- Index type: IVFFlat with cosine similarity

## Local Development

To run Supabase locally:

```bash
supabase start
```

This will start:
- PostgreSQL database (port 54322)
- Supabase Studio (port 54323)
- API server (port 54321)
- Auth server
- Storage server

## Production Deployment

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations via Dashboard or CLI
3. Enable pgvector extension in Database → Extensions
4. Configure environment variables with production keys

