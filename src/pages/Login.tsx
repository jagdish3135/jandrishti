import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DEPARTMENTS, OFFICERS } from '../lib/catalog';
import { DEMO_CITIZEN_ID } from '../lib/seed';
import { useStore } from '../lib/store';
import { aadhaarError, cleanAadhaar, cleanPhone, phoneError, testAadhaar } from '../lib/verhoeff';

function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

function CitizenSignIn({ onDone }: { onDone: () => void }) {
  const { db, signInCitizen } = useStore();
  const [step, setStep] = useState<'phone' | 'otp' | 'aadhaar'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState('');
  const [name, setName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const known = db.citizens.find((c) => c.phone === cleanPhone(phone));

  const sendOtp = (e: FormEvent) => {
    e.preventDefault();
    const err = phoneError(phone);
    setError(err);
    if (err) return;
    setSent(String(Math.floor(100000 + Math.random() * 900000)));
    setOtp('');
    setStep('otp');
  };

  const checkOtp = (e: FormEvent) => {
    e.preventDefault();
    if (otp.trim() !== sent) return setError('That code does not match. Check the message and try again.');
    setError(null);
    setStep('aadhaar');
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (!known && name.trim().length < 2) return setError('Enter your full name.');
    const err = aadhaarError(aadhaar);
    if (err) return setError(err);
    signInCitizen({ phone: cleanPhone(phone), name: known?.name ?? name, aadhaarLast4: cleanAadhaar(aadhaar).slice(-4) });
    onDone();
  };

  const formatAadhaar = (v: string) =>
    cleanAadhaar(v)
      .replace(/\D/g, '')
      .slice(0, 12)
      .replace(/(\d{4})(?=\d)/g, '$1 ');

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row" aria-label="Steps">
        {(['phone', 'otp', 'aadhaar'] as const).map((s, i) => (
          <span key={s} className="row" style={{ gap: 6, opacity: s === step ? 1 : 0.5 }}>
            <span className="step-num">{i + 1}</span>
            <span className="label">{s === 'phone' ? 'Mobile' : s === 'otp' ? 'OTP' : 'Aadhaar'}</span>
          </span>
        ))}
      </div>

      {step === 'phone' && (
        <form className="stack" style={{ gap: 14 }} onSubmit={sendOtp} noValidate>
          <label className="field">
            <span>Your mobile number</span>
            <input className="input big" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!error} />
          </label>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn btn-primary" type="submit">
            Send me a code
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form className="stack" style={{ gap: 14 }} onSubmit={checkOtp} noValidate>
          <div className="otp-sms" role="status">
            <span className="label">Demo text message to +91 {cleanPhone(phone)}</span>
            <span>Your JanDrishti code is</span>
            <b>{sent}</b>
          </div>
          <label className="field">
            <span>Type the 6-digit code from the message</span>
            <input className="input big" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus aria-invalid={!!error} />
          </label>
          {error && <p className="err" role="alert">{error}</p>}
          <div className="row">
            <button className="btn btn-primary" type="submit">
              Verify code
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setStep('phone')}>
              Change number
            </button>
          </div>
        </form>
      )}

      {step === 'aadhaar' && (
        <form className="stack" style={{ gap: 14 }} onSubmit={verify} noValidate>
          {known ? (
            <p className="callout ok" style={{ margin: 0 }}>
              <span aria-hidden="true">✓</span>
              <span>Welcome back, {known.name}. Confirm your Aadhaar to continue.</span>
            </p>
          ) : (
            <label className="field">
              <span>Full name</span>
              <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span>Your 12-digit Aadhaar number</span>
            <input className="input big" inputMode="numeric" autoComplete="off" placeholder="XXXX XXXX XXXX" value={aadhaar} onChange={(e) => setAadhaar(formatAadhaar(e.target.value))} aria-invalid={!!error} aria-describedby="aadhaar-hint" />
          </label>
          <p id="aadhaar-hint" className="hint">
            Demo check only: the number is validated with the Aadhaar checksum in your browser and only the last 4 digits
            are kept. A live system would verify through UIDAI or DigiLocker.{' '}
            <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', minHeight: 0 }} onClick={() => setAadhaar(formatAadhaar(testAadhaar()))}>
              Use a test number
            </button>
          </p>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn btn-primary" type="submit">
            Verify and sign in
          </button>
        </form>
      )}
    </div>
  );
}

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signInOfficer, signInCitizen, db } = useStore();
  const [as, setAs] = useState<'citizen' | 'officer'>(params.get('as') === 'officer' ? 'officer' : 'citizen');
  const [officerId, setOfficerId] = useState('roads-je-west');
  const next = params.get('next');

  const doneCitizen = () => navigate(safeNext(next, '/my'), { replace: true });
  const priya = db.citizens.find((c) => c.id === DEMO_CITIZEN_ID);

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">Sign in</span>
        <h1>Sign in to JanDrishti</h1>
        <p>Citizens sign in with their mobile number and Aadhaar. This makes sure every complaint comes from a real person.</p>
      </div>
      <div className="tabs" role="tablist" aria-label="Sign in as">
        <button role="tab" aria-selected={as === 'citizen'} onClick={() => setAs('citizen')} type="button">
          I am a citizen
        </button>
        <button role="tab" aria-selected={as === 'officer'} onClick={() => setAs('officer')} type="button">
          I am an officer
        </button>
      </div>

      {as === 'citizen' ? (
        <div className="split">
          <div className="panel strong">
            <CitizenSignIn onDone={doneCitizen} />
          </div>
          {priya && (
            <div className="choice">
              <span className="kicker">Just looking?</span>
              <h2>Try the demo as Priya</h2>
              <p className="muted" style={{ margin: 0 }}>
                A sample citizen in Kothrud with five complaints: one due soon, one escalated, one waiting for her
                confirmation, and two closed.
              </p>
              <button
                className="btn"
                type="button"
                style={{ justifySelf: 'start' }}
                onClick={() => {
                  signInCitizen({ phone: priya.phone, name: priya.name, aadhaarLast4: priya.aadhaarLast4 });
                  doneCitizen();
                }}
              >
                Continue as Priya Deshmukh
              </button>
            </div>
          )}
        </div>
      ) : (
        <form
          className="panel strong stack"
          style={{ gap: 16, maxWidth: 640 }}
          onSubmit={(e) => {
            e.preventDefault();
            signInOfficer(officerId);
            navigate(safeNext(next, '/desk'), { replace: true });
          }}
        >
          <label className="field">
            <span>Officer</span>
            <select className="input" value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <optgroup key={d.id} label={d.name}>
                  {OFFICERS.filter((o) => o.dept === d.id).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} · {o.designation}
                      {o.beat ? ` (${o.beat === 'west' ? 'Kothrud, Aundh, Shivajinagar' : 'Kasba, Yerawada, Hadapsar'})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="City">
                {OFFICERS.filter((o) => !o.dept).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.designation}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <p className="hint" style={{ margin: 0 }}>
            Demo: choose any sample officer. A real system would use the government's staff sign-in.
          </p>
          <button className="btn btn-primary" type="submit" style={{ justifySelf: 'start' }}>
            Open officer desk
          </button>
        </form>
      )}
    </div>
  );
}
