import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { category, officer as officerById, ward } from './catalog';
import { parts } from './format';
import { en, type Key } from './i18n-en';
import { hi } from './i18n-hi';
import { mr } from './i18n-mr';
import type { Check, Complaint, DeptId, Officer } from './types';

export type Lang = 'en' | 'hi' | 'mr';
export const LANGS: { id: Lang; label: string; locale: string }[] = [
  { id: 'en', label: 'English', locale: 'en-IN' },
  { id: 'hi', label: 'हिन्दी', locale: 'hi-IN' },
  { id: 'mr', label: 'मराठी', locale: 'mr-IN' },
];
export const DICTS: Record<Lang, Record<Key, string>> = { en, hi, mr };
export type { Key };

// ---------- Data names (departments, problem types, wards, job titles) ----------

const DEPT: Record<Lang, Record<DeptId, [string, string]>> = {
  en: {
    roads: ['Roads & Footpaths', 'Roads'],
    water: ['Water Supply', 'Water'],
    drainage: ['Drainage & Sewerage', 'Drainage'],
    electrical: ['Street Lighting', 'Lighting'],
    sanitation: ['Solid Waste & Sanitation', 'Sanitation'],
    parks: ['Parks & Trees', 'Parks'],
    health: ['Public Health', 'Health'],
    encroachment: ['Encroachment & Hoardings', 'Encroachment'],
  },
  hi: {
    roads: ['सड़क और फुटपाथ', 'सड़क'],
    water: ['जल आपूर्ति', 'पानी'],
    drainage: ['जल निकासी और सीवर', 'नाली'],
    electrical: ['स्ट्रीट लाइट', 'बिजली'],
    sanitation: ['ठोस कचरा और स्वच्छता', 'स्वच्छता'],
    parks: ['उद्यान और पेड़', 'उद्यान'],
    health: ['सार्वजनिक स्वास्थ्य', 'स्वास्थ्य'],
    encroachment: ['अतिक्रमण और होर्डिंग', 'अतिक्रमण'],
  },
  mr: {
    roads: ['रस्ते व पदपथ', 'रस्ते'],
    water: ['पाणीपुरवठा', 'पाणी'],
    drainage: ['मलनिःसारण व गटारे', 'गटारे'],
    electrical: ['पथदिवे', 'दिवे'],
    sanitation: ['घनकचरा व स्वच्छता', 'स्वच्छता'],
    parks: ['उद्याने व झाडे', 'उद्याने'],
    health: ['सार्वजनिक आरोग्य', 'आरोग्य'],
    encroachment: ['अतिक्रमण व फलक', 'अतिक्रमण'],
  },
};

const CAT: Record<Exclude<Lang, 'en'>, Record<string, string>> = {
  hi: {
    pothole: 'गड्ढा',
    footpath: 'टूटा फुटपाथ',
    debris: 'सड़क पर मलबा',
    'no-water': 'पानी नहीं आ रहा',
    leak: 'पाइपलाइन से रिसाव',
    'dirty-water': 'गंदा पानी',
    drain: 'नाली जाम',
    sewer: 'सीवर ओवरफ्लो',
    streetlight: 'स्ट्रीट लाइट बंद',
    wire: 'खुला बिजली का तार',
    garbage: 'कचरा नहीं उठाया गया',
    dumping: 'अवैध कचरा फेंकना',
    'tree-fall': 'गिरा हुआ या खतरनाक पेड़',
    park: 'उद्यान की देखभाल नहीं',
    toilet: 'सार्वजनिक शौचालय गंदा या टूटा',
    mosquito: 'मच्छर, रुका हुआ पानी',
    encroach: 'फुटपाथ या सड़क पर अतिक्रमण',
    hoarding: 'अवैध होर्डिंग या बैनर',
    other: 'अन्य समस्या',
  },
  mr: {
    pothole: 'खड्डा',
    footpath: 'तुटलेला पदपथ',
    debris: 'रस्त्यावर राडारोडा',
    'no-water': 'पाणी येत नाही',
    leak: 'जलवाहिनी गळती',
    'dirty-water': 'दूषित पाणी',
    drain: 'गटार तुंबले',
    sewer: 'मैलापाणी वाहत आहे',
    streetlight: 'पथदिवा बंद',
    wire: 'उघडी विजेची तार',
    garbage: 'कचरा उचलला नाही',
    dumping: 'बेकायदा कचरा टाकणे',
    'tree-fall': 'पडलेले किंवा धोकादायक झाड',
    park: 'उद्यानाची निगा नाही',
    toilet: 'सार्वजनिक शौचालय अस्वच्छ किंवा तुटलेले',
    mosquito: 'डासांची पैदास, साचलेले पाणी',
    encroach: 'पदपथ किंवा रस्त्यावर अतिक्रमण',
    hoarding: 'बेकायदा फलक किंवा बॅनर',
    other: 'इतर समस्या',
  },
};

const WARD: Record<Exclude<Lang, 'en'>, Record<string, string>> = {
  hi: { kothrud: 'कोथरूड', aundh: 'औंध', shivajinagar: 'शिवाजीनगर', kasba: 'कसबा पेठ', yerawada: 'येरवडा', hadapsar: 'हडपसर' },
  mr: { kothrud: 'कोथरूड', aundh: 'औंध', shivajinagar: 'शिवाजीनगर', kasba: 'कसबा पेठ', yerawada: 'येरवडा', hadapsar: 'हडपसर' },
};

const TITLE: Record<Exclude<Lang, 'en'>, Record<DeptId, [string, string, string]> & { top: string }> = {
  hi: {
    roads: ['कनिष्ठ अभियंता (सड़क)', 'सहायक अभियंता (सड़क)', 'कार्यकारी अभियंता (सड़क)'],
    water: ['कनिष्ठ अभियंता (जल)', 'सहायक अभियंता (जल)', 'कार्यकारी अभियंता (जल)'],
    drainage: ['कनिष्ठ अभियंता (जल निकासी)', 'सहायक अभियंता (जल निकासी)', 'कार्यकारी अभियंता (जल निकासी)'],
    electrical: ['कनिष्ठ अभियंता (विद्युत)', 'सहायक अभियंता (विद्युत)', 'कार्यकारी अभियंता (विद्युत)'],
    sanitation: ['स्वच्छता निरीक्षक', 'मुख्य स्वच्छता निरीक्षक', 'प्रमुख, ठोस कचरा विभाग'],
    parks: ['उद्यान पर्यवेक्षक', 'सहायक उद्यान अधीक्षक', 'उद्यान अधीक्षक'],
    health: ['स्वास्थ्य निरीक्षक', 'वरिष्ठ स्वास्थ्य निरीक्षक', 'चिकित्सा स्वास्थ्य अधिकारी'],
    encroachment: ['अतिक्रमण निरीक्षक', 'सहायक आयुक्त (अतिक्रमण)', 'उप आयुक्त (अतिक्रमण)'],
    top: 'अपर नगर आयुक्त',
  },
  mr: {
    roads: ['कनिष्ठ अभियंता (रस्ते)', 'सहायक अभियंता (रस्ते)', 'कार्यकारी अभियंता (रस्ते)'],
    water: ['कनिष्ठ अभियंता (पाणीपुरवठा)', 'सहायक अभियंता (पाणीपुरवठा)', 'कार्यकारी अभियंता (पाणीपुरवठा)'],
    drainage: ['कनिष्ठ अभियंता (मलनिःसारण)', 'सहायक अभियंता (मलनिःसारण)', 'कार्यकारी अभियंता (मलनिःसारण)'],
    electrical: ['कनिष्ठ अभियंता (विद्युत)', 'सहायक अभियंता (विद्युत)', 'कार्यकारी अभियंता (विद्युत)'],
    sanitation: ['स्वच्छता निरीक्षक', 'मुख्य स्वच्छता निरीक्षक', 'प्रमुख, घनकचरा विभाग'],
    parks: ['उद्यान पर्यवेक्षक', 'सहायक उद्यान अधीक्षक', 'उद्यान अधीक्षक'],
    health: ['आरोग्य निरीक्षक', 'वरिष्ठ आरोग्य निरीक्षक', 'वैद्यकीय आरोग्य अधिकारी'],
    encroachment: ['अतिक्रमण निरीक्षक', 'सहायक आयुक्त (अतिक्रमण)', 'उपायुक्त (अतिक्रमण)'],
    top: 'अतिरिक्त महापालिका आयुक्त',
  },
};

const UNITS: Record<Lang, { day: [string, string]; hour: [string, string]; minute: [string, string] }> = {
  en: { day: ['day', 'days'], hour: ['hour', 'hours'], minute: ['minute', 'minutes'] },
  hi: { day: ['दिन', 'दिन'], hour: ['घंटा', 'घंटे'], minute: ['मिनट', 'मिनट'] },
  mr: { day: ['दिवस', 'दिवस'], hour: ['तास', 'तास'], minute: ['मिनिट', 'मिनिटे'] },
};

export function makeT(lang: Lang) {
  const dict = DICTS[lang];
  const locale = LANGS.find((l) => l.id === lang)!.locale;
  // Latin digits everywhere, so complaint numbers and dates read the same in every language.
  const opts = { numberingSystem: 'latn' } as const;
  const dateTime = new Intl.DateTimeFormat(locale, { ...opts, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const dateOnly = new Intl.DateTimeFormat(locale, { ...opts, day: 'numeric', month: 'short', year: 'numeric' });
  const longDate = new Intl.DateTimeFormat(locale, { ...opts, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  const t = (key: Key, vars?: Record<string, string | number>) => {
    let s = dict[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };

  const unit = (n: number, u: 'day' | 'hour' | 'minute') => `${n} ${UNITS[lang][u][n === 1 ? 0 : 1]}`;
  /** "6 days 23 hours", "5 hours 10 minutes": no seconds. */
  const span = (ms: number) => {
    const { d, h, m } = parts(ms);
    if (d > 0) return h ? `${unit(d, 'day')} ${unit(h, 'hour')}` : unit(d, 'day');
    if (h > 0) return m ? `${unit(h, 'hour')} ${unit(m, 'minute')}` : unit(h, 'hour');
    return unit(Math.max(1, m), 'minute');
  };
  const days = (n: number) => unit(n, 'day');

  const dept = (id: DeptId | null | undefined) => (id ? DEPT[lang][id][0] : '');
  const deptShort = (id: DeptId) => DEPT[lang][id][1];
  const catName = (categoryId: string) => {
    const c = category(categoryId);
    if (!c) return categoryId;
    if (lang === 'en') return c.name;
    return CAT[lang][c.other ? 'other' : c.id] ?? c.name;
  };
  /** The title of a complaint: the problem type, or what the citizen wrote for "Other". */
  const complaintTitle = (c: Pick<Complaint, 'categoryId' | 'otherType'>) => (category(c.categoryId)?.other && c.otherType ? c.otherType : catName(c.categoryId));
  const wardName = (id: string) => (lang === 'en' ? undefined : WARD[lang][id]) ?? ward(id)?.name ?? id;
  const designation = (o: Officer | string | undefined) => {
    const off = typeof o === 'string' ? officerById(o) : o;
    if (!off) return '';
    if (lang === 'en') return off.designation;
    if (!off.dept) return TITLE[lang].top;
    return TITLE[lang][off.dept][off.level - 1] ?? off.designation;
  };

  return {
    lang,
    locale,
    t,
    span,
    days,
    dept,
    deptShort,
    catName,
    complaintTitle,
    wardName,
    designation,
    fmtDateTime: (ms: number) => dateTime.format(ms),
    fmtDate: (ms: number) => dateOnly.format(ms),
    fmtLong: (ms: number) => longDate.format(ms),
  };
}

export type T = ReturnType<typeof makeT> & { setLang: (l: Lang) => void };

/** Title of one photo check, plus the detailed reason (with distances) in English only. */
export function checkText(k: Check, t: T['t'], lang: Lang) {
  return { title: t(`ck.${k.id}${k.pass ? '' : 'Fail'}` as Key), detail: lang === 'en' ? k.detail : '' };
}

const Ctx = createContext<T | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('jd:lang');
    if (saved === 'en' || saved === 'hi' || saved === 'mr') return saved;
  } catch {
    // Fall through to English.
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('jd:lang', l);
    } catch {
      // Still switches for this visit.
    }
  }, []);
  const value = useMemo(() => ({ ...makeT(lang), setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useT outside I18nProvider');
  return v;
}
