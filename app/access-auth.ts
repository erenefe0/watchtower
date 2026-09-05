import { headers, cookies } from 'next/headers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { runtime } from '@/db/runtime';
let cached:
  | { issuer: string; keys: ReturnType<typeof createRemoteJWKSet> }
  | undefined;
export async function getAccessUser() {
  const env = runtime(),
    issuer = env.ACCESS_TEAM_DOMAIN;
  if (
    !issuer ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) ||
    !env.ACCESS_AUD
  )
    return null;
  const h = await headers();
  const token =
    h.get('cf-access-jwt-assertion') ??
    (await cookies()).get('CF_Authorization')?.value;
  if (!token) return null;
  try {
    if (cached?.issuer !== issuer)
      cached = {
        issuer,
        keys: createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs')),
      };
    const { payload } = await jwtVerify(token, cached.keys, {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ['RS256'],
    });
    if (typeof payload.email !== 'string' || typeof payload.sub !== 'string')
      return null;
    return {
      userId: payload.sub,
      email: payload.email,
      displayName: payload.email,
    };
  } catch {
    return null;
  }
}
export const accessSignInPath = () => '/cdn-cgi/access/login';
