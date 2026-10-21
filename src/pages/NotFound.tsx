import { Link } from 'react-router';
import { Icon } from '../components/icons';

export default function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">Page not found</span>
        <h1>We could not find that {what}</h1>
        <p>Check the address or the complaint number. Sample data may have been reset.</p>
      </div>
      <div className="row">
        <Link className="btn btn-primary" to="/">
          <Icon name="arrowLeft" /> Back to home
        </Link>
        <Link className="btn" to="/map">
          <Icon name="map" /> Browse complaints
        </Link>
      </div>
    </div>
  );
}
