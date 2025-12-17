
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper to load env vars manually
function loadEnv(filePath: string) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"]|['"]$/g, '');
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
}

// Load envs
loadEnv(path.join(process.cwd(), '.env'));
loadEnv(path.join(process.cwd(), '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY || !MP_ACCESS_TOKEN) {
    console.error('Error: Missing required env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MP_ACCESS_TOKEN)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('--- Verifying Preapprovals ---');

    // 1. Try to search directly in Mercado Pago
    console.log('Searching for latest preapprovals via Mercado Pago API...');

    try {
        const res = await fetch(`https://api.mercadopago.com/preapproval/search?limit=1&status=authorized`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            console.error(`MP API Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error('Response:', text);
            return;
        }

        const json = await res.json();
        const results = json.results || [];

        if (results.length === 0) {
            console.log('No authorized preapprovals found in Mercado Pago account.');
            return;
        }

        const preapproval = results[0];
        console.log('\n--- Latest Active Preapproval (from API) ---');
        console.log(`ID: ${preapproval.id}`);
        console.log(`Status: ${preapproval.status}`);
        console.log(`Payer Email: ${preapproval.payer_email}`);
        console.log(`Reason: ${preapproval.reason}`);
        console.log(`External Reference: ${preapproval.external_reference}`);
        console.log(`Date Created: ${preapproval.date_created}`);

    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

main().catch(err => console.error(err));

