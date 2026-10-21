import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router';
import { category, CITY, officer, ward } from '../lib/catalog';
import { escalationCount, urgency } from '../lib/sla';
import type { Complaint } from '../lib/types';

const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const PIN_COLORS = {
  ok: '#2fa36b',
  soon: '#f0a43a',
  escalated: '#ff7a2f',
  overdue: '#e5483d',
  resolved: '#4f8fd6',
  closed: '#9aa0a8',
} as const;

export type PinKind = keyof typeof PIN_COLORS;

export function pinKind(c: Complaint, now: number): PinKind {
  const u = urgency(c, now);
  if (u === 'done') return c.status === 'resolved' ? 'resolved' : 'closed';
  if (u === 'overdue') return 'overdue';
  if (escalationCount(c) > 0) return 'escalated';
  return u;
}

const icons = new Map<string, L.DivIcon>();
function icon(color: string, big = false) {
  const key = color + big;
  if (!icons.has(key))
    icons.set(
      key,
      L.divIcon({
        className: '',
        html: `<div class="pin${big ? ' big' : ''}" style="--c:${color}"></div>`,
        iconSize: big ? [30, 30] : [22, 22],
        iconAnchor: big ? [15, 30] : [11, 22],
        popupAnchor: [0, -22],
      }),
    );
  return icons.get(key)!;
}

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 15);
  }, [map, points]);
  return null;
}

export function ComplaintsMap({ complaints, now, fit = true }: { complaints: Complaint[]; now: number; fit?: boolean }) {
  const points = useMemo(() => complaints.map((c) => [c.lat, c.lng] as [number, number]), [complaints]);
  return (
    <MapContainer className="map" center={[CITY.lat, CITY.lng]} zoom={12} scrollWheelZoom={false}>
      <TileLayer url={TILE} attribution={ATTR} />
      {fit && <Fit points={points} />}
      {complaints.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={icon(PIN_COLORS[pinKind(c, now)])} title={`${c.id}: ${category(c.categoryId)?.name}`}>
          <Popup>
            <div className="mono" style={{ fontSize: 12 }}>
              {c.id}
            </div>
            <strong>{category(c.categoryId)?.name}</strong>
            <div>
              {ward(c.wardId)?.name}
              {c.landmark ? ` · ${c.landmark}` : ''}
            </div>
            <div>With {officer(c.officerId)?.name}</div>
            <Link to={`/complaints/${c.id}`}>Open complaint →</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ at }: { at: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (at) map.setView(at, Math.max(map.getZoom(), 15));
  }, [map, at]);
  return null;
}

export function PinPicker({
  value,
  onChange,
  others,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  others: Complaint[];
}) {
  const at = useMemo(() => (value ? ([value.lat, value.lng] as [number, number]) : null), [value]);
  return (
    <MapContainer className="map" style={{ height: 340 }} center={[CITY.lat, CITY.lng]} zoom={12} scrollWheelZoom={false}>
      <TileLayer url={TILE} attribution={ATTR} />
      <ClickToPin onPick={onChange} />
      <Recenter at={at} />
      {others.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={icon(PIN_COLORS.soon)} title={`Already reported: ${c.id}`} />
      ))}
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={icon('#ffc21a', true)}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onChange(p.lat, p.lng);
            },
          }}
          title="Your complaint location"
        />
      )}
    </MapContainer>
  );
}
