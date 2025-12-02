# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: MathMentor (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

## Step 3: Enable pgvector Extension

1. Go to **Database** → **Extensions** in Supabase dashboard
2. Search for "vector" or "pgvector"
3. Click **Enable** on the `vector` extension

## Step 4: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended for first time)

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Verify success message

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Step 5: (Optional) Add Seed Data

1. Go to **SQL Editor** → **New Query**
2. Copy and paste contents of `supabase/seed_data.sql`
3. Click **Run**

## Step 6: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
   OPENAI_API_KEY=sk-proj-...your-openai-key
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
   ```

## Step 7: Verify Setup

Test your connection using the provided test scripts:

### Python Test

```bash
# Install dependencies first
pip install -r requirements.txt

# Run the test
python test_supabase.py
```

### JavaScript/Node.js Test

```bash
# Install dependencies first
npm install

# Run the test
npm run test:supabase
# or
node test_supabase.js
```

### TypeScript Test

```bash
# Install dependencies first
npm install

# Run the test
npm run test:supabase:ts
# or
npx ts-node test_supabase.ts
```

The test scripts will:
- ✅ Verify your Supabase connection
- ✅ Check that all tables exist
- ✅ Test querying sample data
- ✅ Verify pgvector extension (if data exists)

**Expected output**: All tests should pass if your setup is correct!

## Database Schema Overview

Your database now has:

- ✅ **users** - User profiles (extends Supabase auth)
- ✅ **math_concepts** - Math topics and concepts
- ✅ **content_chunks** - RAG embeddings (with pgvector)
- ✅ **practice_problems** - Practice problems
- ✅ **concepts_mastered** - User progress tracking
- ✅ **practice_sessions** - Session analytics

## Row Level Security (RLS)

RLS is enabled on all tables:
- **Public data** (concepts, problems, chunks): Readable by everyone
- **User data** (progress, sessions): Only accessible by the user who owns it

## Next Steps

1. ✅ Database is ready!
2. Start building the RAG pipeline
3. Add content chunks with embeddings
4. Build the API endpoints
5. Create the frontend

## Troubleshooting

### "Extension vector does not exist"
- Make sure you enabled the pgvector extension (Step 3)

### "Permission denied"
- Check that RLS policies are correctly applied
- Verify you're using the correct API key (anon vs service_role)

### "Relation does not exist"
- Make sure migrations ran successfully
- Check the table name spelling

### Connection issues
- Verify your SUPABASE_URL is correct
- Check that your API keys are valid
- Ensure your project is not paused

## Production Deployment

When deploying to production:

1. Use environment variables (never commit `.env`)
2. Use **anon key** for client-side code
3. Use **service_role key** only in secure server-side code
4. Enable additional security features in Supabase dashboard:
   - Rate limiting
   - IP allowlisting (if needed)
   - Database backups

