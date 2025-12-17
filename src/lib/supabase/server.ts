import {
  createServerComponentClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Para Server Components
export async function createClient() {
  const cookieStore = await cookies();
  // @ts-ignore
  return createServerComponentClient({ cookies: () => cookieStore });
}

// Para Route Handlers (app/**/route.ts)
export async function createRouteClient() {
  const cookieStore = await cookies();
  // @ts-ignore
  return createRouteHandlerClient({ cookies: () => cookieStore });
}
