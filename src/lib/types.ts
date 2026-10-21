export type DeptId = 'roads' | 'water' | 'drainage' | 'electrical' | 'sanitation';

export interface Department {
  id: DeptId;
  name: string;
  short: string;
}

export interface Category {
  id: string;
  dept: DeptId;
  name: string;
  slaDays: number;
  glyph: string;
}

export interface Ward {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Which junior-engineer beat covers this ward. */
  beat: 'west' | 'east';
}

export type Level = 1 | 2 | 3 | 4;

export interface Officer {
  id: string;
  name: string;
  designation: string;
  level: Level;
  /** null = city-wide, all departments (top of every chain). */
  dept: DeptId | null;
  /** Junior engineers cover a beat of wards; seniors cover the whole department. */
  beat: 'west' | 'east' | null;
  seniorId: string | null;
  since: string;
}

export type Status = 'assigned' | 'in_progress' | 'reopened' | 'resolved' | 'closed';

export const OPEN_STATUSES: Status[] = ['assigned', 'in_progress', 'reopened'];

export type EventKind =
  | 'filed'
  | 'assigned'
  | 'started'
  | 'escalated'
  | 'proof_rejected'
  | 'resolved'
  | 'confirmed'
  | 'reopened'
  | 'rated'
  | 'supported';

export interface CEvent {
  at: number;
  kind: EventKind;
  /** Officer who acted or received the complaint. */
  officerId?: string;
  /** For escalations: the officer who missed the deadline. */
  fromOfficerId?: string;
  /** For resolutions: whether it was before the deadline. */
  onTime?: boolean;
  note?: string;
}

export type CheckId = 'live' | 'location' | 'time' | 'reuse';

export interface Check {
  id: CheckId;
  pass: boolean;
  detail: string;
}

export type PhotoSource = 'camera' | 'upload' | 'demo-camera';

export interface Proof {
  photo: string;
  hash: string;
  takenAt: number;
  lat?: number;
  lng?: number;
  source: PhotoSource;
  checks: Check[];
  at: number;
  officerId: string;
}

export interface Complaint {
  id: string;
  citizenId: string;
  categoryId: string;
  wardId: string;
  description: string;
  lat: number;
  lng: number;
  landmark?: string;
  /** Data URL, or "seed:<scene>:<variant>" for generated sample photos. */
  photo?: string;
  photoHash?: string;
  createdAt: number;
  deadline: number;
  officerId: string;
  status: Status;
  supporters: string[];
  events: CEvent[];
  proof?: Proof;
  resolvedAt?: number;
  resolvedBy?: string;
  rating?: { stars: number; at: number; note?: string };
}

export interface Citizen {
  id: string;
  name: string;
  phone: string;
  aadhaarLast4: string;
  verifiedAt: number;
}

export type Session =
  | { role: 'citizen'; citizenId: string }
  | { role: 'officer'; officerId: string };

export interface DB {
  version: 1;
  seededAt: number;
  offsetMs: number;
  seq: number;
  citizens: Citizen[];
  complaints: Complaint[];
  session: Session | null;
}
