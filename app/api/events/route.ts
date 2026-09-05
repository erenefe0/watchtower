import { listEvents } from '@/lib/store';
import { json, failure } from '@/lib/auth';
export async function GET(request: Request) {
  try {
    const data = await listEvents(new URL(request.url).searchParams);
    return json(data, 200, true);
  } catch (e) {
    return failure(e);
  }
}
