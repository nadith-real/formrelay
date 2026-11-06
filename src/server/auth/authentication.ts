import bcrypt from "bcryptjs";
import { loadConfig } from "../core/config";

let hashedPassword: string | null = null;

async function getHashedPassword(): Promise<string> {
  if (!hashedPassword) {
    hashedPassword = await bcrypt.hash(loadConfig().APP_PASSWORD, 12);
  }
  return hashedPassword;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const config = loadConfig();
  if (username !== config.APP_USERNAME) return false;
  const hash = await getHashedPassword();
  return bcrypt.compare(password, hash);
}
