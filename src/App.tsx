import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import Layout from './components/Layout';
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
  return (
    <div className="wrap page-head" role="status">
      <span className="kicker">Loading…</span>
      <p className="muted">Please wait a moment.</p>
    </div>
  );
}

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'JanDrishti · Report a civic problem and track it'],
  [/^\/login.*$/, 'Sign in · JanDrishti'],
  [/^\/file.*$/, 'Report a problem · JanDrishti'],
  [/^\/my.*$/, 'My complaints · JanDrishti'],
  [/^\/complaints\/(.+)$/, '$1 · JanDrishti'],
  [/^\/desk.*$/, 'My work · JanDrishti'],
  [/^\/officers\/?$/, 'Officer performance · JanDrishti'],
  [/^\/officers\/.*$/, 'Officer profile · JanDrishti'],
  [/^\/map.*$/, 'Complaint map · JanDrishti'],
];

function Guard({ role, children }: { role: 'citizen' | 'officer'; children: React.ReactElement }) {
  const { session } = useStore();
  const loc = useLocation();
  if (session?.role !== role) return <Navigate to={`/login?as=${role}&next=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
}

export default function App() {
  const loc = useLocation();
  useEffect(() => {
    const hit = TITLES.find(([re]) => re.test(loc.pathname));
    document.title = hit ? loc.pathname.replace(hit[0], hit[1]) : 'Not found · JanDrishti';
  }, [loc.pathname]);

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
