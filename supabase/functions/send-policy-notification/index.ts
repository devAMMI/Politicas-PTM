import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationPayload {
  policyTitle: string;
  policyNumber: string;
  category: string;
  department?: string;
  authorName: string;
  summary?: string;
  content?: string;
  publishedAt: string;
  createdByEmail?: string;
  policyUrl?: string;
  coverImageUrl?: string;
  documentUrl?: string;
  documentName?: string;
  isInternal?: boolean;
  version?: string;
}

async function getMsAccessToken(): Promise<string> {
  const tenantId     = Deno.env.get("MS365_TENANT_ID")!;
  const clientId     = Deno.env.get("MS365_CLIENT_ID")!;
  const clientSecret = Deno.env.get("MS365_CLIENT_SECRET")!;

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         "https://graph.microsoft.com/.default",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token error: ${err}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

async function sendMail(
  token: string,
  to: string,
  subject: string,
  html: string,
  attachments: { name: string; contentBytes: string; contentType: string }[] = []
): Promise<void> {
  const sender = Deno.env.get("MS365_SENDER_EMAIL") ?? "helpdesk@ammi.com";

  const body: Record<string, unknown> = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: to } }],
      from: { emailAddress: { address: sender, name: "PTM · Gobierno Corporativo" } },
      ...(attachments.length > 0
        ? {
            attachments: attachments.map(a => ({
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: a.name,
              contentType: a.contentType,
              contentBytes: a.contentBytes,
            })),
          }
        : {}),
    },
    saveToSentItems: false,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendMail error to ${to}: ${err}`);
  }
}

async function fetchPdfAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    // Only attach if under 3MB to stay within edge function memory limits
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 3 * 1024 * 1024) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 3 * 1024 * 1024) return null;
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return null;
  }
}

function buildHtml(p: NotificationPayload): string {
  const date = new Date(p.publishedAt).toLocaleDateString("es-GT", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const time = new Date(p.publishedAt).toLocaleTimeString("es-GT", {
    hour: "2-digit", minute: "2-digit",
  });

  const accessLabel = p.isInternal
    ? `<span style="display:inline-block;background:#fff3cd;color:#856404;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid #ffc107;">INTERNA</span>`
    : `<span style="display:inline-block;background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid #10b981;">EXTERNA</span>`;

  const coverSection = p.coverImageUrl
    ? `<tr>
        <td style="padding:0;">
          <img src="${p.coverImageUrl}" alt="Portada" width="600"
            style="width:100%;max-width:600px;height:220px;object-fit:cover;display:block;border-radius:0;" />
        </td>
      </tr>`
    : "";

  const summarySection = p.summary
    ? `<tr>
        <td style="padding:0 40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f0f7ff;border-left:4px solid #1d4ed8;border-radius:0 8px 8px 0;padding:16px 20px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;color:#1d4ed8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Resumen</p>
                <p style="margin:0;color:#1e293b;font-size:14px;line-height:1.7;">${p.summary}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const docSection = p.documentUrl
    ? `<tr>
        <td style="padding:0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
            <tr>
              <td style="padding:16px 20px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:14px;vertical-align:middle;">
                      <div style="width:40px;height:40px;background:#e63329;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                        <span style="color:#fff;font-size:13px;font-weight:800;line-height:40px;display:block;text-align:center;">PDF</span>
                      </div>
                    </td>
                    <td style="vertical-align:middle;">
                      <p style="margin:0;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Documento adjunto</p>
                      <p style="margin:2px 0 0;color:#1e293b;font-size:13px;font-weight:600;">${p.documentName ?? "Documento de politica"}</p>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <a href="${p.documentUrl}"
                        style="display:inline-block;background:#e63329;color:#fff;font-size:12px;font-weight:700;text-decoration:none;padding:8px 16px;border-radius:8px;">
                        Descargar
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Nueva Politica PTM</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- TOP BAR: logos -->
        <tr>
          <td style="background:#0d1f3c;padding:18px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <!-- AMMI logo (text fallback with color) -->
                  <img src="https://i.imgur.com/nwFGGgf.png" alt="AMMI" height="28"
                    style="height:28px;object-fit:contain;vertical-align:middle;opacity:0.95;" />
                  <span style="display:inline-block;width:1px;height:20px;background:rgba(255,255,255,0.2);margin:0 12px;vertical-align:middle;"></span>
                  <!-- PTM logo (text) -->
                  <img src="https://i.imgur.com/kAzFS5n.png" alt="PTM" height="26"
                    style="height:26px;object-fit:contain;vertical-align:middle;opacity:0.95;" />
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="color:#93c5fd;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Gobierno Corporativo</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO BANNER -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d1f3c 0%,#1d3a6b 60%,#1e4d8c 100%);padding:32px 40px 28px;">
            <p style="margin:0 0 6px;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
              Nueva Politica Publicada
            </p>
            <h1 style="margin:0 0 14px;color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">
              ${p.policyTitle}
            </h1>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px;">
                  <span style="display:inline-block;background:rgba(230,51,41,0.85);color:#fff;font-size:12px;font-weight:800;font-family:monospace;padding:5px 12px;border-radius:6px;letter-spacing:0.5px;">
                    ${p.policyNumber}
                  </span>
                </td>
                <td style="padding-right:8px;">
                  <span style="display:inline-block;background:rgba(255,255,255,0.12);color:#e2e8f0;font-size:11px;font-weight:600;padding:5px 12px;border-radius:6px;">
                    v${p.version ?? "1.0"}
                  </span>
                </td>
                <td>${accessLabel}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- COVER IMAGE -->
        ${coverSection}

        <!-- BODY -->
        <tr>
          <td style="padding:32px 40px 0;">

            <!-- Metadata grid -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="50%" style="padding-bottom:14px;vertical-align:top;">
                        <p style="margin:0;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Categoria</p>
                        <p style="margin:3px 0 0;color:#0d1f3c;font-size:14px;font-weight:700;">${p.category}</p>
                      </td>
                      <td width="50%" style="padding-bottom:14px;vertical-align:top;">
                        <p style="margin:0;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Area / Departamento</p>
                        <p style="margin:3px 0 0;color:#0d1f3c;font-size:14px;font-weight:700;">${p.department ?? "General"}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="50%" style="vertical-align:top;">
                        <p style="margin:0;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Autor responsable</p>
                        <p style="margin:3px 0 0;color:#0d1f3c;font-size:14px;font-weight:700;">${p.authorName}</p>
                      </td>
                      <td width="50%" style="vertical-align:top;">
                        <p style="margin:0;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Publicada</p>
                        <p style="margin:3px 0 0;color:#0d1f3c;font-size:14px;font-weight:700;text-transform:capitalize;">${date}</p>
                        <p style="margin:1px 0 0;color:#64748b;font-size:12px;">${time} (GMT-6)</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- SUMMARY -->
        ${summarySection}

        <!-- DOCUMENT -->
        ${docSection}

        <!-- PUBLISHED BY -->
        ${p.createdByEmail ? `
        <tr>
          <td style="padding:0 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;">
              <tr>
                <td style="padding:12px 18px;">
                  <p style="margin:0;color:#1d4ed8;font-size:13px;">
                    <strong>Publicada por:</strong> ${p.createdByEmail}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ""}

        <!-- CTA BUTTON -->
        ${p.policyUrl ? `
        <tr>
          <td style="padding:0 40px 36px;" align="center">
            <a href="${p.policyUrl}"
              style="display:inline-block;background:#e63329;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:15px 44px;border-radius:12px;letter-spacing:0.3px;">
              Ver Politica Completa
            </a>
          </td>
        </tr>` : ""}

        <!-- DIVIDER -->
        <tr>
          <td style="padding:0 40px;">
            <div style="height:1px;background:#e2e8f0;"></div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:24px 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <img src="https://i.imgur.com/nwFGGgf.png" alt="AMMI" height="20"
                    style="height:20px;object-fit:contain;opacity:0.5;vertical-align:middle;" />
                </td>
                <td align="right">
                  <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;text-align:right;">
                    Sistema de Gobierno Corporativo · PTM<br />
                    <span style="color:#cbd5e1;">helpdesk@ammi.com</span>
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;color:#cbd5e1;font-size:10px;text-align:center;">
              Este mensaje fue generado automaticamente. Por favor no responder directamente a este correo.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();

    const token = await getMsAccessToken();
    const subject = `[PTM] Nueva Politica: ${payload.policyTitle} · ${payload.policyNumber}`;
    const html = buildHtml(payload);

    // Fetch PDF for attachment if available (max ~8MB safe limit)
    const attachments: { name: string; contentBytes: string; contentType: string }[] = [];
    if (payload.documentUrl && payload.documentName) {
      const pdfBase64 = await fetchPdfAsBase64(payload.documentUrl);
      if (pdfBase64) {
        attachments.push({
          name: payload.documentName,
          contentBytes: pdfBase64,
          contentType: "application/pdf",
        });
      }
    }

    const recipients = [
      "kenneth@plihsa.com",
      "dev@ammi.com",
    ];

    const results = await Promise.allSettled(
      recipients.map(email => sendMail(token, email, subject, html, attachments))
    );

    const errors = results
      .filter(r => r.status === "rejected")
      .map(r => (r as PromiseRejectedResult).reason?.message ?? "Unknown error");

    if (errors.length === results.length) {
      return new Response(
        JSON.stringify({ success: false, errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sent: recipients.length - errors.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
