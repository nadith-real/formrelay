import { escapeHtml } from "../core/response.ts";

export type TelegramCredentials = {
  botToken: string;
  chatIds: string[];
};

export type TelegramResult = { ok: boolean; error?: string };

function parseChatIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseTelegramCredentials(raw: Record<string, unknown>): TelegramCredentials {
  return {
    botToken: String(raw.botToken || ""),
    chatIds: parseChatIds(raw.chatIds ?? raw.chatId),
  };
}

export function buildTelegramMessage(input: {
  formName: string;
  website?: string | null;
  createdAt: Date;
  data: Record<string, unknown>;
  template?: string;
}): string {
  if (input.template) {
    let out = input.template;
    out = out.replaceAll("{form}", escapeHtml(input.formName));
    out = out.replaceAll("{website}", escapeHtml(input.website || ""));
    out = out.replaceAll("{time}", escapeHtml(input.createdAt.toISOString()));
    for (const [key, value] of Object.entries(input.data)) {
      out = out.replaceAll(`{${key}}`, escapeHtml(String(value ?? "")));
    }
    return out;
  }
  const lines = [
    "<b>New Form Submission</b>",
    "",
    `<b>Form:</b> ${escapeHtml(input.formName)}`,
  ];
  for (const [key, value] of Object.entries(input.data)) {
    lines.push(`<b>${escapeHtml(key)}:</b> ${escapeHtml(String(value ?? ""))}`);
  }
  if (input.website) lines.push(`<b>Website:</b> ${escapeHtml(input.website)}`);
  lines.push(`<b>Submission time:</b> ${escapeHtml(input.createdAt.toISOString())}`);
  return lines.join("\n");
}

export async function sendTelegramMessage(
  credentials: TelegramCredentials,
  text: string,
): Promise<TelegramResult> {
  if (!credentials.botToken) return { ok: false, error: "Missing Telegram bot token" };
  if (!credentials.chatIds.length) return { ok: false, error: "Missing Telegram chat ID" };

  const errors: string[] = [];
  for (const chatId of credentials.chatIds) {
    const url = `https://api.telegram.org/bot${credentials.botToken}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; description?: string };
      if (!res.ok || !body.ok) {
        errors.push(body.description || `HTTP ${res.status}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Telegram request failed");
    }
  }
  if (errors.length) return { ok: false, error: errors.join("; ") };
  return { ok: true };
}

export async function testTelegram(credentials: TelegramCredentials): Promise<TelegramResult> {
  return sendTelegramMessage(credentials, "<b>FormRelay</b>\nTelegram connection test succeeded.");
}
