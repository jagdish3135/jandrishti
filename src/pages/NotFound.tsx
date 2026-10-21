import { Link } from 'react-router';

export default function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">404</span>
        <h1>Road closed</h1>
        <p>We couldn't find that {what}. It may have been reset with the demo data.</p>
      </div>
      <div className="hazard-tape" style={{ height: 14, borderRadius: 4, marginBottom: 24 }} />
      <Link className="btn btn-primary" to="/">
        Back to home
      </Link>
    </div>
  );
}
