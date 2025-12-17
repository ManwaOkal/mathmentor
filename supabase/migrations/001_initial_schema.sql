-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT UNIQUE,
    skill_level TEXT DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    preferred_learning_style TEXT DEFAULT 'visual' CHECK (preferred_learning_style IN ('visual', 'auditory', 'kinesthetic', 'reading')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Math concepts table
CREATE TABLE public.math_concepts (
    concept_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    prerequisites TEXT[], -- Array of concept_ids
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    topic_category TEXT, -- e.g., 'algebra', 'geometry', 'trigonometry'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content chunks table (for RAG embeddings)
CREATE TABLE public.content_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept_id UUID REFERENCES public.math_concepts(concept_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    metadata JSONB, -- Store additional metadata like chunk_type, section, etc.
    chunk_index INTEGER, -- Order within concept
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practice problems table
CREATE TABLE public.practice_problems (
    problem_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept_id UUID REFERENCES public.math_concepts(concept_id) ON DELETE CASCADE,
    problem_text TEXT NOT NULL,
    solution TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    hints TEXT[], -- Array of hints at different levels
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concepts mastered table (user progress)
CREATE TABLE public.concepts_mastered (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES public.math_concepts(concept_id) ON DELETE CASCADE,
    mastery_score DECIMAL(3,2) DEFAULT 0.00 CHECK (mastery_score >= 0 AND mastery_score <= 1.00),
    last_practiced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    times_practiced INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, concept_id)
);

-- Practice sessions table
CREATE TABLE public.practice_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES public.math_concepts(concept_id) ON DELETE SET NULL,
    problems_attempted INTEGER DEFAULT 0,
    problems_correct INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_content_chunks_concept_id ON public.content_chunks(concept_id);
CREATE INDEX idx_content_chunks_embedding ON public.content_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_practice_problems_concept_id ON public.practice_problems(concept_id);
CREATE INDEX idx_concepts_mastered_user_id ON public.concepts_mastered(user_id);
CREATE INDEX idx_concepts_mastered_concept_id ON public.concepts_mastered(concept_id);
CREATE INDEX idx_practice_sessions_user_id ON public.practice_sessions(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.math_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts_mastered ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Math concepts are public (readable by all)
CREATE POLICY "Math concepts are viewable by everyone" ON public.math_concepts
    FOR SELECT USING (true);

-- Content chunks are public (readable by all)
CREATE POLICY "Content chunks are viewable by everyone" ON public.content_chunks
    FOR SELECT USING (true);

-- Practice problems are public (readable by all)
CREATE POLICY "Practice problems are viewable by everyone" ON public.practice_problems
    FOR SELECT USING (true);

-- Users can only see their own progress
CREATE POLICY "Users can view own progress" ON public.concepts_mastered
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.concepts_mastered
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.concepts_mastered
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own practice sessions
CREATE POLICY "Users can view own sessions" ON public.practice_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.practice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.practice_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();












