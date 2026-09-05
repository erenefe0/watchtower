'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  RefreshCw,
  Save,
  Split,
  Merge,
  Radio,
} from 'lucide-react';
import {
  CATEGORIES,
  COUNTRIES,
  type EventDetail,
  type EventRecord,
  type SourceRecord,
} from '@/lib/types';
import { formatDate } from './dashboard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
type AdminData = {
  sources: SourceRecord[];
  events: { id: string; title: string; status: string; sourceLabel: string }[];
  runs: {
    id: string;
    sourceId: string;
    status: string;
    accepted: number;
    startedAt: string;
    message: string | null;
  }[];
  connections: Record<string, boolean>;
};
function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
    >
      <SelectTrigger aria-label={label} className="filter-select">
        <SelectValue>{options[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([k, v]) => (
          <SelectItem value={k} key={k}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export default function AdminPanel() {
  const [data, setData] = useState<AdminData | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<EventDetail | null>(null),
    [draft, setDraft] = useState<Partial<EventRecord>>({}),
    [target, setTarget] = useState(''),
    [candidate, setCandidate] = useState<SourceRecord | null>(null),
    [feedUrl, setFeedUrl] = useState(''),
    [reuse, setReuse] = useState(''),
    [lookup, setLookup] = useState('');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    body: Record<string, unknown>;
  } | null>(null);
  const load = useCallback(async () => {
    const r = await fetch('/api/admin');
    if (!r.ok) throw new Error('Yönetim verileri yüklenemedi.');
    setData(await r.json());
  }, []);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  const select = async (id: string) => {
    setError('');
    const r = await fetch('/api/admin?event=' + encodeURIComponent(id));
    if (!r.ok) {
      setError('Olay bulunamadı.');
      return;
    }
    const d = (await r.json()) as EventDetail | null;
    if (!d) {
      setError('Olay bulunamadı.');
      return;
    }
    setSelected(d);
    setDraft(d.event);
  };
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const v = (await r.json()) as {
        error?: string;
        results?: {
          source: string;
          status: string;
          accepted: number;
          message?: string;
        }[];
        status?: string;
        id?: string;
      };
      if (!r.ok) throw new Error(v.error || 'İşlem tamamlanamadı.');
      setMessage(
        v.results
          ? v.results
              .map(
                (s: {
                  source: string;
                  status: string;
                  accepted: number;
                  message?: string;
                }) =>
                  `${s.source}: ${s.status === 'ok' ? `${s.accepted} yeni / güncellenen bildirim` : s.message || s.status}`,
              )
              .join('\n') || 'Yenilenmesi gereken kaynak yok.'
          : v.status === 'connection_required'
            ? 'Çeviri bağlantısı bekleniyor.'
            : 'İşlem kaydedildi.',
      );
      await load();
      if (selected && ['edit', 'split', 'merge'].includes(String(body.action)))
        await select(String(v.id ?? selected.event.id));
      return v;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function refreshAll() {
    if (!data) return;
    setBusy(true);
    setError('');
    const logs: string[] = [];
    for (const source of data.sources.filter(
      (s) => s.enabled && !s.isCandidate,
    )) {
      try {
        setMessage(`${source.label} alınıyor…\n${logs.join('\n')}`);
        const r = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'refresh', sourceId: source.id }),
        });
        const result = (await r.json()) as {
          error?: string;
          results: {
            source: string;
            status: string;
            accepted: number;
            message?: string;
          }[];
        };
        if (!r.ok) throw new Error(result.error);
        for (const s of result.results)
          logs.push(
            `${source.label}: ${s.status === 'ok' ? s.accepted + ' bildirim' : s.message || s.status}`,
          );
      } catch (e) {
        logs.push(
          `${source.label}: ${e instanceof Error ? e.message : 'Erişim sorunu'}`,
        );
      }
    }
    setMessage(logs.join('\n'));
    await load().catch(() => {});
    setBusy(false);
  }
  const change = (key: keyof EventRecord, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YÖNETİM</span>
          <h1>Kaynak ve olay masası</h1>
          <p>
            Kaynakları yenileyin, bildirimleri inceleyin ve gerektiğinde
            kayıtları düzeltin.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={busy || !data}
          onClick={() => void refreshAll()}
        >
          <RefreshCw size={16} className={busy ? 'spin' : ''} />
          Tüm kaynakları yenile
        </button>
      </div>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {message && (
        <div role="status" className="notice admin-log">
          {message}
        </div>
      )}
      {!data && <p>Yönetim kayıtları yükleniyor…</p>}
      {data && (
        <>
          <div className="connections-banner">
            <span>
              Zamanlayıcı:{' '}
              {data.connections.scheduler
                ? 'Yapılandırıldı'
                : 'Bağlantı bekliyor'}
            </span>
            <span>
              Çeviri:{' '}
              {data.connections.translation ? 'Bağlandı' : 'Bağlantı bekliyor'}
            </span>
            <span>
              ReliefWeb / FIRMS:{' '}
              {data.connections.reliefweb && data.connections.firms
                ? 'Bağlandı'
                : 'Ek erişim gerekli'}
            </span>
          </div>
          <Tabs defaultValue="sources">
            <TabsList>
              <TabsTrigger value="sources">Kaynaklar</TabsTrigger>
              <TabsTrigger value="events">Olay düzenleme</TabsTrigger>
              <TabsTrigger value="runs">Toplama geçmişi</TabsTrigger>
            </TabsList>
            <TabsContent value="sources">
              <section className="admin-panel">
                {data.sources.map((s) => (
                  <div className="admin-row" key={s.id}>
                    <div>
                      <strong>{s.label}</strong>
                      <small>
                        {s.isCandidate
                          ? 'Keşfedilen yayıncı'
                          : s.kind.toUpperCase()}{' '}
                        · {s.status} · Son başarılı çekim{' '}
                        {formatDate(s.lastSuccess)}
                      </small>
                    </div>
                    <div className="admin-actions" style={{ margin: 0 }}>
                      {s.enabled && !s.isCandidate && (
                        <button
                          aria-label={`${s.label} yenile`}
                          className="secondary-button"
                          disabled={busy}
                          onClick={() =>
                            void act({ action: 'refresh', sourceId: s.id })
                          }
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={() =>
                          s.isCandidate
                            ? (setCandidate(s), setFeedUrl(''), setReuse(''))
                            : void act({
                                action: 'source',
                                id: s.id,
                                enabled: !s.enabled,
                              })
                        }
                      >
                        {s.isCandidate
                          ? 'Akışı bağla'
                          : s.enabled
                            ? 'Duraklat'
                            : 'Etkinleştir'}
                      </button>
                    </div>
                  </div>
                ))}
              </section>
              {candidate && (
                <section className="admin-panel">
                  <h2>{candidate.label} · Doğrudan akış</h2>
                  <p>
                    Akış adresi keşfedilen yayıncının alan adında olmalıdır.
                  </p>
                  <form
                    className="admin-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act({
                        action: 'source',
                        id: candidate.id,
                        enabled: true,
                        url: feedUrl,
                        reuse,
                      }).then((v) => {
                        if (v) setCandidate(null);
                      });
                    }}
                  >
                    <label>
                      RSS / Atom adresi
                      <input
                        type="url"
                        required
                        value={feedUrl}
                        onChange={(e) => setFeedUrl(e.target.value)}
                      />
                    </label>
                    <label>
                      Kullanım koşulları ve atıf notu
                      <textarea
                        required
                        value={reuse}
                        onChange={(e) => setReuse(e.target.value)}
                      />
                    </label>
                    <button className="primary-button" disabled={busy}>
                      Kaynağı etkinleştir
                    </button>
                  </form>
                </section>
              )}
            </TabsContent>
            <TabsContent value="events">
              <section className="admin-panel">
                <div className="admin-actions">
                  <input
                    className="lookup-input"
                    aria-label="Olay kimliği"
                    placeholder="Olay kimliği ile bul"
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                  />
                  <button
                    className="secondary-button"
                    onClick={() => void select(lookup)}
                  >
                    Olayı aç
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => void act({ action: 'translate' })}
                  >
                    Bekleyen çevirileri işle
                  </button>
                </div>
                <Choice
                  label="Düzenlenecek olay"
                  value={selected?.event.id ?? ''}
                  onChange={(id) => void select(id)}
                  options={{
                    '': 'Bir olay seçin',
                    ...Object.fromEntries(
                      data.events.map((e) => [e.id, e.title]),
                    ),
                  }}
                />
              </section>
              {selected && (
                <section className="admin-panel">
                  <h2>Olayı düzenle</h2>
                  <small className="small-note">
                    Olay kimliği: {selected.event.id}
                  </small>
                  <form
                    className="admin-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draft.status === 'withdrawn')
                        setConfirmation({
                          title: 'Olay geri çekilsin mi?',
                          description:
                            'Kayıt halka açık haritadan kaldırılır. Yönetim panelinden yeniden yayımlanabilir.',
                          body: { action: 'edit', ...draft },
                        });
                      else void act({ action: 'edit', ...draft });
                    }}
                  >
                    <label>
                      Başlık
                      <input
                        required
                        maxLength={400}
                        value={draft.title ?? ''}
                        onChange={(e) => change('title', e.target.value)}
                      />
                    </label>
                    <label>
                      Kısa açıklama
                      <textarea
                        maxLength={600}
                        value={draft.summary ?? ''}
                        onChange={(e) => change('summary', e.target.value)}
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        Kategori
                        <Choice
                          label="Kategori"
                          value={draft.category ?? 'security'}
                          onChange={(v) => change('category', v)}
                          options={Object.fromEntries(
                            Object.entries(CATEGORIES).map(([k, v]) => [
                              k,
                              v.label,
                            ]),
                          )}
                        />
                      </label>
                      <label>
                        İnceleme durumu
                        <Choice
                          label="İnceleme durumu"
                          value={draft.status ?? 'reported'}
                          onChange={(v) => change('status', v)}
                          options={{
                            reported: 'Kaynak bildirimi',
                            reviewed: 'Editör inceledi',
                            disputed: 'İhtilaflı',
                            withdrawn: 'Geri çekildi',
                          }}
                        />
                      </label>
                      <label>
                        Ülke
                        <Choice
                          label="Ülke"
                          value={draft.country ?? ''}
                          onChange={(v) => change('country', v || null)}
                          options={{ '': 'Belirsiz', ...COUNTRIES }}
                        />
                      </label>
                      <label>
                        Yer adı
                        <input
                          value={draft.place ?? ''}
                          onChange={(e) => change('place', e.target.value)}
                        />
                      </label>
                      <label>
                        Enlem
                        <input
                          type="number"
                          step="any"
                          min="-90"
                          max="90"
                          value={draft.lat ?? ''}
                          onChange={(e) =>
                            change(
                              'lat',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value),
                            )
                          }
                        />
                      </label>
                      <label>
                        Boylam
                        <input
                          type="number"
                          step="any"
                          min="-180"
                          max="180"
                          value={draft.lon ?? ''}
                          onChange={(e) =>
                            change(
                              'lon',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value),
                            )
                          }
                        />
                      </label>
                      <label>
                        Konum kesinliği
                        <Choice
                          label="Konum kesinliği"
                          value={draft.precision ?? 'unknown'}
                          onChange={(v) => change('precision', v)}
                          options={{
                            city: 'Yaklaşık şehir',
                            exact: 'Kaynak koordinatı',
                            country: 'Yalnızca ülke',
                            unknown: 'Belirsiz',
                          }}
                        />
                      </label>
                    </div>
                    <label>
                      Konum dayanağı
                      <input
                        value={draft.locationBasis ?? ''}
                        onChange={(e) =>
                          change('locationBasis', e.target.value)
                        }
                      />
                    </label>
                    <div className="admin-actions">
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={busy}
                      >
                        <Save size={15} />
                        Değişiklikleri kaydet
                      </button>
                      <a
                        href={`/olay/${selected.event.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="secondary-button"
                      >
                        Olayı görüntüle
                        <ArrowUpRight size={15} />
                      </a>
                    </div>
                  </form>
                  <h3 className="detail-subheading">Birleştir / ayır</h3>
                  <p>
                    Birleştirilen olayın kaynakları seçtiğiniz hedef olaya
                    taşınır. Bildirimler sonradan ayrılabilir.
                  </p>
                  <div className="admin-actions">
                    <Choice
                      label="Birleştirme hedefi"
                      value={target}
                      onChange={setTarget}
                      options={{
                        '': 'Hedef olayı seçin',
                        ...Object.fromEntries(
                          data.events
                            .filter(
                              (e) =>
                                e.id !== selected.event.id &&
                                e.status !== 'withdrawn',
                            )
                            .map((e) => [e.id, e.title]),
                        ),
                      }}
                    />
                    <button
                      className="secondary-button"
                      disabled={!target || busy}
                      onClick={() =>
                        setConfirmation({
                          title: 'Bu iki olay birleştirilsin mi?',
                          description:
                            'Mevcut olayın tüm bildirimleri hedef olaya taşınır. İşlem kayıt geçmişine eklenir.',
                          body: {
                            action: 'merge',
                            fromId: selected.event.id,
                            targetId: target,
                          },
                        })
                      }
                    >
                      <Merge size={15} />
                      Birleştir
                    </button>
                  </div>
                  {selected.reports.map((r) => (
                    <div className="admin-row" key={r.id}>
                      <div>
                        <strong dir="auto">{r.title}</strong>
                        <small>{r.sourceLabel}</small>
                      </div>
                      <button
                        className="secondary-button"
                        disabled={busy || selected.reports.length < 2}
                        onClick={() =>
                          setConfirmation({
                            title: 'Bildirim ayrı olay olsun mu?',
                            description:
                              'Bu kaynak bildirimi yeni bir olay kaydına taşınır.',
                            body: {
                              action: 'split',
                              id: selected.event.id,
                              itemId: r.id,
                            },
                          })
                        }
                      >
                        <Split size={14} />
                        Ayır
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </TabsContent>
            <TabsContent value="runs">
              <section className="admin-panel">
                <h2>Son toplama işlemleri</h2>
                {!data.runs.length && <p>Henüz toplama yapılmadı.</p>}
                {data.runs.map((r) => (
                  <div className="admin-row" key={r.id}>
                    <div>
                      <strong>{r.sourceId}</strong>
                      <small>
                        {formatDate(r.startedAt)}
                        {r.message ? ' · ' + r.message : ''}
                      </small>
                    </div>
                    <span className={`source-health ${r.status}`}>
                      {r.status === 'ok'
                        ? `${r.accepted} bildirim`
                        : r.status === 'error'
                          ? 'Erişim sorunu'
                          : 'Çalışıyor'}
                    </span>
                  </div>
                ))}
              </section>
            </TabsContent>
          </Tabs>
        </>
      )}
      <AlertDialog
        open={!!confirmation}
        onOpenChange={(v) => {
          if (!v) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmation) void act(confirmation.body);
                setConfirmation(null);
              }}
            >
              Uygula
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
