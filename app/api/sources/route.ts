import { listSources } from '@/lib/store';
import { json, failure } from '@/lib/auth';
export async function GET() {
  try {
    return json(await listSources(), 200, true);
  } catch (e) {
    return failure(e);
  }
}
