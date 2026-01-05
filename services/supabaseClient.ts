import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://effurrmdyslkhpjgovwo.supabase.co';
// Using the provided anon public key for client-side operations
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZnVycm1keXNsa2hwamdvdndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTM0NTEsImV4cCI6MjA4MzE2OTQ1MX0.3YttFFHYflPyDImwyphA6mEVaOL5Bc5M2vHcrRM193E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper to save leads to Supabase 'leads' table.
 */
export const saveLeadsToSupabase = async (leads: any[]) => {
  const session = await supabase.auth.getSession();
  if (!leads.length || !session.data.session) return;
  
  const formattedLeads = leads.map(l => ({
    email: l.email,
    context: l.context,
    source: l.source,
    user_id: session.data.session.user.id // Link lead to the user
  }));

  const { error } = await supabase
    .from('leads')
    .insert(formattedLeads);

  if (error) {
    console.error('Supabase Sync Error:', error);
    throw error;
  }
};
