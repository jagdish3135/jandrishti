import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { officer } from '../lib/catalog';
import { fmtLong, shortSpan } from '../lib/format';
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

/** Top bar: demo notice, text size and theme. Bigger text is one tap away for everyone. */
function UtilityBar() {
  const [size, setSize] = useState<TextSize>(() => (document.documentElement.dataset.text as TextSize) || 'md');
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  useEffect(() => {
    document.documentElement.dataset.text = size;
  }, [size]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const sizes: [TextSize, string, string][] = [
    ['md', 'A−', 'Normal text size'],
    ['lg', 'A', 'Large text'],
    ['xl', 'A+', 'Extra large text'],
  ];
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <div className="utility">
      <div className="wrap">
        <p className="utility-note" style={{ margin: 0 }}>
          <Icon name="info" size={18} />
          <span className="note-long">Demo website with sample data for Pune. Not an official government service.</span>
          <span className="note-short">Demo site · sample data</span>
        </p>
        <div className="utility-tools">
          <span className="text-size" role="group" aria-label="Text size">
            {sizes.map(([s, label, name]) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                aria-label={name}
                title={name}
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
            aria-label={`Switch to ${next} mode`}
            onClick={() => {
              setTheme(next);
              remember('jd:theme', next);
            }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { session, me, signOut } = useStore();
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
        <Link to="/" className="brand" aria-label="JanDrishti home">
          <Logo />
          <span className="brand-word">
            <b>JanDrishti</b>
            <span>
              <span lang="hi">जनदृष्टि</span> · Public complaint portal
            </span>
          </span>
        </Link>
        <nav className={`nav${open ? ' open' : ''}`} aria-label="Main">
          {session?.role === 'officer' ? (
            <NavLink to="/desk">
              <Icon name="list" size={20} /> My work
            </NavLink>
          ) : (
            <>
              <NavLink to="/file">
                <Icon name="plus" size={20} /> Report a problem
              </NavLink>
              <NavLink to="/my">
                <Icon name="file" size={20} /> My complaints
              </NavLink>
            </>
          )}
          <NavLink to="/officers">
            <Icon name="users" size={20} /> Officers
          </NavLink>
          <NavLink to="/map">
            <Icon name="map" size={20} /> Map
          </NavLink>
          {name && (
            <button className="nav-signout" type="button" onClick={out}>
              <Icon name="logout" size={20} /> Sign out
            </button>
          )}
        </nav>
        <div className="header-tools">
          {name ? (
            <span className="who">
              <Avatar name={name} />
              <span className="who-name">{name}</span>
              <button className="btn btn-sm" type="button" onClick={out}>
                Sign out
              </button>
            </span>
          ) : (
            <Link className="btn btn-primary btn-sm" to="/login">
              <Icon name="user" size={20} /> Sign in
            </Link>
          )}
          <button className="icon-btn menu-btn" type="button" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}

function TimeDock() {
  const { db, travel, resetClock } = useStore();
  const now = useNow(1000);
  // Folded by default on phones so it never covers the page.
  const [folded, setFolded] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const offset = db.offsetMs;
  return (
    <aside className={`dock${folded ? ' folded' : ''}`} aria-label="Demo clock">
      <button className="dock-clock" type="button" onClick={() => setFolded((f) => !f)} aria-expanded={!folded} aria-label="Demo clock controls">
        <b>Demo clock</b>
        <span>{fmtLong(now)}</span>
        {offset > 0 && <em>{shortSpan(offset)} ahead</em>}
      </button>
      <div className="dock-btns">
        <button type="button" onClick={() => travel(DAY)} title="Jump 1 day ahead">
          +1 day
        </button>
        <button type="button" onClick={() => travel(3 * DAY)} title="Jump 3 days ahead">
          +3
        </button>
        <button type="button" onClick={() => travel(7 * DAY)} title="Jump 7 days ahead">
          +7
        </button>
        <button type="button" onClick={resetClock} disabled={offset === 0} title="Back to real time" aria-label="Back to real time">
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
          <Icon name={n.tone === 'ok' ? 'check' : n.tone === 'warn' ? 'arrowUp' : n.tone === 'bad' ? 'alert' : 'info'} size={22} />
          <div className="toast-body">
            {n.text} {n.link && <Link to={n.link}>View</Link>}
          </div>
          <button type="button" onClick={() => dismiss(n.id)} aria-label="Dismiss">
            <Icon name="close" size={18} />
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
            A working prototype with fictional officers and sample data for Pune. It is not a government service, and
            nothing you enter leaves this browser.
          </p>
          {storageFull && <p className="err">Browser storage is full. Reset the demo to free space.</p>}
        </div>
        <div className="foot-links">
          <h3>For citizens</h3>
          <Link to="/file">Report a problem</Link>
          <Link to="/my">Track my complaints</Link>
          <Link to="/map">Complaint map</Link>
        </div>
        <div className="foot-links">
          <h3>Accountability</h3>
          <Link to="/officers">Officer performance</Link>
          <Link to="/login?as=officer">Officer sign in</Link>
          <button className="btn btn-sm" type="button" onClick={resetDemo} style={{ justifySelf: 'start', marginTop: 4 }}>
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
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return (
    <>
      <a className="sr-only skip" href="#main">
        Skip to main content
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
