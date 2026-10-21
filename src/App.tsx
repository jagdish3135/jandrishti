import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import Layout from './components/Layout';
import { useT, type Key } from './lib/i18n';
import { useStore } from './lib/store';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

// Pages load on demand, so the home page doesn't download the map or photo libraries.
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail'));
const FileComplaint = lazy(() => import('./pages/FileComplaint'));
const Login = lazy(() => import('./pages/Login'));
const MyComplaints = lazy(() => import('./pages/MyComplaints'));
const OfficerDesk = lazy(() => import('./pages/OfficerDesk'));
const OfficerProfile = lazy(() => import('./pages/OfficerProfile'));
const Officers = lazy(() => import('./pages/Officers'));
const PublicMap = lazy(() => import('./pages/PublicMap'));

function Loading() {
  const { t } = useT();
  return (
    <div className="wrap page-head" role="status">
      <span className="kicker">{t('common.loading')}</span>
      <p className="muted">{t('common.wait')}</p>
    </div>
  );
}

// Page titles: a translated name, or the complaint number.
const TITLES: [RegExp, Key | null][] = [
  [/^\/$/, null],
  [/^\/login/, 'nav.signIn'],
  [/^\/file/, 'nav.report'],
  [/^\/my/, 'nav.my'],
  [/^\/complaints\//, null],
  [/^\/desk/, 'nav.work'],
  [/^\/officers\/?$/, 'foot.perf'],
  [/^\/officers\//, 'nav.officers'],
  [/^\/map/, 'map.title'],
];

function Guard({ role, children }: { role: 'citizen' | 'officer'; children: React.ReactElement }) {
  const { session } = useStore();
  const loc = useLocation();
  if (session?.role !== role) return <Navigate to={`/login?as=${role}&next=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
}

export default function App() {
  const loc = useLocation();
  const { t } = useT();
  useEffect(() => {
    const hit = TITLES.find(([re]) => re.test(loc.pathname));
    const id = loc.pathname.match(/^\/complaints\/(.+)$/)?.[1];
    document.title = !hit
      ? `${t('nf.kicker')} · JanDrishti`
      : id
        ? `${decodeURIComponent(id)} · JanDrishti`
        : hit[1]
          ? `${t(hit[1])} · JanDrishti`
          : `JanDrishti · ${t('brand.tagline')}`;
  }, [loc.pathname, t]);

  return (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/file" element={<Guard role="citizen"><FileComplaint /></Guard>} />
        <Route path="/my" element={<Guard role="citizen"><MyComplaints /></Guard>} />
        <Route path="/complaints/:id" element={<ComplaintDetail />} />
        <Route path="/desk" element={<Guard role="officer"><OfficerDesk /></Guard>} />
        <Route path="/officers" element={<Officers />} />
        <Route path="/officers/:id" element={<OfficerProfile />} />
        <Route path="/map" element={<PublicMap />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </Layout>
  );
}
