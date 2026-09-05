import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: {
    default: 'Watchtower — Ortadoğu Olay İzleme',
    template: '%s | Watchtower',
  },
  description:
    'Ortadoğu gelişmelerini açık kaynak haberleri, afet uyarıları ve deprem gözlemleriyle harita üzerinde takip edin.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body>{children}</body>
    </html>
  );
}
