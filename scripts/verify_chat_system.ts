
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Cargar variables de entorno manualmente para evitar dependencias
function loadEnv() {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) {
        console.error("❌ No se encontró .env.local");
        return;
    }
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ""); // Remove quotes
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

loadEnv();

// 2. Definiciones y Configuración
const REQUIRED_VARS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PUSHER_APP_ID",
    "PUSHER_KEY",
    "PUSHER_SECRET",
    "PUSHER_CLUSTER",
    "FEATURE_CHAT_V2_ENABLED"
];

const REQUIRED_TABLES = [
    "chat_conversations",
    "chat_messages",
    "chat_conversation_members",
    "user_presence",
    "profiles"
];

const REQUIRED_FUNCTIONS = [
    "chat_get_conversations_v2",
    "update_user_presence",
    "mark_messages_delivered",
    "mark_messages_read"
];

interface CheckResult {
    status: "OK" | "ERROR" | "WARNING";
    message: string;
    details?: any;
}

const results: Record<string, CheckResult> = {};

async function runChecks() {
    console.log("🔍 Iniciando diagnóstico del sistema de chat...");

    // Check 1: Variables de Entorno
    const missingVars = REQUIRED_VARS.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        results["env_vars"] = { status: "ERROR", message: "Faltan variables de entorno", details: missingVars };
    } else {
        results["env_vars"] = { status: "OK", message: "Todas las variables requeridas están presentes" };
    }

    // Check 2: Feature Flags
    const featureEnabled = process.env.FEATURE_CHAT_V2_ENABLED === "true";
    results["feature_flag"] = {
        status: featureEnabled ? "OK" : "ERROR",
        message: `FEATURE_CHAT_V2_ENABLED es '${process.env.FEATURE_CHAT_V2_ENABLED}'`
    };

    // Check 3: Conexión Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.log(JSON.stringify(results, null, 2));
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    // Check 4: Tablas (usando inserción fake o select simple si rpc fails, pero mejor usar postgres metadata si es posible via rpc o directo)
    // Al ser service role, no tenemos acceso directo a information_schema via API standard salvo que hayamos expuesto una funcion.
    // Pero podemos intentar hacer un select limit 0 a cada tabla.

    const tableChecks: Record<string, string> = {};
    for (const table of REQUIRED_TABLES) {
        const { error } = await supabase.from(table).select("*").limit(0);
        if (error) {
            // Si el error es 42P01 (undefined_table)
            if (error.code === '42P01') {
                tableChecks[table] = "MISSING";
            } else {
                tableChecks[table] = `ERROR: ${error.message}`;
            }
        } else {
            tableChecks[table] = "EXISTS";
        }
    }

    const missingTables = Object.entries(tableChecks).filter(([_, status]) => status !== "EXISTS");
    if (missingTables.length > 0) {
        results["tables"] = { status: "ERROR", message: "Tablas faltantes o inaccesibles", details: tableChecks };
    } else {
        results["tables"] = { status: "OK", message: "Todas las tablas existen" };
    }

    // Check 5: Columnas específicas en chat_messages
    const { data: msgData, error: msgError } = await supabase.from("chat_messages").select("delivered_at, read_at").limit(0);
    if (msgError) {
        results["columns_messages"] = { status: "ERROR", message: "Columnas delivered_at/read_at no detectadas", details: msgError.message };
    } else {
        results["columns_messages"] = { status: "OK", message: "Columnas de estado de mensaje existen" };
    }

    // Check 6: Funciones RPC
    const functionChecks: Record<string, string> = {};
    for (const func of REQUIRED_FUNCTIONS) {
        // Intentamos llamar la funcion con argumentos nulos o invalidos para ver si existe (error code distinto a 'function does not exist')
        // O mejor, consultamos pg_proc si podemos via rpc custom, pero como no sabemos si existe una funcion 'exec_sql', probamos llamar.
        // update_user_presence requiere args.
        try {
            let args = {};
            if (func === 'chat_get_conversations_v2') args = { p_user_id: '00000000-0000-0000-0000-000000000000' };
            if (func === 'update_user_presence') args = { p_user_id: '00000000-0000-0000-0000-000000000000', p_is_online: false };

            const { error } = await supabase.rpc(func, args);
            if (error && error.message && error.message.includes("function") && error.message.includes("does not exist")) {
                functionChecks[func] = "MISSING";
            } else {
                // Si da otro error (ej. permission denied, violacion de llave foranea, etc) entonces la función EXISTE.
                functionChecks[func] = "EXISTS";
            }
        } catch (e) {
            functionChecks[func] = "UNKNOWN";
        }
    }

    const missingFunctions = Object.entries(functionChecks).filter(([_, status]) => status === "MISSING");
    if (missingFunctions.length > 0) {
        results["functions"] = { status: "ERROR", message: "Funciones RPC faltantes", details: functionChecks };
    } else {
        results["functions"] = { status: "OK", message: "Funciones RPC parecen existir" };
    }

    console.log(JSON.stringify(results, null, 2));
}

runChecks().catch(e => {
    console.error(e);
    process.exit(1);
});
