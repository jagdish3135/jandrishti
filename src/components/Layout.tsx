import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { officer } from '../lib/catalog';
import { fmtClock, shortSpan } from '../lib/format';
import { DAY } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import { Avatar, Logo } from './bits';
import badgeHtml from './knit-badge.html?raw';

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="icon-btn"
      type="button"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => {
        setTheme(next);
        try {
          localStorage.setItem('jd:theme', next);
        } catch {
          // Theme still switches for this visit.
        }
      }}
    >
      {theme === 'dark' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
          </g>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 13.2A9 9 0 1 1 10.8 3a7 7 0 0 0 10.2 10.2z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

function Header() {
  const { session, me, signOut } = useStore();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [loc.pathname]);
  const ofc = session?.role === 'officer' ? officer(session.officerId) : undefined;
  const name = me?.name ?? ofc?.name;

  return (
    <header className="site-header">
      <div className="wrap">
        <Link to="/" className="brand" aria-label="JanDrishti home">
          <Logo />
          <span className="brand-word">
            <b>JanDrishti</b>
            <span lang="hi">जनदृष्टि</span>
          </span>
        </Link>
        <nav className={`nav${open ? ' open' : ''}`} aria-label="Main">
          {session?.role === 'officer' ? (
            <NavLink to="/desk">My desk</NavLink>
          ) : (
            <>
              <NavLink to="/file">File complaint</NavLink>
              <NavLink to="/my">My complaints</NavLink>
            </>
          )}
          <NavLink to="/officers">Officers</NavLink>
          <NavLink to="/map">Map</NavLink>
        </nav>
        <div className="header-tools">
          <ThemeToggle />
          {name ? (
            <span className="who">
              <Avatar name={name} />
              <span className="who-name">{name}</span>
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
              >
                Sign out
              </button>
            </span>
          ) : (
            <Link className="btn btn-primary btn-sm" to="/login">
              Sign in
            </Link>
          )}
          <button
            className="icon-btn menu-btn"
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d={open ? 'M5 5l14 14M19 5L5 19' : 'M3 6h18M3 12h18M3 18h18'} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function TimeDock() {
  const { db, travel, resetClock } = useStore();
  const now = useNow(1000);
  const [folded, setFolded] = useState(false);
  const offset = db.offsetMs;
  return (
    <aside className={`dock${folded ? ' folded' : ''}`} aria-label="Demo clock">
      <div className="dock-clock" aria-live="polite">
        <b>DEMO CLOCK</b>
        <span>{fmtClock(now)}</span>
        {offset > 0 && <em>+{shortSpan(offset)} ahead</em>}
      </div>
      <div className="dock-btns">
        <button type="button" onClick={() => travel(DAY)} title="Jump 1 day ahead">
          +1d
        </button>
        <button type="button" onClick={() => travel(3 * DAY)} title="Jump 3 days ahead">
          +3d
        </button>
        <button type="button" onClick={() => travel(7 * DAY)} title="Jump 7 days ahead">
          +7d
        </button>
        <button type="button" onClick={resetClock} disabled={offset === 0} aria-label="Back to real time" title="Back to real time">
          ⟲
        </button>
      </div>
      <button className="dock-fold" type="button" onClick={() => setFolded((f) => !f)} aria-label={folded ? 'Show clock controls' : 'Hide clock controls'}>
        {folded ? '◂' : '▸'}
      </button>
    </aside>
  );
}

function Toasts() {
  const { notices, dismiss } = useStore();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {notices.map((n) => (
        <div key={n.id} className={`toast ${n.tone}`}>
          <span className="toast-bar" />
          <div className="toast-body">
            {n.text} {n.link && <Link to={n.link}>Open</Link>}
          </div>
          <button type="button" onClick={() => dismiss(n.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function Footer() {
  const { resetDemo, storageFull } = useStore();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div>
          <h2>
            JanDrishti <span lang="hi">जनदृष्टि · जनता की नज़र</span>
          </h2>
          <p>
            A working prototype with fictional officers and sample data for {''}
            Pune. It is not a government service, and nothing you enter leaves this browser.
          </p>
          {storageFull && <p className="err">Browser storage is full. Reset the demo to free space.</p>}
        </div>
        <div className="foot-links">
          <Link to="/officers">Officer scores</Link>
          <Link to="/map">Public map</Link>
          <button className="btn btn-sm" type="button" onClick={resetDemo} style={{ justifySelf: 'start' }}>
            Reset demo data
          </button>
        </div>
        <div dangerouslySetInnerHTML={{ __html: badgeHtml }} />
      </div>
    </footer>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  useEffect(() => window.scrollTo(0, 0), [loc.pathname]);
  return (
    <>
      <a className="sr-only" href="#main">
        Skip to content
      </a>
      <Header />
      <Toasts />
      <main id="main">{children}</main>
      <Footer />
      <TimeDock />
    </>
  );
}
