import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
// To bypass RLS and query all rows, we should use the service role key.
// But we only have anon key in .env. We will just use anon key and hope the login role allows it.
// Wait, the anon key won't have the jwt role of admin! It will just be anon.
// So RLS will block us from seeing anything but our own profile if we log in, and 0 rows if anon.
// Let's use the service role key from .env if it exists.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data, error } = await supabase.from('users').select('*');
  console.log('All Users:', data);
  console.log('Error:', error);
}
check();
