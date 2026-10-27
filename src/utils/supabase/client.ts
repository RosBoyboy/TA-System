import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
