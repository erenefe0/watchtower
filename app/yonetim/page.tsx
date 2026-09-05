import { getAccessUser, accessSignInPath } from '@/app/access-auth';
import { adminIdentity } from '@/lib/auth';
import { Topbar } from '@/components/watchtower/dashboard';
import AdminPanel from '@/components/watchtower/admin';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Yönetim' };
export default async function AdminPage() {
  const user = await getAccessUser(),
    admin = await adminIdentity();
  return (
    <div className="page-shell">
      <Topbar active="admin" />
      {admin ? (
        <AdminPanel />
      ) : (
        <main className="page-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">WATCHTOWER YÖNETİM</span>
              <h1>
                {user
                  ? 'Yönetici erişimi gerekli'
                  : 'Kaynakları ve olayları yönetin.'}
              </h1>
              <p>
                {user
                  ? 'Bu hesap yönetici izin listesinde bulunmuyor. Olay haritası ve kaynaklar herkese açıktır.'
                  : 'Kaynak yenileme ve olay düzenleme işlemleri için Cloudflare Access ile giriş yapın.'}
              </p>
            </div>
          </div>
          {!user && (
            <a
              href={accessSignInPath()}
              target="_top"
              className="primary-button"
            >
              Güvenli yönetici girişi
            </a>
          )}
          {user && (
            <a href="/" className="secondary-button">
              Olay haritasına dön
            </a>
          )}
        </main>
      )}
    </div>
  );
}
