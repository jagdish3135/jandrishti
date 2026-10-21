import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { officer } from '../lib/catalog';
import { shortSpan } from '../lib/format';
import { LANGS, useT } from '../lib/i18n';
import { DAY } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import { Avatar, Logo } from './bits';
import { Icon } from './icons';
import badgeHtml from './knit-badge.html?raw';

type TextSize = 'md' | 'lg' | 'xl';

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The setting still applies for this visit.
  }
}

/** Top bar: demo notice, language, text size and theme. */
function UtilityBar() {
  const { t, lang, setLang } = useT();
  const [size, setSize] = useState<TextSize>(() => (document.documentElement.dataset.text as TextSize) || 'md');
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  useEffect(() => {
    document.documentElement.dataset.text = size;
  }, [size]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const sizes: [TextSize, string, 'util.textMd' | 'util.textLg' | 'util.textXl'][] = [
    ['md', 'A−', 'util.textMd'],
    ['lg', 'A', 'util.textLg'],
    ['xl', 'A+', 'util.textXl'],
  ];
  const dark = theme === 'dark';
  return (
    <div className="utility">
      <div className="wrap">
        <p className="utility-note" style={{ margin: 0 }}>
          <Icon name="info" size={18} />
          <span className="note-long">{t('util.demo')}</span>
          <span className="note-short">{t('util.demoShort')}</span>
        </p>
        <div className="utility-tools">
          <span className="lang-switch" role="group" aria-label={t('util.language')}>
            <Icon name="globe" size={18} />
            {LANGS.map((l) => (
              <button key={l.id} type="button" lang={l.id} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
                {l.label}
              </button>
            ))}
          </span>
          <span className="text-size" role="group" aria-label={t('util.textSize')}>
            {sizes.map(([s, label, key]) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                aria-label={t(key)}
                title={t(key)}
                onClick={() => {
                  setSize(s);
                  remember('jd:text', s);
                }}
              >
                {label}
              </button>
            ))}
          </span>
          <button
            className="theme-btn"
            type="button"
            aria-label={t(dark ? 'util.toLight' : 'util.toDark')}
            onClick={() => {
              const next = dark ? 'light' : 'dark';
              setTheme(next);
              remember('jd:theme', next);
            }}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={18} />
            <span>{t(dark ? 'util.light' : 'util.dark')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { session, me, signOut } = useStore();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  const ofc = session?.role === 'officer' ? officer(session.officerId) : undefined;
  const name = me?.name ?? ofc?.name;
  const out = () => {
    signOut();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="wrap">
        <Link to="/" className="brand" aria-label={t('brand.home')}>
          <Logo />
          <span className="brand-word">
            <b>JanDrishti</b>
            <span>
              <span lang="hi">जनदृष्टि</span> · {t('brand.tagline')}
            </span>
          </span>
        </Link>
        <nav className={`nav${open ? ' open' : ''}`} aria-label={t('nav.main')}>
          {session?.role === 'officer' ? (
            <NavLink to="/desk">
              <Icon name="list" size={20} /> {t('nav.work')}
            </NavLink>
          ) : (
            <>
              <NavLink to="/file">
                <Icon name="plus" size={20} /> {t('nav.report')}
              </NavLink>
              <NavLink to="/my">
                <Icon name="file" size={20} /> {t('nav.my')}
              </NavLink>
            </>
          )}
          <NavLink to="/officers">
            <Icon name="users" size={20} /> {t('nav.officers')}
          </NavLink>
          <NavLink to="/map">
            <Icon name="map" size={20} /> {t('nav.map')}
          </NavLink>
          {name && (
            <button className="nav-signout" type="button" onClick={out}>
              <Icon name="logout" size={20} /> {t('nav.signOut')}
            </button>
          )}
        </nav>
        <div className="header-tools">
          {name ? (
            <span className="who">
              <Avatar name={name} />
              <span className="who-name">{name}</span>
              <button className="btn btn-sm" type="button" onClick={out}>
                {t('nav.signOut')}
              </button>
            </span>
          ) : (
            <Link className="btn btn-primary btn-sm" to="/login">
              <Icon name="user" size={20} /> {t('nav.signIn')}
            </Link>
          )}
          <button className="icon-btn menu-btn" type="button" aria-expanded={open} aria-label={t(open ? 'nav.menuClose' : 'nav.menuOpen')} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}

function TimeDock() {
  const { db, travel, resetClock } = useStore();
  const { t, fmtLong } = useT();
  const now = useNow(1000);
  // Folded by default on phones so it never covers the page.
  const [folded, setFolded] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const offset = db.offsetMs;
  return (
    <aside className={`dock${folded ? ' folded' : ''}`} aria-label={t('dock.title')}>
      <button className="dock-clock" type="button" onClick={() => setFolded((f) => !f)} aria-expanded={!folded} aria-label={t('dock.label')}>
        <b>{t('dock.title')}</b>
        <span>{fmtLong(now)}</span>
        {offset > 0 && <em>{t('dock.ahead', { span: shortSpan(offset) })}</em>}
      </button>
      <div className="dock-btns">
        <button type="button" onClick={() => travel(DAY)} title={t('dock.jump1')}>
          {t('dock.plus1')}
        </button>
        <button type="button" onClick={() => travel(3 * DAY)} title={t('dock.jump3')}>
          +3
        </button>
        <button type="button" onClick={() => travel(7 * DAY)} title={t('dock.jump7')}>
          +7
        </button>
        <button type="button" onClick={resetClock} disabled={offset === 0} title={t('dock.reset')} aria-label={t('dock.reset')}>
          ⟲
        </button>
      </div>
      <button className="dock-fold" type="button" onClick={() => setFolded((f) => !f)} aria-label={t(folded ? 'dock.show' : 'dock.hide')}>
        {folded ? '◂' : '▸'}
      </button>
    </aside>
  );
}

function Toasts() {
  const { notices, dismiss } = useStore();
  const { t, designation } = useT();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {notices.map((n) => {
        const o = n.vars?.officerId ? officer(String(n.vars.officerId)) : undefined;
        const text = n.key ? t(n.key, { ...n.vars, name: o?.name ?? '', designation: o ? designation(o) : '' }) : n.text;
        return (
          <div key={n.id} className={`toast ${n.tone}`}>
            <Icon name={n.tone === 'ok' ? 'check' : n.tone === 'warn' ? 'arrowUp' : n.tone === 'bad' ? 'alert' : 'info'} size={22} />
            <div className="toast-body">
              {text} {n.link && <Link to={n.link}>{t('toast.view')}</Link>}
            </div>
            <button type="button" onClick={() => dismiss(n.id)} aria-label={t('toast.dismiss')}>
              <Icon name="close" size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Footer() {
  const { resetDemo, storageFull } = useStore();
  const { t } = useT();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div>
          <h2>
            JanDrishti <span lang="hi">जनदृष्टि · जनता की नज़र</span>
          </h2>
          <p>{t('foot.about')}</p>
          {storageFull && <p className="err">{t('foot.full')}</p>}
        </div>
        <div className="foot-links">
          <h3>{t('foot.citizens')}</h3>
          <Link to="/file">{t('nav.report')}</Link>
          <Link to="/my">{t('foot.track')}</Link>
          <Link to="/map">{t('foot.map')}</Link>
        </div>
        <div className="foot-links">
          <h3>{t('foot.account')}</h3>
          <Link to="/officers">{t('foot.perf')}</Link>
          <Link to="/login?as=officer">{t('foot.officerSignIn')}</Link>
          <button className="btn btn-sm" type="button" onClick={resetDemo} style={{ justifySelf: 'start', marginTop: 4 }}>
            {t('foot.reset')}
          </button>
        </div>
        <div dangerouslySetInnerHTML={{ __html: badgeHtml }} />
      </div>
    </footer>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const { t } = useT();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return (
    <>
      <a className="sr-only skip" href="#main">
        {t('nav.skip')}
      </a>
      <UtilityBar />
      <Header />
      <Toasts />
      <main id="main">{children}</main>
      <Footer />
      <TimeDock />
    </>
  );
}
