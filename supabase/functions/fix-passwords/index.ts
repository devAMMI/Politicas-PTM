import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const users = [
      { id: "aaf6c328-fbec-4d1d-96f5-13859709052a", email: "anna@ammi.com", password: "Temporal2026" },
      { id: "61e076f0-42f0-4a8a-9e64-bd09c9ff23f4", email: "alondra@ammi.com", password: "Temporal2026" },
    ];

    const results = [];

    for (const u of users) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
        password: u.password,
        email_confirm: true,
      });

      results.push({ email: u.email, status: error ? "error: " + error.message : "ok" });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
