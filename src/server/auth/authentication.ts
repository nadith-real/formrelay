import bcrypt from "bcryptjs";
import { loadConfig } from "../core/config.ts";

let hashedPassword: string | null = null;

async function getHashedPassword(): Promise<string> {
  if (!hashedPassword) {
    hashedPassword = await bcrypt.hash(loadConfig().APP_PASSWORD, 12);
  }
  return hashedPassword;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const config = loadConfig();
  if (username !== config.APP_USERNAME) {
    await bcrypt.compare(password, await getHashedPassword());
    return false;
  }
  return bcrypt.compare(password, await getHashedPassword());
}

export function extractCsrf(header: string | undefined, cookie: string | undefined): boolean {
  if (!header || !cookie) return false;
  return header === cookie;
}
