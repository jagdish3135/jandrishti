import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ComplaintCard, Empty } from '../components/bits';
import { Icon } from '../components/icons';
import { useT, type Key } from '../lib/i18n';
import { isOpen } from '../lib/sla';
import { useNow, useStore } from '../lib/store';

type Tab = 'open' | 'confirm' | 'closed' | 'supporting';

const LABELS: Record<Tab, Key> = { open: 'my.tabOpen', confirm: 'my.tabConfirm', closed: 'my.tabClosed', supporting: 'my.tabSupporting' };
const EMPTY: Record<Tab, Key> = { open: 'my.emptyOpen', confirm: 'my.emptyConfirm', closed: 'my.emptyClosed', supporting: 'my.emptySupporting' };

export default function MyComplaints() {
  const { db, me } = useStore();
  const { t } = useT();
  const now = useNow(30_000);
  const [tab, setTab] = useState<Tab>('open');

  const groups = useMemo(() => {
    const mine = db.complaints.filter((c) => c.citizenId === me?.id);
    return {
      open: mine.filter(isOpen).sort((a, b) => a.deadline - b.deadline),
      confirm: mine.filter((c) => c.status === 'resolved'),
      closed: mine.filter((c) => c.status === 'closed').sort((a, b) => b.createdAt - a.createdAt),
      supporting: db.complaints.filter((c) => me && c.supporters.includes(me.id)).sort((a, b) => a.deadline - b.deadline),
    };
  }, [db.complaints, me]);

  const list = groups[tab];

  return (
    <div className="wrap">
      <div className="page-head row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
        <div>
          <span className="kicker">{t('my.kicker', { name: me?.name.split(' ')[0] ?? '' })}</span>
          <h1>{t('my.title')}</h1>
        </div>
        <Link className="btn btn-primary" to="/file">
          <Icon name="plus" /> {t('nav.report')}
        </Link>
      </div>

      {groups.confirm.length > 0 && tab !== 'confirm' && (
        <div className="callout warn" style={{ marginBottom: '1.1rem' }}>
          <Icon name="check" />
          <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
            <span>{t('my.banner', { n: groups.confirm.length })}</span>
            <button className="btn btn-sm" type="button" onClick={() => setTab('confirm')}>
              {t('my.review')}
            </button>
          </div>
        </div>
      )}

      <div className="tabs" role="tablist">
        {(Object.keys(LABELS) as Tab[]).map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>
            {t(LABELS[k])}
            <span className="count">{groups[k].length}</span>
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="clist" role="tabpanel">
          {list.map((c) => (
            <ComplaintCard key={c.id} c={c} now={now} />
          ))}
        </div>
      ) : (
        <Empty title={t(EMPTY[tab])}>
          {tab === 'open' && (
            <Link className="btn btn-primary" to="/file">
              {t('nav.report')}
            </Link>
          )}
          {tab === 'supporting' && <span>{t('my.emptySupportingBody')}</span>}
        </Empty>
      )}
    </div>
  );
}
