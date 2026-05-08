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
    // Strip /doc-proxy/ prefix to get the logical clean path
    const cleanPath = url.pathname.replace(/^\/doc-proxy\/?/, "").replace(/^\//, "");

    if (!cleanPath) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

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

    if (data.status !== "published") {
      return new Response("Not available", { status: 403, headers: corsHeaders });
    }

    // Stream the file directly — iframes cannot follow cross-origin 302 redirects,
    // so we fetch the real storage URL server-side and pipe the bytes to the client.
    const fileRes = await fetch(data.document_url);

    if (!fileRes.ok) {
      return new Response("File not found in storage", { status: 404, headers: corsHeaders });
    }

    const contentType = fileRes.headers.get("content-type") ?? "application/pdf";
    const contentLength = fileRes.headers.get("content-length");

    // Derive a clean filename from the path (last segment)
    const filename = cleanPath.split("/").pop() ?? (data.document_name ?? "documento.pdf");

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    };
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    return new Response(fileRes.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
