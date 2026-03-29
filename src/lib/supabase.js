import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://skdcfigtjooffalsnwbf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrZGNmaWd0am9vZmZhbHNud2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQ1MzIsImV4cCI6MjA4ODgzMDUzMn0.1A33rYXLvlRrUCbXRVT5tDsHbMyasO_OxdSHygL5WoY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
