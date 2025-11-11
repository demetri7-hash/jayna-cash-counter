/**
 * TipShare - Supabase Client Initialization
 * This file initializes the Supabase client for all pages
 */

// Import Supabase from CDN (loaded in HTML)
const { createClient } = supabase;

// PASTE YOUR CREDENTIALS HERE (from Vercel Environment Variables)
// Find these in: Vercel Dashboard -> Settings -> Environment Variables
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'; // Your public anon key

// Initialize Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make available globally
window.supabaseClient = supabaseClient;

console.log('✅ Supabase client initialized');
