#!/usr/bin/env python3
"""
Test script to verify Supabase connection and database setup.
Run this after completing the Supabase setup steps.
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from lib.supabase_client import get_supabase_client
except ImportError:
    print("❌ Error: Could not import supabase_client")
    print("Make sure you have installed the required packages:")
    print("  pip install supabase python-dotenv")
    sys.exit(1)


def test_connection():
    """Test basic Supabase connection"""
    print("🔍 Testing Supabase connection...")
    
    try:
        client = get_supabase_client()
        print("✅ Supabase client created successfully")
        return client
    except Exception as e:
        print(f"❌ Failed to create Supabase client: {e}")
        print("\n💡 Make sure you have:")
        print("  1. Created a .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        print("  2. Set the correct values from your Supabase project")
        return None


def test_math_concepts(client):
    """Test querying math_concepts table"""
    print("\n🔍 Testing math_concepts table...")
    
    try:
        result = client.table('math_concepts').select('*').limit(5).execute()
        
        if result.data:
            print(f"✅ Successfully queried math_concepts table")
            print(f"   Found {len(result.data)} concept(s):")
            for concept in result.data:
                print(f"   - {concept.get('name', 'N/A')} ({concept.get('topic_category', 'N/A')})")
        else:
            print("⚠️  Table exists but is empty")
            print("   Run supabase/seed_data.sql to add sample data")
        return True
    except Exception as e:
        print(f"❌ Failed to query math_concepts: {e}")
        print("\n💡 Make sure you have:")
        print("  1. Run the migration SQL (supabase/migrations/001_initial_schema.sql)")
        print("  2. Enabled the pgvector extension in Supabase dashboard")
        return False


def test_content_chunks(client):
    """Test content_chunks table and vector extension"""
    print("\n🔍 Testing content_chunks table and pgvector...")
    
    try:
        result = client.table('content_chunks').select('chunk_id, concept_id').limit(1).execute()
        print("✅ content_chunks table exists")
        
        # Check if pgvector is enabled by trying to query embedding column
        try:
            result = client.rpc('vector_dims', {'embedding': None}).execute()
            print("✅ pgvector extension appears to be enabled")
        except:
            print("⚠️  Could not verify pgvector extension (this is okay if table is empty)")
        return True
    except Exception as e:
        print(f"❌ Failed to query content_chunks: {e}")
        return False


def test_practice_problems(client):
    """Test practice_problems table"""
    print("\n🔍 Testing practice_problems table...")
    
    try:
        result = client.table('practice_problems').select('problem_id, concept_id, difficulty').limit(3).execute()
        
        if result.data:
            print(f"✅ Successfully queried practice_problems table")
            print(f"   Found {len(result.data)} problem(s)")
        else:
            print("⚠️  Table exists but is empty")
        return True
    except Exception as e:
        print(f"❌ Failed to query practice_problems: {e}")
        return False


def test_users_table(client):
    """Test users table"""
    print("\n🔍 Testing users table...")
    
    try:
        result = client.table('users').select('id, name, email').limit(1).execute()
        print("✅ users table exists and is accessible")
        return True
    except Exception as e:
        print(f"❌ Failed to query users: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("MathMentor - Supabase Connection Test")
    print("=" * 60)
    
    # Check environment variables
    if not os.getenv('SUPABASE_URL'):
        print("❌ SUPABASE_URL not found in environment variables")
        print("   Create a .env file with your Supabase credentials")
        sys.exit(1)
    
    if not os.getenv('SUPABASE_SERVICE_ROLE_KEY'):
        print("❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables")
        print("   Add it to your .env file")
        sys.exit(1)
    
    # Test connection
    client = test_connection()
    if not client:
        sys.exit(1)
    
    # Run tests
    tests = [
        test_math_concepts,
        test_content_chunks,
        test_practice_problems,
        test_users_table,
    ]
    
    results = []
    for test in tests:
        results.append(test(client))
    
    # Summary
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All tests passed! Your Supabase setup is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the errors above and:")
        print("   1. Verify your .env file has correct values")
        print("   2. Make sure migrations have been run")
        print("   3. Check Supabase dashboard for any errors")
    
    print("=" * 60)


if __name__ == '__main__':
    main()









