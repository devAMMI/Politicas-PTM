import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_STORAGE_BASE = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/documents/`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const cleanPath = url.pathname.replace(/^\/doc-proxy\/?/, "").replace(/^\//, "");

    if (!cleanPath) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Try resolving from policies table
    const { data: policy } = await supabase
      .from("policies")
      .select("document_url, document_name, status")
      .eq("document_clean_path", cleanPath)
      .maybeSingle();

    let fileUrl: string | null = null;

    if (policy) {
      if (policy.status !== "published") {
        return new Response("Not available", { status: 403, headers: corsHeaders });
      }
      fileUrl = policy.document_url;
    } else {
      // 2. Fallback: match any app_settings whose value equals this clean_path
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("value", cleanPath)
        .maybeSingle();

      if (setting?.value) {
        fileUrl = `${SUPABASE_STORAGE_BASE}${cleanPath}`;
      }
    }

    if (!fileUrl) {
      return new Response("Document not found", { status: 404, headers: corsHeaders });
    }

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return new Response("File not found in storage", { status: 404, headers: corsHeaders });
    }

    const contentType = fileRes.headers.get("content-type") ?? "application/pdf";
    const contentLength = fileRes.headers.get("content-length");
    const filename = cleanPath.split("/").pop() ?? "documento.pdf";

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    };
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    return new Response(fileRes.body, { status: 200, headers: responseHeaders });
  } catch (_err) {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
