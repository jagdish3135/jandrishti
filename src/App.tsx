import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import Layout from './components/Layout';
import { useStore } from './lib/store';
import ComplaintDetail from './pages/ComplaintDetail';
import FileComplaint from './pages/FileComplaint';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MyComplaints from './pages/MyComplaints';
import NotFound from './pages/NotFound';
import OfficerDesk from './pages/OfficerDesk';
import OfficerProfile from './pages/OfficerProfile';
import Officers from './pages/Officers';
import PublicMap from './pages/PublicMap';

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'JanDrishti · Every complaint gets a deadline'],
  [/^\/login.*$/, 'Sign in · JanDrishti'],
  [/^\/file.*$/, 'File a complaint · JanDrishti'],
  [/^\/my.*$/, 'My complaints · JanDrishti'],
  [/^\/complaints\/(.+)$/, '$1 · JanDrishti'],
  [/^\/desk.*$/, 'Officer desk · JanDrishti'],
  [/^\/officers\/?$/, 'Officer scores · JanDrishti'],
  [/^\/officers\/.*$/, 'Officer profile · JanDrishti'],
  [/^\/map.*$/, 'Public map · JanDrishti'],
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
    </Layout>
  );
}
