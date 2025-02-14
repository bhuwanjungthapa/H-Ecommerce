import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test fetching admin_users
async function fetchAdminUsers() {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*');
  
  console.log('Admin Users Data:', data);
  if (error) console.error('Error:', error);
}

fetchAdminUsers();
