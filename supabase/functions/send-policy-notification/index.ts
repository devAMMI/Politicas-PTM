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
  // Optional: list of recipients to send to. If omitted, falls back to default list.
  recipients?: { email: string; full_name?: string }[];
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

// Convert UTC date to GMT-6 (Central America / Mexico DF)
function toGMTMinus6(utcStr: string): Date {
  const utc = new Date(utcStr);
  return new Date(utc.getTime() - 6 * 60 * 60 * 1000);
}

function formatDate(d: Date): string {
  const days   = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} de ${months[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function formatTime(d: Date): string {
  let h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "p. m." : "a. m.";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

function formatMonth(d: Date): string {
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${months[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function buildHtml(p: NotificationPayload): string {
  const local    = toGMTMinus6(p.publishedAt);
  const dateStr  = formatDate(local);
  const timeStr  = formatTime(local);
  const monthStr = formatMonth(local);

  const logoPTM = "https://i.imgur.com/FpiAvCx.png";

  // ── Sección oscura del PDF — oculta del correo, conservada para uso futuro ──
  // const docDarkSection = p.documentUrl
  //   ? `<tr>
  //       <td style="background:#0d1f3c;padding:32px 36px 28px;">
  //         <table width="100%" cellpadding="0" cellspacing="0">
  //           ... (logo, meta grid, PDF name row con "Pantalla completa", boton "Descargar PDF")
  //         </table>
  //       </td>
  //     </tr>`
  //   : "";
  const docDarkSection = "";

  // ── Hero banner azul (va DESPUÉS del doc oscuro) ──
  const heroBanner = `<tr>
    <td style="background:linear-gradient(160deg,#0d1f3c 0%,#1a3a6b 55%,#1e4d8c 100%);padding:28px 32px 24px;">
      <!-- Badges -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
        <tr>
          <td style="padding-right:6px;">
            <span style="display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#e2e8f0;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">${p.category}</span>
          </td>
          <td style="padding-right:6px;">
            <span style="display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#e2e8f0;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;font-family:monospace;">${p.policyNumber}</span>
          </td>
          <td style="padding-right:6px;">
            <span style="display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#e2e8f0;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">v${p.version ?? "1.0"}</span>
          </td>
          ${p.department ? `<td>
            <span style="display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#e2e8f0;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">${p.department}</span>
          </td>` : ""}
        </tr>
      </table>
      <h1 style="margin:0 0 10px;color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;">${p.policyTitle}</h1>
      ${p.summary ? `<p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.6;">${p.summary}</p>` : ""}
    </td>
  </tr>`;

  // ── Meta row (fecha · hora · autor) ──
  const metaRow = `<tr>
    <td style="background:#ffffff;padding:16px 32px;border-bottom:1px solid #f1f5f9;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:20px;vertical-align:middle;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:6px;font-size:14px;">&#128197;</td>
              <td style="color:#374151;font-size:12px;font-weight:500;text-transform:capitalize;">${dateStr}</td>
            </tr></table>
          </td>
          <td style="padding-right:20px;vertical-align:middle;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:6px;font-size:14px;">&#128336;</td>
              <td style="color:#374151;font-size:12px;font-weight:500;">${timeStr} hrs</td>
            </tr></table>
          </td>
          <td style="vertical-align:middle;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:6px;font-size:14px;">&#128100;</td>
              <td style="color:#374151;font-size:12px;font-weight:500;">${p.authorName}</td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

  // ── Cover image (va ABAJO, después del hero) ──
  const coverSection = p.coverImageUrl
    ? `<tr><td style="padding:0;">
        <img src="${p.coverImageUrl}" alt="Portada" width="620"
          style="width:100%;max-width:620px;height:260px;object-fit:cover;display:block;" />
        <p style="margin:0;padding:6px 0;color:#64748b;font-size:11px;text-align:center;font-style:italic;">Click para ampliar</p>
      </td></tr>`
    : "";

  // ── Content preview ──
  const contentSection = p.summary
    ? `<tr><td style="padding:20px 36px 8px;">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.75;">${p.summary}</p>
        ${p.policyUrl ? `<p style="margin:10px 0 0;"><a href="${p.policyUrl}" style="color:#1d4ed8;font-size:13px;font-weight:600;text-decoration:none;">Ver mas...</a></p>` : ""}
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

        <!-- ── NAVBAR: solo logo PTM ── -->
        <tr>
          <td style="background:#0d1f3c;padding:0 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height:56px;vertical-align:middle;">
                  <img src="${logoPTM}" alt="PTM" height="32"
                    style="height:32px;display:block;object-fit:contain;" />
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="color:#93c5fd;font-size:11px;font-weight:500;letter-spacing:0.5px;">Gobierno Corporativo</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── DOC DARK SECTION (arriba) ── -->
        ${docDarkSection}

        <!-- ── HERO BANNER ── -->
        ${heroBanner}

        <!-- ── META ROW ── -->
        ${metaRow}

        <!-- ── COVER IMAGE (abajo) ── -->
        ${coverSection}

        <!-- ── CONTENT PREVIEW ── -->
        ${contentSection}

        <!-- ── PUBLISHED BY ── -->
        ${p.createdByEmail ? `
        <tr>
          <td style="padding:16px 36px 20px;">
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
          <td style="padding:0 36px 12px;" align="center">
            <a href="${p.policyUrl}"
              style="display:inline-block;background:#0d1f3c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:13px 40px;border-radius:10px;letter-spacing:0.3px;">
              Ver Politica en la App
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 12px;" align="center">
            <a href="${p.policyUrl}"
              style="display:inline-block;background:#e63329;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:13px 40px;border-radius:10px;letter-spacing:0.3px;">
              Abrir Politica
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 32px;" align="center">
            <a href="${p.policyUrl}"
              style="display:inline-block;background:#ffffff;color:#0d1f3c;font-size:13px;font-weight:700;text-decoration:none;padding:13px 40px;border-radius:10px;letter-spacing:0.3px;border:2px solid #0d1f3c;">
              Ir a la App PTM
            </a>
          </td>
        </tr>` : ""}

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="${logoPTM}" alt="PTM" height="26"
                    style="height:26px;object-fit:contain;opacity:0.7;" />
                </td>
                <td align="right" style="vertical-align:middle;">
                  <p style="margin:0;color:#94a3b8;font-size:11px;text-align:right;line-height:1.5;">
                    Sistema de Gobierno Corporativo · PTM
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

    // PDF attachment disabled — kept for future use
    const attachments: { name: string; contentBytes: string; contentType: string }[] = [];
    // if (payload.documentUrl && payload.documentName) {
    //   const b64 = await fetchPdfAsBase64(payload.documentUrl);
    //   if (b64) attachments.push({ name: payload.documentName, contentBytes: b64, contentType: "application/pdf" });
    // }

    const recipientList = payload.recipients && payload.recipients.length > 0
      ? payload.recipients.map(r => r.email)
      : ["kenneth@plihsa.com", "dev@ammi.com"];

    const results = await Promise.allSettled(
      recipientList.map(email => sendMail(token, email, subject, html, attachments))
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
      JSON.stringify({ success: true, sent: recipientList.length - errors.length, errors }),
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
