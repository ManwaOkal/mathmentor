/**
 * Test script to verify Supabase connection and database setup.
 * Run this after completing the Supabase setup steps.
 * 
 * Usage:
 *   node test_supabase.js
 *   or
 *   npm run test:supabase
 */

require('dotenv').config();

// For Node.js, we need to create the client directly since the lib file uses ES6 imports
let supabase;
try {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} catch (error) {
  console.error('❌ Error: Could not create Supabase client');
  console.error('Make sure you have installed the required packages:');
  console.error('  npm install @supabase/supabase-js dotenv');
  console.error('Error:', error.message);
  process.exit(1);
}

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test basic connection by querying a system table
    const { data, error } = await supabase.from('math_concepts').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is okay
      throw error;
    }
    
    console.log('✅ Supabase client connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    console.log('\n💡 Make sure you have:');
    console.log('  1. Created a .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.log('  2. Set the correct values from your Supabase project');
    return false;
  }
}

async function testMathConcepts() {
  console.log('\n🔍 Testing math_concepts table...');
  
  try {
    const { data, error } = await supabase
      .from('math_concepts')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`✅ Successfully queried math_concepts table`);
      console.log(`   Found ${data.length} concept(s):`);
      data.forEach(concept => {
        console.log(`   - ${concept.name || 'N/A'} (${concept.topic_category || 'N/A'})`);
      });
    } else {
      console.log('⚠️  Table exists but is empty');
      console.log('   Run supabase/seed_data.sql to add sample data');
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to query math_concepts:', error.message);
    console.log('\n💡 Make sure you have:');
    console.log('  1. Run the migration SQL (supabase/migrations/001_initial_schema.sql)');
    console.log('  2. Enabled the pgvector extension in Supabase dashboard');
    return false;
  }
}

async function testContentChunks() {
  console.log('\n🔍 Testing content_chunks table and pgvector...');
  
  try {
    const { data, error } = await supabase
      .from('content_chunks')
      .select('chunk_id, concept_id')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ content_chunks table exists');
    console.log('⚠️  Could not verify pgvector extension (this is okay if table is empty)');
    return true;
  } catch (error) {
    console.error('❌ Failed to query content_chunks:', error.message);
    return false;
  }
}

async function testPracticeProblems() {
  console.log('\n🔍 Testing practice_problems table...');
  
  try {
    const { data, error } = await supabase
      .from('practice_problems')
      .select('problem_id, concept_id, difficulty')
      .limit(3);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`✅ Successfully queried practice_problems table`);
      console.log(`   Found ${data.length} problem(s)`);
    } else {
      console.log('⚠️  Table exists but is empty');
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to query practice_problems:', error.message);
    return false;
  }
}

async function testUsersTable() {
  console.log('\n🔍 Testing users table...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ users table exists and is accessible');
    return true;
  } catch (error) {
    console.error('❌ Failed to query users:', error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('MathMentor - Supabase Connection Test');
  console.log('='.repeat(60));
  
  // Check environment variables
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL not found in environment variables');
    console.error('   Create a .env file with your Supabase credentials');
    process.exit(1);
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
    console.error('   Add it to your .env file');
    process.exit(1);
  }
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  // Run tests
  const results = await Promise.all([
    testMathConcepts(),
    testContentChunks(),
    testPracticeProblems(),
    testUsersTable(),
  ]);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed! Your Supabase setup is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above and:');
    console.log('   1. Verify your .env file has correct values');
    console.log('   2. Make sure migrations have been run');
    console.log('   3. Check Supabase dashboard for any errors');
  }
  
  console.log('='.repeat(60));
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

