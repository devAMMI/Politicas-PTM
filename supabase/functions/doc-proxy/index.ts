import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Extract the clean path from the URL
    // Request comes in as: /doc-proxy/politicas/RRHH/PTM/nombre.pdf
    const url = new URL(req.url);
    // Strip the leading /doc-proxy/ prefix to get the logical path
    const cleanPath = url.pathname.replace(/^\/doc-proxy\/?/, "").replace(/^\//, "");

    if (!cleanPath) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    // Look up the real storage URL in the database by clean path
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("policies")
      .select("document_url, document_name, status")
      .eq("document_clean_path", cleanPath)
      .maybeSingle();

    if (error || !data || !data.document_url) {
      return new Response("Document not found", { status: 404, headers: corsHeaders });
    }

    // Only allow access to published documents (public proxy)
    // For admin use, the raw Supabase URL is used directly
    if (data.status !== "published") {
      return new Response("Not available", { status: 403, headers: corsHeaders });
    }

    // 302 redirect to the real Supabase Storage URL
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": data.document_url,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
