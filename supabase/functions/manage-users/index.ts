import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    // Verify caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) return json({ error: "Unauthorized: " + (authError?.message ?? "no user") }, 401);

    // Check caller is an active superadmin
    const { data: callerAdmin, error: callerErr } = await supabaseAdmin
      .from("admin_users")
      .select("role, is_active")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerErr) return json({ error: "DB error verifying caller: " + callerErr.message }, 500);
    if (!callerAdmin) return json({ error: "Forbidden: caller not found in admin_users (id=" + caller.id + ")" }, 403);
    if (callerAdmin.role !== "superadmin") return json({ error: "Forbidden: superadmin only (role=" + callerAdmin.role + ")" }, 403);
    if (!callerAdmin.is_active) return json({ error: "Forbidden: account inactive" }, 403);

    const url = new URL(req.url);
    const method = req.method;

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (method === "POST") {
      const { email, password, full_name, role } = await req.json();

      if (!email || !password || !full_name || !role) {
        return json({ error: "Missing required fields" }, 400);
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError || !newUser.user) {
        return json({ error: createError?.message ?? "Failed to create auth user" }, 400);
      }

      const { error: insertError } = await supabaseAdmin.from("admin_users").insert({
        id: newUser.user.id,
        email,
        full_name,
        role,
        is_active: true,
        created_by: caller.id,
      });

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return json({ error: insertError.message }, 400);
      }

      return json({ success: true, user: { id: newUser.user.id, email, full_name, role } });
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    if (method === "PUT") {
      const { id, full_name, role, is_active, password } = await req.json();

      if (!id) return json({ error: "Missing user id" }, 400);

      if (id === caller.id && is_active === false) {
        return json({ error: "No puedes desactivarte a ti mismo" }, 400);
      }

      const updates: Record<string, unknown> = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (role !== undefined) updates.role = role;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("admin_users")
          .update(updates)
          .eq("id", id);

        if (updateError) return json({ error: "DB update error: " + updateError.message }, 400);
      }

      if (password) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
        if (pwErr) return json({ error: "Password update error: " + pwErr.message }, 400);
      }

      if (is_active === false) {
        await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "876600h" });
      } else if (is_active === true) {
        await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "none" });
      }

      return json({ success: true });
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (method === "DELETE") {
      const id = url.searchParams.get("id");

      if (!id) return json({ error: "Missing user id" }, 400);
      if (id === caller.id) return json({ error: "No puedes eliminarte a ti mismo" }, 400);

      await supabaseAdmin.from("admin_users").delete().eq("id", id);
      await supabaseAdmin.auth.admin.deleteUser(id);

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, 405);

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
