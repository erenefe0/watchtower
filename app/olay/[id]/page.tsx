import { notFound } from 'next/navigation';
import { eventDetail } from '@/lib/store';
import { Topbar, DetailContent } from '@/components/watchtower/dashboard';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const d = await eventDetail((await params).id);
  return { title: d?.event.title ?? 'Olay bulunamadı' };
}
export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const d = await eventDetail((await params).id);
  if (!d) notFound();
  return (
    <div className="page-shell">
      <Topbar />
      <main className="detail-page">
        <a href="/" className="text-button" style={{ marginBottom: 25 }}>
          ← Olay haritasına dön
        </a>
        <DetailContent detail={d} />
      </main>
    </div>
  );
}
