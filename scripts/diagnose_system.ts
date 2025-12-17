import { createClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars manually
try {
    const envPath = path.join(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
} catch (e) {
    console.warn("⚠️ Could not read .env.local file");
}

async function diagnose() {
    console.log("--- STARTING SYSTEM DIAGNOSIS ---");

    // 1. Check Env Vars
    console.log("\n1. ENVIRONMENT VARIABLES");
    const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
        console.error("❌ Missing env vars:", missing.join(', '));
    } else {
        console.log("✅ All required env vars present.");
    }

    // 2. Check Database Connection
    console.log("\n2. DATABASE CONNECTION & SCHEMA");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error("❌ Cannot connect: URL or KEY missing.");
        return;
    }

    const supabase = createClient(url, key);

    // Check Profiles (Access might be restricted by RLS for anon, but we check if we get a response other than connection error)
    console.log("   Querying 'profiles' table...");
    const { data: profiles, error: profileError, count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    if (profileError) {
        console.error("❌ Profiles Query Error:", profileError.message);
        if (profileError.code === 'PGRST116') console.log("   (Hint: .single() on empty result causes this 406-like error)");
    } else {
        console.log(`✅ Profiles table accessible. Total rows: ${count}`);
    }

    // Check Chat Messages
    console.log("   Querying 'chat_messages' table...");
    const { error: chatError, count: chatCount } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true });
    if (chatError) {
        console.log(`⚠️ Chat messages access restricted (${chatError.message}). Access depends on RLS.`);
    } else {
        console.log(`✅ Chat messages table accessible (Public/Anon allowed?). Total rows: ${chatCount}`);
    }

    console.log("\n--- DIAGNOSIS COMPLETE ---");
}

diagnose();
