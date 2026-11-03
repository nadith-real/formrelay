import nodemailer from "nodemailer";

import { escapeHtml } from "../core/response.ts";

export type SmtpCredentials = {
  host: string;
  port: number;
  username: string;
  password: string;
  security: "none" | "ssl" | "tls";
  from: string;
  to: string[];
};

export type EmailResult = { ok: boolean; error?: string };

export function parseSmtpCredentials(raw: Record<string, unknown>): SmtpCredentials {
  const toRaw = raw.to ?? raw.recipients;
  const to = Array.isArray(toRaw)
    ? toRaw.map(String)
    : String(toRaw || "")
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
  return {
    host: String(raw.host || ""),
    port: Number(raw.port || 587),
    username: String(raw.username || ""),
    password: String(raw.password || ""),
    security: (raw.security as SmtpCredentials["security"]) || "tls",
    from: String(raw.from || ""),
    to,
  };
}

function transporter(creds: SmtpCredentials) {
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.security === "ssl" || creds.port === 465,
    auth: creds.username ? { user: creds.username, pass: creds.password } : undefined,
    tls: creds.security === "none" ? { rejectUnauthorized: false } : undefined,
  });
}

export function buildEmailHtml(input: {
  formName: string;
  website?: string | null;
  createdAt: Date;
  data: Record<string, unknown>;
}): string {
  const rows = Object.entries(input.data)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #EAEAEA;color:#525252">${escapeHtml(key)}</td><td style="padding:8px 12px;border-bottom:1px solid #EAEAEA">${escapeHtml(String(value ?? ""))}</td></tr>`,
    )
    .join("");
  return `<div style="font-family:Montserrat,Arial,sans-serif;color:#171717">
    <h2 style="margin:0 0 12px">New Form Submission</h2>
    <p style="color:#525252">Form: ${escapeHtml(input.formName)}${input.website ? ` · ${escapeHtml(input.website)}` : ""}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
    <p style="color:#737373;font-size:12px;margin-top:16px">${escapeHtml(input.createdAt.toISOString())}</p>
  </div>`;
}

export async function sendEmail(
  creds: SmtpCredentials,
  subject: string,
  html: string,
): Promise<EmailResult> {
  if (!creds.host || !creds.from || !creds.to.length) {
    return { ok: false, error: "Incomplete SMTP configuration" };
  }
  try {
    await transporter(creds).sendMail({
      from: creds.from,
      to: creds.to.join(", "),
      subject,
      html,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "SMTP send failed" };
  }
}

export async function testEmail(creds: SmtpCredentials): Promise<EmailResult> {
  return sendEmail(creds, "FormRelay connection test", "<p>SMTP connection test succeeded.</p>");
}
