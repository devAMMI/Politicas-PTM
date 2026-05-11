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
    if (authError || !caller) return json({ error: "Unauthorized" }, 401);

    // Load caller profile
    const { data: callerAdmin, error: callerErr } = await supabaseAdmin
      .from("admin_users")
      .select("role, is_active")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerErr) return json({ error: "DB error: " + callerErr.message }, 500);
    if (!callerAdmin) return json({ error: "Forbidden: not an admin user" }, 403);
    if (!callerAdmin.is_active) return json({ error: "Forbidden: account inactive" }, 403);

    const isSuperadmin = callerAdmin.role === "superadmin";
    const isAdmin = callerAdmin.role === "admin";

    if (!isSuperadmin && !isAdmin) return json({ error: "Forbidden: insufficient role" }, 403);

    const url = new URL(req.url);
    const method = req.method;

    // ── GET (list users) ─────────────────────────────────────────────────────
    if (method === "GET") {
      // Admins only see admin-role users; superadmins see everyone
      let query = supabaseAdmin
        .from("admin_users")
        .select("id, email, full_name, role, is_active, created_at")
        .order("created_at", { ascending: true });

      if (isAdmin) {
        query = query.eq("role", "admin");
      }

      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ users: data });
    }

    // ── CREATE ───────────────────────────────────────────────────────────────
    if (method === "POST") {
      const { email, password, full_name, role } = await req.json();

      if (!email || !password || !full_name || !role) {
        return json({ error: "Missing required fields" }, 400);
      }

      // Admins can only create admin-role users (not superadmin)
      if (isAdmin && role === "superadmin") {
        return json({ error: "Forbidden: admins cannot create superadmin users" }, 403);
      }

      // Check if the email already exists in auth.users via direct DB query
      const { data: existingAuthRows } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .limit(1)
        .schema("auth");

      const existingAuthId = existingAuthRows?.[0]?.id ?? null;
      let authUserId: string;

      if (existingAuthId) {
        // Reuse the existing auth user — update password, metadata, and unban
        authUserId = existingAuthId;
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password,
          user_metadata: { full_name },
          email_confirm: true,
          ban_duration: "none",
        });
        if (updateErr) return json({ error: "Auth update error: " + updateErr.message }, 400);
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });
        if (createError || !newUser.user) {
          return json({ error: createError?.message ?? "Failed to create auth user" }, 400);
        }
        authUserId = newUser.user.id;
      }

      const { error: insertError } = await supabaseAdmin.from("admin_users").upsert({
        id: authUserId,
        email,
        full_name,
        role,
        is_active: true,
        created_by: caller.id,
      }, { onConflict: "id" });

      if (insertError) {
        return json({ error: insertError.message }, 400);
      }

      return json({ success: true, user: { id: authUserId, email, full_name, role } });
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────
    if (method === "PUT") {
      const { id, full_name, role, is_active, password } = await req.json();

      if (!id) return json({ error: "Missing user id" }, 400);

      // Load target user to check their role
      const { data: targetUser, error: targetErr } = await supabaseAdmin
        .from("admin_users")
        .select("role, is_active")
        .eq("id", id)
        .maybeSingle();

      if (targetErr) return json({ error: "DB error: " + targetErr.message }, 500);
      if (!targetUser) return json({ error: "User not found" }, 404);

      // Admins cannot touch superadmin accounts (except their own self-service)
      if (isAdmin && targetUser.role === "superadmin" && id !== caller.id) {
        return json({ error: "Forbidden: admins cannot modify superadmin accounts" }, 403);
      }

      // Admins cannot escalate role to superadmin
      if (isAdmin && role === "superadmin") {
        return json({ error: "Forbidden: admins cannot assign superadmin role" }, 403);
      }

      // Nobody can deactivate themselves
      if (id === caller.id && is_active === false) {
        return json({ error: "No puedes desactivarte a ti mismo" }, 400);
      }

      const updates: Record<string, unknown> = {};
      if (full_name !== undefined) updates.full_name = full_name;

      // Only superadmins can change roles, or if not changing superadmin target
      if (role !== undefined) {
        if (isAdmin && role === "superadmin") {
          return json({ error: "Forbidden: cannot assign superadmin role" }, 403);
        }
        // Admins can only set role='admin'
        if (isAdmin && role !== "admin") {
          return json({ error: "Forbidden: admins can only assign admin role" }, 403);
        }
        updates.role = role;
      }

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

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (method === "DELETE") {
      const id = url.searchParams.get("id");

      if (!id) return json({ error: "Missing user id" }, 400);
      if (id === caller.id) return json({ error: "No puedes eliminarte a ti mismo" }, 400);

      // Load target to enforce hierarchy
      const { data: targetUser } = await supabaseAdmin
        .from("admin_users")
        .select("role")
        .eq("id", id)
        .maybeSingle();

      // Admins cannot delete superadmin users
      if (isAdmin && targetUser?.role === "superadmin") {
        return json({ error: "Forbidden: admins cannot delete superadmin accounts" }, 403);
      }

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
