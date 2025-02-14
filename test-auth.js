import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test fetching admin_users and authentication
async function testAuth() {
  try {
    // First get the admin_users data
    console.log('Fetching admin users...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*');

    console.log('Admin Users Data:', adminData);
    if (adminError) console.error('Admin fetch error:', adminError);

    // Then try to sign in with existing credentials
    console.log('\nAttempting to sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@admintest.com',
      password: 'admin@admintest.com'
    });

    console.log('Sign in response:', { data: signInData, error: signInError });

    // Check current session
    console.log('\nChecking user session...');
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    console.log('Session check response:', { user, error: sessionError });

    // Try to fetch data as authenticated user
    console.log('\nTrying to fetch data as authenticated user...');
    const { data: authenticatedData, error: authenticatedError } = await supabase
      .from('admin_users')
      .select('*');

    console.log('Authenticated fetch response:', 
      { data: authenticatedData, error: authenticatedError });
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAuth();