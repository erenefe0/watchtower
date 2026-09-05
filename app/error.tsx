'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-content">
      <h1>Bu görünüm yüklenemedi.</h1>
      <p className="small-note">
        Kayıtlar korunuyor. Yeniden deneyebilirsiniz.
      </p>
      <button className="primary-button" onClick={reset}>
        Yeniden dene
      </button>
    </main>
  );
}
