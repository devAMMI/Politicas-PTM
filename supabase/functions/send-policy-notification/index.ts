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
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

async function sendMail(
  token: string,
  to: string,
  subject: string,
  html: string,
  attachments: { name: string; contentBytes: string; contentType: string }[] = []
): Promise<void> {
  const sender = Deno.env.get("MS365_SENDER_EMAIL") ?? "helpdesk@ammi.com";

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    }
  );
  if (!res.ok) throw new Error(`SendMail error to ${to}: ${await res.text()}`);
}

async function fetchPdfAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const cl = res.headers.get("content-length");
    if (cl && parseInt(cl) > 3 * 1024 * 1024) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 3 * 1024 * 1024) return null;
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch { return null; }
}

function buildHtml(p: NotificationPayload): string {
  const date = new Date(p.publishedAt).toLocaleDateString("es-GT", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const time = new Date(p.publishedAt).toLocaleTimeString("es-GT", {
    hour: "2-digit", minute: "2-digit",
  });

  // Logos — hosted external URLs used in the APP header
  const logoAmmi     = "https://i.imgur.com/nwFGGgf.png";
  const logoMillfood = "https://i.imgur.com/kAzFS5n.png";
  const logoPTM      = "https://i.imgur.com/FpiAvCx.png"; // provided by user

  const coverSection = p.coverImageUrl
    ? `<tr><td style="padding:0 0 0 0;">
        <img src="${p.coverImageUrl}" alt="Portada" width="600"
          style="width:100%;max-width:600px;height:260px;object-fit:cover;display:block;" />
        <p style="margin:0;padding:6px 0 0;color:#64748b;font-size:11px;text-align:center;font-style:italic;">Click para ampliar</p>
      </td></tr>`
    : "";

  const contentPreview = p.summary
    ? `<tr><td style="padding:20px 36px 8px;">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.75;">${p.summary}</p>
        ${p.policyUrl ? `<p style="margin:10px 0 0;"><a href="${p.policyUrl}" style="color:#1d4ed8;font-size:13px;font-weight:600;text-decoration:none;">Ver mas...</a></p>` : ""}
      </td></tr>`
    : "";

  const docSection = p.documentUrl
    ? `<tr><td style="padding:16px 36px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:14px 18px;background:#f8fafc;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:10px;vertical-align:middle;">
                          <div style="width:32px;height:32px;background:#e63329;border-radius:6px;text-align:center;line-height:32px;">
                            <span style="color:#fff;font-size:11px;font-weight:800;">PDF</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;color:#374151;font-size:13px;font-weight:600;">${p.documentName ?? "Documento de politica"}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${p.documentUrl}"
                      style="display:inline-block;background:#0d1f3c;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:8px 18px;border-radius:8px;">
                      &#8599; Pantalla completa
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- PDF mini-preview strip -->
          <tr>
            <td style="background:#1e293b;padding:28px 36px;text-align:center;">
              <img src="${logoPTM}" alt="PTM" height="52"
                style="height:52px;object-fit:contain;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />
              <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">POLITICA INTERNA</p>
              <p style="margin:6px 0 0;color:#ffffff;font-size:16px;font-weight:800;">${p.policyTitle}</p>
              <table cellpadding="0" cellspacing="0" style="margin:20px auto 0;border-top:1px solid #334155;padding-top:16px;width:100%;">
                <tr>
                  <td style="padding:0 16px;text-align:center;border-right:1px solid #334155;">
                    <p style="margin:0;color:#94a3b8;font-size:10px;">Empresa</p>
                    <p style="margin:2px 0 0;color:#e2e8f0;font-size:12px;font-weight:700;">PTM.</p>
                  </td>
                  <td style="padding:0 16px;text-align:center;border-right:1px solid #334155;">
                    <p style="margin:0;color:#94a3b8;font-size:10px;">Version</p>
                    <p style="margin:2px 0 0;color:#e2e8f0;font-size:12px;font-weight:700;">${p.version ?? "1.0"}</p>
                  </td>
                  <td style="padding:0 16px;text-align:center;border-right:1px solid #334155;">
                    <p style="margin:0;color:#94a3b8;font-size:10px;">Fecha</p>
                    <p style="margin:2px 0 0;color:#e2e8f0;font-size:12px;font-weight:700;">${new Date(p.publishedAt).toLocaleDateString("es-GT", { month: "long", year: "numeric" })}</p>
                  </td>
                  <td style="padding:0 16px;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:10px;">Clasificacion</p>
                    <p style="margin:2px 0 0;color:#e2e8f0;font-size:12px;font-weight:700;">${p.isInternal ? "Uso Interno" : "Externa"}</p>
                  </td>
                </tr>
              </table>
              <div style="margin-top:20px;">
                <a href="${p.documentUrl}"
                  style="display:inline-block;background:#e63329;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 28px;border-radius:8px;">
                  Descargar PDF
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Nueva Politica PTM</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="620" cellpadding="0" cellspacing="0"
        style="max-width:620px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">

        <!-- ── NAVBAR (replica exacta del header de la APP) ── -->
        <tr>
          <td style="background:#0d1f3c;padding:0 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height:52px;vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <!-- AMMI -->
                      <td style="vertical-align:middle;padding-right:14px;">
                        <img src="${logoAmmi}" alt="ammi" height="24"
                          style="height:24px;display:block;object-fit:contain;opacity:0.92;" />
                      </td>
                      <!-- separator -->
                      <td style="vertical-align:middle;padding-right:14px;">
                        <div style="width:1px;height:18px;background:rgba(255,255,255,0.2);"></div>
                      </td>
                      <!-- PLIHSA badge (teal pill like in the APP) -->
                      <td style="vertical-align:middle;padding-right:14px;">
                        <span style="display:inline-block;background:#0ea5e9;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;letter-spacing:0.3px;">PLIHSA</span>
                      </td>
                      <!-- separator -->
                      <td style="vertical-align:middle;padding-right:14px;">
                        <div style="width:1px;height:18px;background:rgba(255,255,255,0.2);"></div>
                      </td>
                      <!-- Millfoods -->
                      <td style="vertical-align:middle;">
                        <img src="${logoMillfood}" alt="millfoods" height="22"
                          style="height:22px;display:block;object-fit:contain;opacity:0.92;" />
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="color:#93c5fd;font-size:11px;font-weight:500;letter-spacing:0.5px;">Gobierno Corporativo</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── HERO BANNER (replica del card azul de la APP) ── -->
        <tr>
          <td style="background:linear-gradient(160deg,#0d1f3c 0%,#1a3a6b 55%,#1e4d8c 100%);padding:28px 32px 24px;">

            <!-- Badges row: categoria | POL-XXXX | v1.0 | departamento -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
              <tr>
                <td style="padding-right:6px;">
                  <span style="display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#e2e8f0;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">
                    ${p.category}
                  </span>
                </td>
                <td style="padding-right:6px;">
                  <span style="display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#e2e8f0;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;font-family:monospace;">
                    ${p.policyNumber}
                  </span>
                </td>
                <td style="padding-right:6px;">
                  <span style="display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#e2e8f0;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">
                    v${p.version ?? "1.0"}
                  </span>
                </td>
                ${p.department ? `<td>
                  <span style="display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#e2e8f0;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">
                    ${p.department}
                  </span>
                </td>` : ""}
              </tr>
            </table>

            <!-- Title -->
            <h1 style="margin:0 0 10px;color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">
              ${p.policyTitle}
            </h1>

            <!-- Summary preview inside hero -->
            ${p.summary ? `<p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.6;">${p.summary}</p>` : ""}
          </td>
        </tr>

        <!-- ── META ROW (fecha · hora · autor) ── -->
        <tr>
          <td style="background:#ffffff;padding:16px 32px;border-bottom:1px solid #f1f5f9;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <!-- calendar icon + date -->
                <td style="padding-right:20px;vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:6px;color:#64748b;font-size:14px;">&#128197;</td>
                      <td style="color:#374151;font-size:12px;font-weight:500;text-transform:capitalize;">${date}</td>
                    </tr>
                  </table>
                </td>
                <!-- clock icon + time -->
                <td style="padding-right:20px;vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:6px;color:#64748b;font-size:14px;">&#128336;</td>
                      <td style="color:#374151;font-size:12px;font-weight:500;">${time} hrs</td>
                    </tr>
                  </table>
                </td>
                <!-- person icon + author -->
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:6px;color:#64748b;font-size:14px;">&#128100;</td>
                      <td style="color:#374151;font-size:12px;font-weight:500;">${p.authorName}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── COVER IMAGE ── -->
        ${coverSection}

        <!-- ── CONTENT PREVIEW ── -->
        ${contentPreview}

        <!-- ── PDF DOCUMENT SECTION ── -->
        ${docSection}

        <!-- ── PUBLISHED BY ── -->
        ${p.createdByEmail ? `
        <tr>
          <td style="padding:0 36px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
              <tr>
                <td style="padding:10px 16px;">
                  <p style="margin:0;color:#1d4ed8;font-size:12px;">
                    <strong>Publicada por:</strong> ${p.createdByEmail}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ""}

        <!-- ── CTA ── -->
        ${p.policyUrl ? `
        <tr>
          <td style="padding:0 36px 32px;" align="center">
            <a href="${p.policyUrl}"
              style="display:inline-block;background:#0d1f3c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:13px 40px;border-radius:10px;letter-spacing:0.3px;">
              Ver Politica en la App
            </a>
          </td>
        </tr>` : ""}

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="${logoPTM}" alt="PTM" height="28"
                    style="height:28px;object-fit:contain;opacity:0.75;" />
                </td>
                <td align="right" style="vertical-align:middle;">
                  <p style="margin:0;color:#94a3b8;font-size:11px;text-align:right;line-height:1.5;">
                    Sistema de Gobierno Corporativo · PTM<br />
                    <span style="color:#cbd5e1;">helpdesk@ammi.com</span>
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 0;color:#cbd5e1;font-size:10px;text-align:center;">
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
    const subject = `[PTM] Nueva Politica · ${payload.policyTitle} — ${payload.policyNumber}`;
    const html = buildHtml(payload);

    const attachments: { name: string; contentBytes: string; contentType: string }[] = [];
    if (payload.documentUrl && payload.documentName) {
      const b64 = await fetchPdfAsBase64(payload.documentUrl);
      if (b64) attachments.push({ name: payload.documentName, contentBytes: b64, contentType: "application/pdf" });
    }

    const recipients = ["kenneth@plihsa.com", "dev@ammi.com"];

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
