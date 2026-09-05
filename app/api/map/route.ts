import { listEvents } from '@/lib/store';
import { json, failure } from '@/lib/auth';
export async function GET(request: Request) {
  try {
    const data = await listEvents(new URL(request.url).searchParams);
    return json(
      {
        type: 'FeatureCollection',
        truncated: data.mapTruncated,
        features: data.map.map((e) => ({
          type: 'Feature',
          id: e.id,
          geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
          properties: {
            id: e.id,
            title: e.title,
            category: e.category,
            precision: e.precision,
            status: e.status,
          },
        })),
      },
      200,
      true,
    );
  } catch (e) {
    return failure(e);
  }
}
