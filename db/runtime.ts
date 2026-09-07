import { env } from 'cloudflare:workers';
export type RuntimeEnv = {
  DB: D1Database;
  AI?: {
    run(model: string, input: Record<string, string>): Promise<unknown>;
  };
  ADMIN_USER_IDS?: string;
  ADMIN_EMAILS?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  INGEST_SECRET?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_AI_TOKEN?: string;
  RELIEFWEB_APPNAME?: string;
  FIRMS_MAP_KEY?: string;
  SCHEDULER_ENABLED?: string;
};
export const runtime = () => env as unknown as RuntimeEnv;
export function db() {
  const value = runtime().DB;
  if (!value) throw new Error('Veri deposu kullanılamıyor.');
  return value;
}
export function statement(sql: string, args: unknown[] = []) {
  return db()
    .prepare(sql)
    .bind(...args);
}
export async function all<T>(sql: string, args: unknown[] = []): Promise<T[]> {
  return (await statement(sql, args).all<T>()).results;
}
export async function first<T>(
  sql: string,
  args: unknown[] = [],
): Promise<T | null> {
  return statement(sql, args).first<T>();
}
export async function run(sql: string, args: unknown[] = []) {
  return statement(sql, args).run();
}
export const now = () => new Date().toISOString();
