import { Topbar } from '@/components/watchtower/dashboard';
export default function NotFound() {
  return (
    <div className="page-shell">
      <Topbar />
      <main className="page-content">
        <span className="eyebrow">KAYIT BULUNAMADI</span>
        <h1 style={{ fontSize: 32, margin: '15px 0' }}>
          Bu sayfa artık burada değil.
        </h1>
        <p className="small-note">
          Olay geri çekilmiş veya arşiv süresi dolmuş olabilir.
        </p>
        <a className="primary-button" href="/">
          Olay haritasına dön
        </a>
      </main>
    </div>
  );
}
