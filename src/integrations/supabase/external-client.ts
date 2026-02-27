import { createClient } from '@supabase/supabase-js';

// External Supabase project configuration
// This client connects to the external Supabase project that contains
// the actual application data (CRM cards, user profiles, etc.)
const EXTERNAL_SUPABASE_URL = "https://yoauzllgwcsrmvkwdcoa.supabase.co";
const EXTERNAL_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYXV6bGxnd2Nzcm12a3dkY29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjMwNzUsImV4cCI6MjA3MTYzOTA3NX0.ZJGF9tw5b3XeTLHPByP_a7R2yrgzUae_L1lWC-AJz90";

// Create an untyped client to bypass schema validation issues
// The Lovable Cloud types.ts only recognizes Lovable Cloud tables,
// but our actual data is in the external Supabase project
export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY
);

// Also export as 'supabase' for compatibility with existing imports
export const supabase = externalSupabase;
