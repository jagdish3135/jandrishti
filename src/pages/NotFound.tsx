import { Link } from 'react-router';
import { Icon } from '../components/icons';
import { useT } from '../lib/i18n';

export default function NotFound({ what = 'page' }: { what?: 'page' | 'complaint' | 'officer' }) {
  const { t } = useT();
  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">{t('nf.kicker')}</span>
        <h1>{t(what === 'complaint' ? 'nf.complaint' : what === 'officer' ? 'nf.officer' : 'nf.page')}</h1>
        <p>{t('nf.body')}</p>
      </div>
      <div className="row">
        <Link className="btn btn-primary" to="/">
          <Icon name="arrowLeft" /> {t('nf.home')}
        </Link>
        <Link className="btn" to="/map">
          <Icon name="map" /> {t('nf.browse')}
        </Link>
      </div>
    </div>
  );
}
