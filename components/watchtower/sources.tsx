'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Radio } from 'lucide-react';
import { Topbar, formatDate } from './dashboard';
import { LANGUAGES, type SourceRecord } from '@/lib/types';
const statuses: Record<string, string> = {
  ok: 'Erişilebilir',
  pending: 'İlk çekim bekliyor',
  error: 'Erişim sorunu',
  connection_required: 'Bağlantı gerekli',
  disabled: 'Duraklatıldı',
  candidate: 'Keşfedilen yayıncı',
};
export default function SourceCatalog() {
  const [sources, setSources] = useState<SourceRecord[]>([]),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/sources')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((v) => setSources(v as SourceRecord[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  const active = sources.filter((s) => s.enabled && !s.isCandidate),
    groups = new Set(active.map((s) => s.publisherGroup));
  return (
    <div className="page-shell">
      <Topbar active="sources" />
      <main className="page-content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">KAYNAK KATALOĞU</span>
            <h1>Bilginin geldiği yer.</h1>
            <p>
              {active.length} etkin bağlantı, {groups.size} yayıncı ve kurum
              grubu. Farklı dillerdeki aynı yayıncılar tek grupta
              değerlendirilir. Erişilebilirlik, haberin doğruluğu anlamına
              gelmez.
            </p>
          </div>
          <Radio size={38} color="#dabc7f" />
        </div>
        <div className="connections-banner">
          <span>Haber akışları · 15–60 dakika hedef aralık</span>
          <span>Afet uyarıları · 5 dakika</span>
          <span>Deprem ölçümleri · 2 dakika</span>
        </div>
        {error && (
          <p role="alert" className="notice">
            Kaynak kataloğu yüklenemedi.
          </p>
        )}
        {loading && <p>Kaynaklar yükleniyor…</p>}
        <div className="source-grid">
          {sources.map((s) => {
            const stale =
              s.status === 'ok' &&
              s.lastSuccess &&
              Date.now() - Date.parse(s.lastSuccess) >
                Math.max(s.intervalMinutes * 180000, 1800000);
            return (
              <article className="source-card" key={s.id}>
                <div className="source-card-top">
                  <span>
                    {LANGUAGES[s.language] || 'Çok dilli'} ·{' '}
                    {s.kind === 'rss' ? 'RSS' : s.kind.toUpperCase()}
                  </span>
                  <span
                    className={`source-health ${stale ? 'error' : s.status}`}
                  >
                    {stale ? 'Veri gecikmiş' : statuses[s.status] || s.status}
                  </span>
                </div>
                <h2>{s.label}</h2>
                <p>{s.reuse}</p>
                <dl>
                  <div>
                    <dt>Son başarılı çekim</dt>
                    <dd>{formatDate(s.lastSuccess)}</dd>
                  </div>
                  <div>
                    <dt>Son deneme</dt>
                    <dd>{formatDate(s.lastAttempt)}</dd>
                  </div>
                  <div>
                    <dt>Alınan / güncellenen</dt>
                    <dd>{s.itemCount} bildirim</dd>
                  </div>
                </dl>
                {s.lastError && <p className="small-note">{s.lastError}</p>}
                <a
                  className="text-button permalink"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Kaynak bağlantısı
                  <ArrowUpRight size={13} />
                </a>
              </article>
            );
          })}
        </div>
        <p className="small-note" style={{ marginTop: 25 }}>
          GDELT yeni yayıncılar keşfeder. Keşfedilen yayıncıların doğrudan
          akışları yönetici incelemesinden sonra etkinleştirilir. X, Telegram,
          YouTube ve ACLED bağlantıları bu sürümde etkin değildir.
        </p>
      </main>
    </div>
  );
}
