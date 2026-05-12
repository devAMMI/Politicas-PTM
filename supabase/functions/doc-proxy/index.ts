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
    const url = new URL(req.url);
    // Strip leading /doc-proxy/ or /doc-proxy prefix
    const cleanPath = url.pathname.replace(/^\/doc-proxy\/?/, "").replace(/^\//, "");

    if (!cleanPath) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Try policies table first
    const { data: policy } = await supabase
      .from("policies")
      .select("document_url, status")
      .eq("document_clean_path", cleanPath)
      .maybeSingle();

    let fileUrl: string | null = null;

    if (policy) {
      if (policy.status !== "published") {
        return new Response("Not available", { status: 403, headers: corsHeaders });
      }
      fileUrl = policy.document_url;
    } else {
      // 2. Fallback: serve directly from Storage using the signed URL API
      //    (works for public buckets too — just build the public URL)
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(cleanPath, 60); // 60-second signed URL

      if (signed?.signedUrl) {
        fileUrl = signed.signedUrl;
      }
    }

    if (!fileUrl) {
      return new Response("Document not found", { status: 404, headers: corsHeaders });
    }

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return new Response("File not found in storage", { status: 502, headers: corsHeaders });
    }

    const contentType   = fileRes.headers.get("content-type") ?? "application/pdf";
    const contentLength = fileRes.headers.get("content-length");
    const filename      = cleanPath.split("/").pop() ?? "documento.pdf";

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    };
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    return new Response(fileRes.body, { status: 200, headers: responseHeaders });
  } catch (err) {
    console.error(err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
