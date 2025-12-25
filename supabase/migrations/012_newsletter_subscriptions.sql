-- Migration 012: Newsletter Subscriptions
-- This migration creates a table for storing newsletter subscription emails

CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    source VARCHAR(100), -- e.g., 'landing_page', 'footer', etc.
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email 
ON public.newsletter_subscriptions(email);

-- Create index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_active 
ON public.newsletter_subscriptions(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert subscriptions (for public signup)
CREATE POLICY "Allow public newsletter subscriptions"
ON public.newsletter_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Allow service role to read all subscriptions
CREATE POLICY "Allow service role to read subscriptions"
ON public.newsletter_subscriptions
FOR SELECT
TO service_role
USING (true);

-- Add comment
COMMENT ON TABLE public.newsletter_subscriptions IS 'Stores newsletter subscription emails from the landing page and other sources';

