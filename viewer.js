'use strict';
(() => {
  window.addEventListener('hashchange', () => location.reload());
  const API = 'https://jadavfwsapncsxylhkar.supabase.co/functions/v1/sentinel-relay';
  const $ = id => document.getElementById(id);
  const match = /^#([a-f0-9-]{36})\.([a-f0-9]{64})$/i.exec(location.hash);
  if (!match) return;
  const [, id, token] = match;
  let map, marker, circle, latest, expiresAt, stopped = false, timer, first = true, inFlight = false;
  function stop(message) {
    stopped = true;
    clearTimeout(timer);
    $('status').textContent = message;
    $('status').classList.add('expired');
    $('freshness').textContent = 'SESSION ENDED';
    $('expiry').textContent = '00:00';
    map?.remove(); map = undefined;
    $('map').replaceChildren(Object.assign(document.createElement('div'), { className: 'empty', textContent: '[ SESSION ENDED ]' }));
    $('directions').hidden = true;
    $('coordinates').textContent = '';
    $('accuracy').textContent = '—'; $('battery').textContent = '—'; $('recenter').disabled = true;
    latest = undefined;
  }
  function draw(point) {
    const latlng = [point.latitude, point.longitude];
    if (typeof L !== 'undefined') {
      if (!map) {
        $('map').replaceChildren();
        map = L.map('map', { zoomControl: true }).setView(latlng, 16);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>', maxZoom: 19 }).addTo(map);
        marker = L.marker(latlng, { icon: L.divIcon({ className: 'signal-dot', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map);
        circle = L.circle(latlng, { color: '#2b95c6', fillOpacity: .12, radius: point.accuracy }).addTo(map);
      } else { marker.setLatLng(latlng); circle.setLatLng(latlng).setRadius(point.accuracy); }
      $('recenter').disabled = false;
    } else $('map').firstElementChild.textContent = 'Map tiles unavailable. Coordinates and Google Maps remain available below.';
    $('accuracy').textContent = `${Math.round(point.accuracy)} m`;
    $('battery').textContent = `${Math.round(point.battery)}%`;
    $('coordinates').textContent = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
    $('directions').href = `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
    $('directions').hidden = false;
  }
  async function refresh() {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const response = await fetch(`${API}/api/sessions/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) });
      if ([401, 404].includes(response.status)) { stop('This recovery link has expired or is unavailable. Send a new LIVE command to your phone.'); return; }
      if (!response.ok) throw new Error('network');
      const data = await response.json();
      const p = data.point;
      if (![p.latitude, p.longitude, p.accuracy, p.battery, p.observedAt].every(Number.isFinite)) throw new Error('data');
      expiresAt = Date.parse(data.expiresAt);
      if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) { stop('This recovery session has ended.'); return; }
      if (!latest || p.observedAt !== latest.observedAt) draw(p);
      latest = p; first = false;
      $('status').textContent = 'Connected. New phone locations appear here automatically.';
      $('status').classList.remove('expired');
      tick();
    } catch {
      $('status').textContent = first ? 'Connecting to the recovery relay… retrying.' : 'Connection interrupted. Showing the last received fix; retrying.';
    } finally { inFlight = false; if (!stopped) timer = setTimeout(refresh, 10000); }
  }
  function tick() {
    if (stopped || !expiresAt) return;
    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
    if (remaining <= 0) { stop('This recovery session has ended.'); return; }
    $('expiry').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    if (latest) {
      const age = Math.max(0, Math.floor((Date.now() - latest.observedAt) / 1000));
      $('freshness').textContent = `${age > 120 ? 'STALE FIX' : 'LAST FIX'} · ${age}s AGO`;
      $('freshness').classList.toggle('expired', age > 120);
    }
  }
  $('recenter').onclick = () => { if (map && latest) map.setView([latest.latitude, latest.longitude], map.getZoom()); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !stopped) { clearTimeout(timer); refresh(); } });
  setInterval(tick, 1000);
  refresh();
})();
