import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Role = "superadmin" | "admin" | "auditor" | "viewer";

// Role hierarchy: index = rank (higher = more privileged)
const ROLE_RANK: Record<Role, number> = {
  superadmin: 3,
  admin: 2,
  auditor: 1,
  viewer: 0,
};

const VALID_ROLES = new Set<string>(["superadmin", "admin", "auditor", "viewer"]);

function canManage(callerRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[callerRole] >= ROLE_RANK[targetRole];
}

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

    const callerRole = callerAdmin.role as Role;

    // Only superadmin and admin can manage users
    if (callerRole !== "superadmin" && callerRole !== "admin") {
      return json({ error: "Forbidden: insufficient role" }, 403);
    }

    const url = new URL(req.url);
    const method = req.method;

    // ── GET (list users) ─────────────────────────────────────────────────────
    if (method === "GET") {
      let query = supabaseAdmin
        .from("admin_users")
        .select("id, email, full_name, role, is_active, created_at")
        .order("created_at", { ascending: true });

      // admin sees their level and below (admin, auditor, viewer)
      if (callerRole === "admin") {
        query = query.in("role", ["admin", "auditor", "viewer"]);
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

      if (!VALID_ROLES.has(role)) {
        return json({ error: "Invalid role" }, 400);
      }

      if (!canManage(callerRole, role as Role)) {
        return json({ error: "Forbidden: cannot create a user with a higher role than your own" }, 403);
      }

      // Look up existing auth user by email via direct DB query
      const { data: existingAuthRows } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .limit(1)
        .schema("auth");

      const existingAuthId = existingAuthRows?.[0]?.id ?? null;
      let authUserId: string;

      if (existingAuthId) {
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

      const { data: targetUser, error: targetErr } = await supabaseAdmin
        .from("admin_users")
        .select("role, is_active")
        .eq("id", id)
        .maybeSingle();

      if (targetErr) return json({ error: "DB error: " + targetErr.message }, 500);
      if (!targetUser) return json({ error: "User not found" }, 404);

      const targetRole = targetUser.role as Role;

      // Cannot manage users with higher rank (except own record)
      if (id !== caller.id && !canManage(callerRole, targetRole)) {
        return json({ error: "Forbidden: cannot modify a user with a higher role" }, 403);
      }

      // Cannot assign a role higher than own rank
      if (role !== undefined) {
        if (!VALID_ROLES.has(role)) return json({ error: "Invalid role" }, 400);
        if (!canManage(callerRole, role as Role)) {
          return json({ error: "Forbidden: cannot assign a role higher than your own" }, 403);
        }
      }

      // Nobody can deactivate themselves
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

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (method === "DELETE") {
      const id = url.searchParams.get("id");

      if (!id) return json({ error: "Missing user id" }, 400);
      if (id === caller.id) return json({ error: "No puedes eliminarte a ti mismo" }, 400);

      const { data: targetUser } = await supabaseAdmin
        .from("admin_users")
        .select("role")
        .eq("id", id)
        .maybeSingle();

      if (targetUser && !canManage(callerRole, targetUser.role as Role)) {
        return json({ error: "Forbidden: cannot delete a user with a higher role" }, 403);
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
