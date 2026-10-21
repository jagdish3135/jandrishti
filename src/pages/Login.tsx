import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Icon } from '../components/icons';
import { DEPARTMENTS, OFFICERS, WARDS } from '../lib/catalog';
import { useT, type Key } from '../lib/i18n';
import { DEMO_CITIZEN_ID } from '../lib/seed';
import { useStore } from '../lib/store';
import { aadhaarProblem, cleanAadhaar, cleanPhone, phoneError, testAadhaar } from '../lib/verhoeff';

function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

const AADHAAR_KEY: Record<'len' | 'start' | 'sum', Key> = { len: 'err.aadhaarLen', start: 'err.aadhaarStart', sum: 'err.aadhaarSum' };

function CitizenSignIn({ onDone }: { onDone: () => void }) {
  const { db, signInCitizen } = useStore();
  const { t } = useT();
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
    if (phoneError(phone)) return setError(t('err.phone'));
    setError(null);
    setSent(String(Math.floor(100000 + Math.random() * 900000)));
    setOtp('');
    setStep('otp');
  };

  const checkOtp = (e: FormEvent) => {
    e.preventDefault();
    if (otp.trim() !== sent) return setError(t('err.otp'));
    setError(null);
    setStep('aadhaar');
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (!known && name.trim().length < 2) return setError(t('err.name'));
    const problem = aadhaarProblem(aadhaar);
    if (problem) return setError(t(AADHAAR_KEY[problem]));
    signInCitizen({ phone: cleanPhone(phone), name: known?.name ?? name, aadhaarLast4: cleanAadhaar(aadhaar).slice(-4) });
    onDone();
  };

  const formatAadhaar = (v: string) =>
    cleanAadhaar(v)
      .replace(/\D/g, '')
      .slice(0, 12)
      .replace(/(\d{4})(?=\d)/g, '$1 ');

  const steps: ['phone' | 'otp' | 'aadhaar', Key][] = [
    ['phone', 'login.stepMobile'],
    ['otp', 'login.stepOtp'],
    ['aadhaar', 'login.stepAadhaar'],
  ];

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <div className="row" aria-label={t('login.steps')}>
        {steps.map(([s, key], i) => (
          <span key={s} className="row" style={{ gap: '0.4rem', opacity: s === step ? 1 : 0.55 }}>
            <span className="step-num">{i + 1}</span>
            <span className="label">{t(key)}</span>
          </span>
        ))}
      </div>

      {step === 'phone' && (
        <form className="stack" style={{ gap: '0.9rem' }} onSubmit={sendOtp} noValidate>
          <label className="field">
            <span>{t('login.mobile')}</span>
            <input className="input big" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!error} />
          </label>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" type="submit">
            {t('login.sendCode')}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form className="stack" style={{ gap: '0.9rem' }} onSubmit={checkOtp} noValidate>
          <div className="otp-sms" role="status">
            <span className="label">{t('login.smsTo', { phone: cleanPhone(phone) })}</span>
            <span>{t('login.codeIs')}</span>
            <b>{sent}</b>
          </div>
          <label className="field">
            <span>{t('login.typeCode')}</span>
            <input className="input big" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus aria-invalid={!!error} />
          </label>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button className="btn btn-primary" type="submit">
              {t('login.verifyCode')}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setStep('phone')}>
              {t('login.changeNumber')}
            </button>
          </div>
        </form>
      )}

      {step === 'aadhaar' && (
        <form className="stack" style={{ gap: '0.9rem' }} onSubmit={verify} noValidate>
          {known ? (
            <div className="callout ok">
              <Icon name="check" />
              <span>{t('login.welcomeBack', { name: known.name })}</span>
            </div>
          ) : (
            <label className="field">
              <span>{t('login.fullName')}</span>
              <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span>{t('login.aadhaar')}</span>
            <input className="input big" inputMode="numeric" autoComplete="off" placeholder="XXXX XXXX XXXX" value={aadhaar} onChange={(e) => setAadhaar(formatAadhaar(e.target.value))} aria-invalid={!!error} aria-describedby="aadhaar-hint" />
          </label>
          <p id="aadhaar-hint" className="hint" style={{ margin: 0 }}>
            {t('login.aadhaarHint')}{' '}
            <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '0.1rem 0.4rem', minHeight: 0 }} onClick={() => setAadhaar(formatAadhaar(testAadhaar()))}>
              {t('login.testNumber')}
            </button>
          </p>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" type="submit">
            {t('login.verify')}
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
  const { t, dept, designation, wardName } = useT();
  const [as, setAs] = useState<'citizen' | 'officer'>(params.get('as') === 'officer' ? 'officer' : 'citizen');
  const [officerId, setOfficerId] = useState('roads-je-west');
  const next = params.get('next');

  const doneCitizen = () => navigate(safeNext(next, '/my'), { replace: true });
  const priya = db.citizens.find((c) => c.id === DEMO_CITIZEN_ID);
  const beat = (b: 'west' | 'east') =>
    WARDS.filter((w) => w.beat === b)
      .map((w) => wardName(w.id))
      .join(', ');

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">{t('login.kicker')}</span>
        <h1>{t('login.title')}</h1>
        <p>{t('login.help')}</p>
      </div>
      <div className="tabs" role="tablist" aria-label={t('login.as')}>
        <button role="tab" aria-selected={as === 'citizen'} onClick={() => setAs('citizen')} type="button">
          <Icon name="user" size={20} /> {t('login.citizen')}
        </button>
        <button role="tab" aria-selected={as === 'officer'} onClick={() => setAs('officer')} type="button">
          <Icon name="shield" size={20} /> {t('login.officer')}
        </button>
      </div>

      {as === 'citizen' ? (
        <div className="split">
          <div className="panel strong">
            <CitizenSignIn onDone={doneCitizen} />
          </div>
          {priya && (
            <div className="choice">
              <span className="kicker">{t('login.tryKicker')}</span>
              <h2>{t('login.tryTitle')}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {t('login.tryBody')}
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
                {t('login.tryBtn', { name: priya.name })}
              </button>
            </div>
          )}
        </div>
      ) : (
        <form
          className="panel strong stack"
          style={{ gap: '1rem', maxWidth: '44rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            signInOfficer(officerId);
            navigate(safeNext(next, '/desk'), { replace: true });
          }}
        >
          <label className="field">
            <span>{t('login.officerLabel')}</span>
            <select className="input" value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <optgroup key={d.id} label={dept(d.id)}>
                  {OFFICERS.filter((o) => o.dept === d.id).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} · {designation(o)}
                      {o.beat ? ` (${beat(o.beat)})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
              <optgroup label={t('login.city')}>
                {OFFICERS.filter((o) => !o.dept).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {designation(o)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <p className="hint" style={{ margin: 0 }}>
            {t('login.officerHint')}
          </p>
          <button className="btn btn-primary" type="submit" style={{ justifySelf: 'start' }}>
            {t('login.openDesk')}
          </button>
        </form>
      )}
    </div>
  );
}
