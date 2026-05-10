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
  publishedAt: string;
  createdByEmail?: string;
  policyUrl?: string;
}

async function getMsAccessToken(): Promise<string> {
  const tenantId  = Deno.env.get("MS365_TENANT_ID")!;
  const clientId  = Deno.env.get("MS365_CLIENT_ID")!;
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

async function sendMail(token: string, to: string, subject: string, html: string): Promise<void> {
  const sender = Deno.env.get("MS365_SENDER_EMAIL") ?? "helpdesk@ammi.com";

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
          from: { emailAddress: { address: sender, name: "PLIHSA · Gobierno Corporativo" } },
        },
        saveToSentItems: false,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendMail error to ${to}: ${err}`);
  }
}

function buildHtml(p: NotificationPayload): string {
  const date = new Date(p.publishedAt).toLocaleDateString("es-GT", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const time = new Date(p.publishedAt).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nueva Politica Publicada</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0A2647;border-radius:16px 16px 0 0;padding:32px 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Gobierno Corporativo · PLIHSA</p>
                    <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">Nueva Politica Publicada</h1>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="display:inline-block;background:#1d4ed8;color:#bfdbfe;font-size:13px;font-weight:800;font-family:monospace;padding:6px 14px;border-radius:8px;">${p.policyNumber}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px;">

              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Se ha publicado una nueva politica en el sistema de Gobierno Corporativo de PLIHSA.
              </p>

              <!-- Policy card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${p.category}${p.department ? ' · ' + p.department : ''}</p>
                    <h2 style="margin:0 0 12px;color:#0A2647;font-size:20px;font-weight:700;">${p.policyTitle}</h2>
                    ${p.summary ? `<p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">${p.summary}</p>` : ''}
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:20px;">
                          <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Autor responsable</p>
                          <p style="margin:2px 0 0;color:#1e293b;font-size:14px;font-weight:600;">${p.authorName}</p>
                        </td>
                        <td>
                          <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Fecha de publicacion</p>
                          <p style="margin:2px 0 0;color:#1e293b;font-size:14px;font-weight:600;">${date} · ${time}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${p.createdByEmail ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 20px;">
                    <p style="margin:0;color:#1d4ed8;font-size:13px;">
                      <strong>Creada por:</strong> ${p.createdByEmail}
                    </p>
                  </td>
                </tr>
              </table>` : ''}

              ${p.policyUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td align="center">
                    <a href="${p.policyUrl}" style="display:inline-block;background:#0A2647;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">
                      Ver Politica
                    </a>
                  </td>
                </tr>
              </table>` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;padding:20px 40px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                Este correo fue enviado automaticamente desde el sistema de Gobierno Corporativo PLIHSA.<br />
                <span style="color:#cbd5e1;">helpdesk@ammi.com</span>
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
    const subject = `[PLIHSA] Nueva Politica: ${payload.policyTitle} (${payload.policyNumber})`;
    const html = buildHtml(payload);

    const recipients = [
      "kenneth@plihsa.com",
      "dev@ammi.com",
    ];

    const results = await Promise.allSettled(
      recipients.map(email => sendMail(token, email, subject, html))
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
