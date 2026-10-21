import type { Category, Department, DeptId, Officer, Ward } from './types';

export const DEPARTMENTS: Department[] = [
  { id: 'roads', name: 'Roads & Footpaths', short: 'Roads' },
  { id: 'water', name: 'Water Supply', short: 'Water' },
  { id: 'drainage', name: 'Drainage & Sewerage', short: 'Drainage' },
  { id: 'electrical', name: 'Street Lighting', short: 'Lighting' },
  { id: 'sanitation', name: 'Solid Waste & Sanitation', short: 'Sanitation' },
];

export const CATEGORIES: Category[] = [
  { id: 'pothole', dept: 'roads', name: 'Pothole', slaDays: 7, glyph: '◉' },
  { id: 'footpath', dept: 'roads', name: 'Broken footpath', slaDays: 10, glyph: '▦' },
  { id: 'debris', dept: 'roads', name: 'Debris blocking road', slaDays: 3, glyph: '▲' },
  { id: 'no-water', dept: 'water', name: 'No water supply', slaDays: 2, glyph: '◌' },
  { id: 'leak', dept: 'water', name: 'Pipeline leakage', slaDays: 3, glyph: '≋' },
  { id: 'dirty-water', dept: 'water', name: 'Contaminated water', slaDays: 1, glyph: '◍' },
  { id: 'drain', dept: 'drainage', name: 'Blocked drain', slaDays: 3, glyph: '▤' },
  { id: 'sewer', dept: 'drainage', name: 'Overflowing sewer', slaDays: 2, glyph: '◒' },
  { id: 'streetlight', dept: 'electrical', name: 'Streetlight not working', slaDays: 5, glyph: '✦' },
  { id: 'wire', dept: 'electrical', name: 'Exposed electric wire', slaDays: 1, glyph: 'ϟ' },
  { id: 'garbage', dept: 'sanitation', name: 'Garbage not collected', slaDays: 2, glyph: '▣' },
  { id: 'dumping', dept: 'sanitation', name: 'Illegal dumping', slaDays: 3, glyph: '◆' },
];

export const WARDS: Ward[] = [
  { id: 'kothrud', name: 'Kothrud', lat: 18.5074, lng: 73.8077, beat: 'west' },
  { id: 'aundh', name: 'Aundh', lat: 18.559, lng: 73.8076, beat: 'west' },
  { id: 'shivajinagar', name: 'Shivajinagar', lat: 18.5308, lng: 73.8475, beat: 'west' },
  { id: 'kasba', name: 'Kasba Peth', lat: 18.5196, lng: 73.8553, beat: 'east' },
  { id: 'yerawada', name: 'Yerawada', lat: 18.5529, lng: 73.8796, beat: 'east' },
  { id: 'hadapsar', name: 'Hadapsar', lat: 18.5089, lng: 73.926, beat: 'east' },
];

export const CITY = { name: 'Pune', lat: 18.5304, lng: 73.8567 };

const TITLES: Record<DeptId, [string, string, string]> = {
  roads: ['Junior Engineer (Roads)', 'Assistant Engineer (Roads)', 'Executive Engineer (Roads)'],
  water: ['Junior Engineer (Water)', 'Assistant Engineer (Water)', 'Executive Engineer (Water)'],
  drainage: ['Junior Engineer (Drainage)', 'Assistant Engineer (Drainage)', 'Executive Engineer (Drainage)'],
  electrical: ['Junior Engineer (Electrical)', 'Assistant Engineer (Electrical)', 'Executive Engineer (Electrical)'],
  sanitation: ['Sanitary Inspector', 'Chief Sanitary Inspector', 'Head, Solid Waste Dept.'],
};

// Fictional people. Any resemblance to real officers is coincidental.
const NAMES: Record<DeptId, [string, string, string, string]> = {
  roads: ['Rohan Patil', 'Sneha Kulkarni', 'Amit Deshpande', 'Vandana Joshi'],
  water: ['Kiran Shinde', 'Meera Gokhale', 'Suresh Pawar', 'Anil Bhosale'],
  drainage: ['Pooja Jadhav', 'Nikhil More', 'Farhan Shaikh', 'Lata Kale'],
  electrical: ['Sagar Chavan', 'Ritu Sawant', 'Prakash Naik', 'Deepa Mane'],
  sanitation: ['Ganesh Waghmare', 'Ayesha Inamdar', 'Mahesh Gaikwad', 'Shalini Rane'],
};

const TOP: Officer = {
  id: 'amc',
  name: 'Dr. Vikram Rao',
  designation: 'Additional Municipal Commissioner',
  level: 4,
  dept: null,
  beat: null,
  seniorId: null,
  since: '2019',
};

function buildOfficers(): Officer[] {
  const list: Officer[] = [TOP];
  for (const d of DEPARTMENTS) {
    const [jeW, jeE, ae, ee] = NAMES[d.id];
    const [t1, t2, t3] = TITLES[d.id];
    const eeId = `${d.id}-ee`;
    const aeId = `${d.id}-ae`;
    list.push(
      { id: eeId, name: ee, designation: t3, level: 3, dept: d.id, beat: null, seniorId: TOP.id, since: '2016' },
      { id: aeId, name: ae, designation: t2, level: 2, dept: d.id, beat: null, seniorId: eeId, since: '2018' },
      { id: `${d.id}-je-west`, name: jeW, designation: t1, level: 1, dept: d.id, beat: 'west', seniorId: aeId, since: '2021' },
      { id: `${d.id}-je-east`, name: jeE, designation: t1, level: 1, dept: d.id, beat: 'east', seniorId: aeId, since: '2022' },
    );
  }
  return list;
}

export const OFFICERS: Officer[] = buildOfficers();

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const officerMap = byId(OFFICERS);
const categoryMap = byId(CATEGORIES);
const wardMap = byId(WARDS);
const deptMap = byId(DEPARTMENTS);

export const officer = (id: string) => officerMap.get(id);
export const category = (id: string) => categoryMap.get(id);
export const ward = (id: string) => wardMap.get(id);
export const department = (id: string) => deptMap.get(id as DeptId);

/** The junior officer who owns a category in a ward. */
export function assignee(categoryId: string, wardId: string): Officer {
  const cat = category(categoryId);
  const w = ward(wardId);
  if (!cat || !w) throw new Error('Unknown category or ward');
  const found = OFFICERS.find((o) => o.level === 1 && o.dept === cat.dept && o.beat === w.beat);
  if (!found) throw new Error('No officer for this ward');
  return found;
}

/** Officer chain from a given officer up to the top. */
export function chainFrom(id: string): Officer[] {
  const out: Officer[] = [];
  let cur = officer(id);
  while (cur) {
    out.push(cur);
    cur = cur.seniorId ? officer(cur.seniorId) : undefined;
  }
  return out;
}

export function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
