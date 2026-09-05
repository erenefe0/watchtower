import { eventDetail } from '@/lib/store';
import { json, failure } from '@/lib/auth';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const detail = await eventDetail(id);
    return detail
      ? json(detail, 200, true)
      : json({ error: 'Olay bulunamadı veya geri çekildi.' }, 404);
  } catch (e) {
    return failure(e);
  }
}
