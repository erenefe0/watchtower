'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Layers3,
  ListFilter,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  TowerControl,
  X,
} from 'lucide-react';
import EventMap from './map';
import {
  CATEGORIES,
  COUNTRIES,
  EMPTY_EVENTS,
  LANGUAGES,
  type EventDetail,
  type EventResponse,
  type SourceRecord,
} from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
export function Brand() {
  return (
    <a href="/" className="brand" aria-label="Watchtower ana sayfa">
      <span className="brand-mark">
        <TowerControl size={24} strokeWidth={1.6} />
      </span>
      <span>
        WATCHTOWER<small>AÇIK KAYNAK OLAY İZLEME</small>
      </span>
    </a>
  );
}
export function Topbar({ active = 'monitor' }: { active?: string }) {
  return (
    <header className="topbar">
      <Brand />
      <nav aria-label="Ana gezinme">
        <a className={active === 'monitor' ? 'active' : ''} href="/">
          <Globe2 size={16} />
          Olay haritası
        </a>
        <a className={active === 'sources' ? 'active' : ''} href="/kaynaklar">
          <Radio size={16} />
          Kaynaklar
        </a>
      </nav>
      <a className="admin-link" href="/yonetim">
        <ShieldCheck size={16} />
        <span>Yönetim</span>
        <ArrowUpRight size={14} />
      </a>
    </header>
  );
}
export function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Istanbul',
      }).format(new Date(value))
    : 'Belirtilmemiş';
}
function ago(value: string | null) {
  if (!value) return 'Tarih belirtilmemiş';
  const m = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  return m < 1
    ? 'Az önce'
    : m < 60
      ? `${m} dk önce`
      : m < 1440
        ? `${Math.floor(m / 60)} sa önce`
        : `${Math.floor(m / 1440)} gün önce`;
}
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? 'all')}>
      <SelectTrigger aria-label={label} className="filter-select">
        <SelectValue>
          {value === 'all' ? label : (options[value] ?? label)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label} · Tümü</SelectItem>
        {Object.entries(options).map(([v, l]) => (
          <SelectItem value={v} key={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function DetailContent({ detail }: { detail: EventDetail }) {
  const [original, setOriginal] = useState(false);
  const e = detail.event;
  return (
    <>
      <div
        className="detail-category"
        style={{ color: CATEGORIES[e.category].color }}
      >
        {CATEGORIES[e.category].label}
        <span className="review-badge">
          {e.status === 'reviewed'
            ? 'Editör inceledi'
            : e.status === 'disputed'
              ? 'İhtilaflı'
              : e.status === 'withdrawn'
                ? 'Geri çekildi'
                : 'Kaynak bildirimi'}
        </span>
      </div>
      <h2 dir="auto">{original ? e.originalTitle : e.title}</h2>
      {['translated', 'title_translated'].includes(e.translationStatus) && (
        <button className="text-button" onClick={() => setOriginal(!original)}>
          {original
            ? 'Türkçe çeviriyi göster'
            : 'Otomatik çeviri · Özgün metni göster'}
        </button>
      )}
      <p dir="auto" className="detail-summary">
        {original ? e.originalSummary : e.summary}
      </p>
      <dl className="detail-facts">
        <div>
          <dt>Konum</dt>
          <dd>{e.place || COUNTRIES[e.country || ''] || 'Belirsiz'}</dd>
        </div>
        <div>
          <dt>Konum dayanağı</dt>
          <dd>{e.locationBasis}</dd>
        </div>
        <div>
          <dt>Olay zamanı</dt>
          <dd>{formatDate(e.occurredAt)}</dd>
        </div>
        <div>
          <dt>Yayın zamanı</dt>
          <dd>{formatDate(e.publishedAt)}</dd>
        </div>
        <div>
          <dt>Sisteme alınma</dt>
          <dd>{formatDate(e.retrievedAt)}</dd>
        </div>
      </dl>
      <h3 className="detail-subheading">
        Kaynaklar <span>{detail.reports.length}</span>
      </h3>
      <p className="small-note">
        Birden fazla bildirim, bağımsız doğrulama anlamına gelmez.
      </p>
      {detail.reports.map((r) => (
        <a
          key={r.id}
          className="source-report"
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>
            {r.sourceLabel}
            <ArrowUpRight size={15} />
          </span>
          <p dir="auto">{r.title}</p>
          <small>
            {formatDate(r.publishedAt)} · {LANGUAGES[r.language] || r.language}
          </small>
        </a>
      ))}
      <a className="text-button permalink" href={`/olay/${e.id}`}>
        Kalıcı olay sayfası <ArrowUpRight size={14} />
      </a>
      {detail.history.length > 0 && (
        <>
          <h3 className="detail-subheading">Kayıt geçmişi</h3>
          {detail.history.map((h) => (
            <p className="history-entry" key={h.id}>
              {h.description}
              <small>{formatDate(h.createdAt)}</small>
            </p>
          ))}
        </>
      )}
    </>
  );
}
export default function Dashboard() {
  const [data, setData] = useState<EventResponse>(EMPTY_EVENTS),
    [sources, setSources] = useState<SourceRecord[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [mobile, setMobile] = useState('map');
  const [category, setCategory] = useState('all'),
    [country, setCountry] = useState('all'),
    [source, setSource] = useState('all'),
    [language, setLanguage] = useState('all'),
    [status, setStatus] = useState('all'),
    [hours, setHours] = useState('24');
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<EventDetail | null>(null),
    [detailError, setDetailError] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const p = new URLSearchParams({
        category,
        country,
        source,
        language,
        status,
        hours,
        q: query,
        page: String(page),
      });
      const r = await fetch(`/api/events?${p}`);
      if (!r.ok) throw new Error();
      const payload = (await r.json()) as EventResponse;
      if (version === requestVersion.current) {
        setData(payload);
        setError('');
      }
    } catch {
      if (version === requestVersion.current)
        setError(
          'Haber akışına şu anda ulaşılamıyor. Son alınan kayıtlar korunuyor.',
        );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [category, country, source, language, status, hours, query, page]);
  useEffect(() => {
    void refresh();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60000);
    return () => clearInterval(t);
  }, [refresh]);
  useEffect(() => {
    setPage(1);
  }, [category, country, source, language, status, hours, query]);
  useEffect(() => {
    fetch('/api/sources')
      .then((r) => (r.ok ? r.json() : []))
      .then((v) => setSources(v as SourceRecord[]))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setDetailError('');
    fetch(`/api/events/${encodeURIComponent(selected)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((v) => {
        if (!cancelled) setDetail(v as EventDetail);
      })
      .catch(() => {
        if (!cancelled) setDetailError('Olay ayrıntısı yüklenemedi.');
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('event');
    if (id) setSelected(id);
  }, []);
  const freshness = data.lastSuccess
    ? Date.now() - new Date(data.lastSuccess).getTime()
    : Infinity;
  return (
    <div className="app-shell">
      <Topbar />
      <div className="workspace-toolbar">
        <div className="section-label">
          <span
            className={`status-dot ${freshness > 1800000 ? 'muted' : ''}`}
          />
          <strong>Durum merkezi</strong>
          <span className="toolbar-separator" />
          <span className="muted-text">
            {data.lastSuccess
              ? `Son veri ${ago(data.lastSuccess)}`
              : 'İlk veri bekleniyor'}
          </span>
        </div>
        <div className="toolbar-right">
          <span className="timezone">UTC+3 · İstanbul</span>
          <button
            className="icon-button"
            aria-label="Görünümü yenile"
            onClick={() => void refresh()}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>
      <div className="monitor-layout">
        <aside className="filter-rail">
          <div className="rail-title">
            <ListFilter size={16} />
            Görünümü daralt
          </div>
          <label className="search-box">
            <Search size={17} />
            <input
              placeholder="Olay veya yer ara"
              aria-label="Olay veya yer ara"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                aria-label="Aramayı temizle"
                onClick={() => setSearch('')}
              >
                <X size={13} />
              </button>
            )}
          </label>
          <div className="filter-group">
            <span className="eyebrow">ZAMAN ARALIĞI</span>
            <div className="time-pills">
              {[
                ['6', '6 sa'],
                ['24', '24 sa'],
                ['168', '7 gün'],
                ['720', '30 gün'],
              ].map(([v, l]) => (
                <button
                  aria-pressed={hours === v}
                  className={hours === v ? 'selected' : ''}
                  key={v}
                  onClick={() => setHours(v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="eyebrow">OLAY KATEGORİLERİ</span>
            <button
              className={`category-button ${category === 'all' ? 'selected' : ''}`}
              onClick={() => setCategory('all')}
            >
              <Layers3 size={15} />
              <span>Tüm gelişmeler</span>
            </button>
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <button
                aria-pressed={category === key}
                className={`category-button ${category === key ? 'selected' : ''}`}
                key={key}
                onClick={() => setCategory(category === key ? 'all' : key)}
              >
                <span
                  className="category-dot"
                  style={{ background: c.color }}
                />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <div className="filter-group">
            <span className="eyebrow">BÖLGE VE KAYNAK</span>
            <FilterSelect
              label="Tüm ülkeler"
              value={country}
              onChange={setCountry}
              options={COUNTRIES}
            />
            <FilterSelect
              label="Tüm kaynaklar"
              value={source}
              onChange={setSource}
              options={Object.fromEntries(
                sources.filter((s) => s.enabled).map((s) => [s.id, s.label]),
              )}
            />
            <button
              className="text-button extra-filters"
              onClick={() => setMore(!more)}
            >
              {more ? 'Daha az filtre' : 'Dil ve inceleme durumu'}
              <ChevronRight size={14} />
            </button>
            {more && (
              <>
                <FilterSelect
                  label="Tüm diller"
                  value={language}
                  onChange={setLanguage}
                  options={LANGUAGES}
                />
                <FilterSelect
                  label="İnceleme durumu"
                  value={status}
                  onChange={setStatus}
                  options={{
                    reported: 'Kaynak bildirimi',
                    reviewed: 'Editör inceledi',
                    disputed: 'İhtilaflı',
                  }}
                />
              </>
            )}
          </div>
          <div className="rail-bottom">
            <Radio size={19} />
            <strong>{data.sourceCount} etkin bağlantı</strong>
            <p>Haberler, kurumsal uyarılar ve ölçüm kayıtları.</p>
            <a href="/kaynaklar">
              Kaynak durumlarını gör
              <ArrowUpRight size={13} />
            </a>
          </div>
        </aside>
        <main className="monitor-main">
          <div className="metrics">
            <div>
              <span>TOPLANAN OLAY</span>
              <strong>
                {data.stats.total.toLocaleString('tr-TR')}
                <Activity size={18} />
              </strong>
            </div>
            <div>
              <span>HARİTADA</span>
              <strong>
                {data.stats.located.toLocaleString('tr-TR')}
                <MapPin size={17} />
              </strong>
            </div>
            <div>
              <span>ÜLKE / BÖLGE</span>
              <strong>
                {data.stats.countries}
                <Globe2 size={18} />
              </strong>
            </div>
            <div>
              <span>YAYINCI GRUBU</span>
              <strong>
                {data.stats.publishers}
                <Radio size={18} />
              </strong>
            </div>
          </div>
          <div className="mobile-switch">
            <Tabs value={mobile} onValueChange={setMobile}>
              <TabsList>
                <TabsTrigger value="map">Harita</TabsTrigger>
                <TabsTrigger value="feed">Haber akışı</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className={`map-feed-grid mobile-${mobile}`}>
            <section className="map-column">
              <EventMap
                events={data.map}
                onSelect={setSelected}
                selectedId={selected}
              />
              <div className="timeline">
                <div className="timeline-title">
                  <span>OLAY YOĞUNLUĞU</span>
                  <span>
                    {Number(hours) >= 24
                      ? `Son ${Number(hours) / 24} gün`
                      : `Son ${hours} saat`}
                  </span>
                </div>
                <div className="histogram" aria-label="Zamana göre olay sayısı">
                  {data.histogram.length
                    ? data.histogram.map((h) => (
                        <div
                          title={`${formatDate(h.hour)} · ${h.count} olay`}
                          key={h.hour}
                          style={{
                            height: `${Math.max(3, (h.count / Math.max(1, ...data.histogram.map((h) => h.count))) * 100)}%`,
                          }}
                        />
                      ))
                    : Array.from({ length: 48 }, (_, i) => (
                        <div key={i} style={{ height: '3%' }} />
                      ))}
                </div>
                <div className="timeline-labels">
                  <span>
                    {data.histogram[0]
                      ? formatDate(data.histogram[0].hour)
                      : '—'}
                  </span>
                  <span>
                    {data.histogram.length
                      ? formatDate(data.histogram.at(-1)!.hour)
                      : 'Henüz kayıt yok'}
                  </span>
                </div>
              </div>
            </section>
            <section className="feed-panel">
              <div className="feed-heading">
                <div>
                  <span className="eyebrow">KAYNAKLARDAN</span>
                  <h2>
                    Haber akışı<span>{data.total}</span>
                  </h2>
                </div>
                <Activity size={19} />
              </div>
              <div className="feed-notice">
                Bildirimler otomatik derlenir; doğrulama anlamına gelmez.
              </div>
              <div className="feed-list" aria-busy={loading}>
                {error && (
                  <div role="alert" className="inline-error">
                    {error}
                  </div>
                )}
                {!loading && !data.events.length && (
                  <div className="empty-feed">
                    <Radio size={30} />
                    <h3>
                      {query || category !== 'all' || country !== 'all'
                        ? 'Bu görünümde olay yok'
                        : 'Henüz olay kaydı yok'}
                    </h3>
                    <p>
                      Filtreleri genişletebilir veya kaynakların durumunu
                      inceleyebilirsiniz.
                    </p>
                    <a href="/kaynaklar">
                      Kaynakları incele
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                )}
                {loading && !data.events.length && (
                  <div className="empty-feed">
                    <RefreshCw size={24} className="spin" />
                    <p>Kaynak kayıtları alınıyor…</p>
                  </div>
                )}
                {data.events.map((e) => (
                  <button
                    key={e.id}
                    className={`event-card ${selected === e.id ? 'selected' : ''}`}
                    onClick={() => setSelected(e.id)}
                  >
                    <div className="event-meta">
                      <span style={{ color: CATEGORIES[e.category].color }}>
                        <span
                          className="category-dot"
                          style={{ background: CATEGORIES[e.category].color }}
                        />
                        {CATEGORIES[e.category].label}
                      </span>
                      <time>{ago(e.publishedAt)}</time>
                    </div>
                    <h3 dir="auto">{e.title}</h3>
                    <div className="event-location">
                      <MapPin size={12} />
                      {e.place ||
                        COUNTRIES[e.country || ''] ||
                        'Konum belirsiz'}
                      <span>·</span>
                      {e.precision === 'city'
                        ? 'Yaklaşık'
                        : e.precision === 'exact'
                          ? 'Kaynak koordinatı'
                          : 'Konumlandırılmadı'}
                    </div>
                    <div className="event-footer">
                      <span>{e.sourceLabel}</span>
                      <span>
                        {e.reportCount > 1
                          ? `${e.reportCount} bildirim`
                          : LANGUAGES[e.language] || e.language}
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="feed-pagination">
                <span>
                  {data.total
                    ? `${page} / ${Math.max(1, data.pages)}`
                    : '0 kayıt'}
                </span>
                <div>
                  <button
                    aria-label="Önceki sayfa"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    aria-label="Sonraki sayfa"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
      <footer className="status-bar">
        <span>
          <span
            className={`status-dot ${data.connections.scheduler ? '' : 'muted'}`}
          />
          {data.connections.scheduler
            ? 'Zamanlanmış toplama etkin'
            : 'Zamanlayıcı · bağlantı bekliyor'}
        </span>
        <span>
          {data.connections.translation
            ? 'Otomatik çeviri etkin'
            : 'Türkçe çeviri · bağlantı bekliyor'}
        </span>
        <span className="status-right">Açık kaynak · 30 günlük arşiv</span>
      </footer>
      <Sheet
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <SheetContent className="event-sheet">
          <SheetHeader>
            <SheetTitle>Olay ayrıntısı</SheetTitle>
            <SheetDescription>
              Kaynak bildirimleri ve kayıt geçmişi
            </SheetDescription>
          </SheetHeader>
          <div className="detail-scroll">
            {detailError && <p role="alert">{detailError}</p>}
            {!detail && !detailError && <p>Ayrıntılar yükleniyor…</p>}
            {detail && <DetailContent key={detail.event.id} detail={detail} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
