import { createClient } from '@supabase/supabase-js';

// External Supabase project configuration
// This client connects to the external Supabase project that contains
// the actual application data (CRM cards, user profiles, etc.)
const EXTERNAL_SUPABASE_URL = "https://vkfvqhilrhmuaoopiucb.supabase.co";
const EXTERNAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_q2_4ll5rcxSCbmTRc-QgEw_Lpod1V2L";

// Create an untyped client to bypass schema validation issues
// The Lovable Cloud types.ts only recognizes Lovable Cloud tables,
// but our actual data is in the external Supabase project
export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY
);

// Also export as 'supabase' for compatibility with existing imports
export const supabase = externalSupabase;
