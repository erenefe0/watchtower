export function createD1({ accountId, databaseId, token, request = fetch }) {
  if (!/^[a-f0-9]{32}$/.test(accountId || '') || !/^[a-f0-9-]{36}$/.test(databaseId || '') || !token) {
    throw new Error('Cloudflare collector credentials are missing or invalid.');
  }
  async function query(statements) {
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: statements.map(s => ({ sql: s.sql, params: s.params })) }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`D1 request failed (${response.status}).`);
    const data = await response.json();
    if (!data.success || !Array.isArray(data.result) || data.result.length !== statements.length || data.result.some(r => r.success === false)) {
      throw new Error('D1 query failed.');
    }
    return data.result;
  }
  class Statement {
    constructor(sql, params = []) { this.sql = sql; this.params = params; }
    bind(...params) { return new Statement(this.sql, params); }
    async all() { return (await query([this]))[0]; }
    async first() { return (await this.all()).results?.[0] ?? null; }
    async run() { return (await query([this]))[0]; }
  }
  return { prepare: sql => new Statement(sql), batch: query };
}
