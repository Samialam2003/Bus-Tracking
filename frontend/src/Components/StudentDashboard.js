import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import MapPreview from './MapPreview';

const styles = {
  wrap: { maxWidth: '1400px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, Arial, sans-serif', background: '#0d1b2a', color: '#e0e0e0', minHeight: '100vh', scrollBehavior: 'smooth' },
  card: { background: '#1b3b5a', border: '1px solid #223a5a', borderRadius: '16px', padding: '18px', marginBottom: '18px', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease' },
  row: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  avatar: { width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', background: '#102c44', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', border: '2px solid #00bcd4' },
  input: { width: '100%', padding: '12px 14px', border: '1px solid #223a5a', borderRadius: '12px', background: '#102c44', color: '#e0e0e0', outline: 'none', transition: 'all 0.4s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  button: { padding: '12px 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #00bcd4, #2196f3)', color: '#0d1b2a', cursor: 'pointer', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease', transform: 'translateY(0)', fontWeight: 600 },
  secondary: { background: '#223a5a', color: '#e0e0e0', border: '1px solid #2b4f73', boxShadow: '0 6px 15px rgba(0,0,0,0.3)' },
  areaCard: { border: '1px solid #223a5a', borderRadius: '14px', padding: '12px', background: '#102c44', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease' },
  grid: { display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))' },
  headerTitle: { color: '#ffffff', fontWeight: '700' },
  subText: { fontSize: '12px', color: '#c8d6e5' },
  glowNote: { padding: '8px 10px', background: 'rgba(187,134,252,0.1)', border: '1px solid rgba(187,134,252,0.35)', borderRadius: '12px', color: '#e0e0e0', boxShadow: '0 0 18px rgba(187,134,252,0.25)' },
  badge: { display: 'inline-block', padding: '6px 10px', fontSize: '11px', color: '#e0e0e0', background: 'rgba(0,188,212,0.12)', border: '1px solid rgba(0,188,212,0.35)', borderRadius: '999px', boxShadow: '0 0 18px rgba(0,188,212,0.25)', marginTop: '8px' },
  hero: { position: 'relative', overflow: 'hidden', padding: '28px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(0,188,212,0.12), rgba(33,150,243,0.12))', border: '1px solid rgba(0,188,212,0.35)', boxShadow: '0 18px 38px rgba(0,0,0,0.35)' },
  heroTitle: { fontSize: '28px', fontWeight: 800, letterSpacing: '0.3px', color: '#ffffff' },
  heroText: { marginTop: '8px', color: '#c8d6e5', maxWidth: '820px', lineHeight: 1.6 },
  heroRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
  heroOrb: { position: 'absolute', width: '160px', height: '160px', right: '-40px', top: '-40px', background: 'radial-gradient(circle at 30% 30%, rgba(0,188,212,0.35), rgba(33,150,243,0.15), rgba(13,27,42,0))', borderRadius: '50%', filter: 'blur(2px)' },
  topRow: { display: 'flex', gap: '18px', alignItems: 'stretch', flexWrap: 'wrap' },
  profileCols: { display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'nowrap' },
  leftCol: { width: '30%', minWidth: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  rightCol: { flex: 1 },
  smallButton: { padding: '8px 12px', fontSize: '14px' },
  searchWrap: { width: '60%', minWidth: '300px', maxWidth: '720px', margin: '0 auto' },
  heroLeft: { flex: '0 1 25%', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '10px' },
  heroRight: { flex: 1, minWidth: '300px' },
  profileRow: { display: 'flex', gap: '12px', alignItems: 'center' },
  photoCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
};

const StudentDashboard = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';
  const HOST_TOKEN = process.env.REACT_APP_HOST_TOKEN || 'HOST_TOKEN_SANDESH';
  const [me, setMe] = useState(null);
  const [areas, setAreas] = useState([]);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState({});
  const [driversByArea, setDriversByArea] = useState({});
  const [chosen, setChosen] = useState(null); // { hostId, driver }
  const [livePos, setLivePos] = useState(null);
  const socketRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [mode, setMode] = useState('list'); // 'list' | 'live'

  useEffect(() => {
    (async () => {
      try {
        const prof = await fetch(`${API_BASE_URL}/student/me`, { credentials: 'include' });
        const pdata = await prof.json().catch(() => ({}));
        if (prof.ok) setMe(pdata.data);
      } catch {}
      try {
        const res = await fetch(`${API_BASE_URL}/host?createdBy=sandesh`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) setAreas(Array.isArray(data.data) ? data.data : []);
      } catch {}
    })();
  }, [API_BASE_URL]);

  const filteredAreas = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = (areas || []).filter(a => !s || (a.areaName || '').toLowerCase().includes(s));
    return list.sort((a, b) => (a.areaName || '').localeCompare(b.areaName || ''));
  }, [areas, q]);

  // Use same retrieval method as HostDashboard: /driver with host token, then filter by area + accepted
  const loadDrivers = async (hostId) => {
    try {
      const id = String(hostId);
      const res = await fetch(`${API_BASE_URL}/driver`, { headers: { 'x-host-token': HOST_TOKEN } });
      const data = await res.json();
      if (!res.ok) { setDriversByArea(prev => ({ ...prev, [id]: [] })); return; }
      const all = Array.isArray(data.data) ? data.data : [];
      const filtered = all.filter(d => {
        const statusOk = String(d.status || '').toLowerCase() === 'accepted';
        const assigned = d.assignedArea;
        const assignedId = assigned && typeof assigned === 'object' ? assigned._id : assigned;
        return statusOk && String(assignedId) === id;
      });
      setDriversByArea(prev => ({ ...prev, [id]: filtered }));
    } catch {
      setDriversByArea(prev => ({ ...prev, [String(hostId)]: [] }));
    }
  };

  const onFileChange = (e) => {
    setUploadMsg('');
    setFile(e.target.files?.[0] || null);
  };

  const uploadPhoto = async () => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadMsg('');
      const fd = new FormData();
      fd.append('photo', file);
      const res = await fetch(`${API_BASE_URL}/student/photo`, { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const prof = await fetch(`${API_BASE_URL}/student/me`, { credentials: 'include' });
      const pdata = await prof.json();
      if (prof.ok) setMe(pdata.data);
      setUploadMsg('Photo uploaded successfully');
      setFile(null);
    } catch (e) {
      setUploadMsg(e.message);
    } finally {
      setUploading(false);
    }
  };

  const chooseDriver = async (hostId, driver) => {
    try {
      await fetch(`${API_BASE_URL}/student/select`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ hostId, driverId: driver._id })
      });
    } catch {}
    setChosen({ hostId, driver });
    setLivePos(null);
    setMode('live');
    const s = io(API_BASE_URL, { withCredentials: true });
    socketRef.current = s;
    s.on('connect', () => { s.emit('authenticate', { hostId }); });
    s.on('location-update', (p) => { if (p.driverId === driver._id) setLivePos({ lat: p.lat, lng: p.lng, ts: p.ts }); });
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/driver/${driver._id}/live-location`);
        const d = await r.json();
        if (r.ok && d.data) setLivePos({ lat: d.data.lat, lng: d.data.lng, ts: d.data.ts });
      } catch {}
    }, 1000);
    s.on('disconnect', () => clearInterval(poll));
  };

  const leaveLiveView = () => {
    if (socketRef.current) {
      try { socketRef.current.disconnect(); } catch {}
      socketRef.current = null;
    }
    setMode('list');
  };

  if (mode === 'live' && chosen) {
    const area = areas.find(a => a._id === chosen.hostId);
    return (
      <div style={styles.wrap}>
        <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={styles.headerTitle}>Live Map: {area?.areaName || 'Area'}</div>
            <div style={styles.subText}>Driver: {chosen.driver?.name || chosen.driver?.email}</div>
          </div>
          <button style={{ ...styles.button, ...styles.secondary }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            onClick={leaveLiveView}
          >⬅ Back</button>
        </div>
        <div style={styles.card}>
          <MapPreview
            center={area?.location}
            boundary={area?.boundary}
            allowPolygonDrawing={false}
            zoom={15}
            liveDriver={livePos ? { lat: livePos.lat, lng: livePos.lng, photo: chosen.driver?.driverPhoto } : null}
            offlineMessage={!livePos ? 'Driver is not in area' : ''}
          />
          <div style={styles.badge}>
            {livePos?.ts ? (() => {
              const diff = Math.max(0, Math.floor((Date.now() - new Date(livePos.ts).getTime()) / 1000));
              return `Last seen ${diff}s ago`;
            })() : 'Waiting for live location…'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <style>{`
        @keyframes floatY { 0% { transform: translateY(0); } 50% { transform: translateY(-6px); } 100% { transform: translateY(0); } }
        @keyframes glowPulse { 0% { box-shadow: 0 0 0 0 rgba(0,188,212,0.25); } 50% { box-shadow: 0 0 0 8px rgba(0,188,212,0.08);} 100% { box-shadow: 0 0 0 0 rgba(0,188,212,0.25);} }
      `}</style>

      <div style={{ ...styles.card, animation: 'floatY 6s ease-in-out infinite' }}>
        <div style={styles.hero}>
          <div style={styles.heroOrb} />
          <div style={styles.heroRow}>
            <div style={styles.heroLeft}>
              {me && (
                <>
                  <div style={styles.profileRow}>
                    {(() => {
                      const src = me?.photo ? (String(me.photo).startsWith('http') ? me.photo : `${API_BASE_URL}${me.photo}`) : null;
                      return null; // moved inside photoCol
                    })()}
                    <div style={styles.photoCol}>
                      {(() => {
                        const src = me?.photo ? (String(me.photo).startsWith('http') ? me.photo : `${API_BASE_URL}${me.photo}`) : null;
                        return src ? (<img src={src} alt="me" style={styles.avatar} />) : null;
                      })()}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                        <input type="file" accept="image/*" onChange={onFileChange} style={{ ...styles.input, padding: 8 }} />
                        <button style={{ ...styles.button, ...styles.smallButton }} disabled={!file || uploading}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                          onClick={uploadPhoto}
                        >{uploading ? 'Uploading…' : 'Upload'}</button>
                      </div>
                      {uploadMsg && <div style={{ ...styles.subText, marginTop: 6, alignSelf: 'stretch' }}>{uploadMsg}</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.headerTitle}>{me?.name || me?.email || 'Student'}</div>
                      <div style={{ ...styles.subText, marginBottom: 8 }}>{me?.email} {me?.age ? `• Age: ${me.age}` : ''}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={styles.heroRight}>
              <div style={styles.heroTitle}>Welcome to BusTrack</div>
              <div style={styles.heroText}>
                Your modern companion for discovering areas, selecting drivers, and tracking buses in real time. Upload your profile photo, explore assigned areas, and jump into a live map when you choose a driver. Smooth, simple, and secure.
              </div>
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <div style={{ display: 'inline-block', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,188,212,0.35)', background: 'rgba(0,188,212,0.08)', color: '#e0e0e0', fontWeight: 700, animation: 'glowPulse 3.6s ease-in-out infinite' }}>
                  Effortless Tracking ✨
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.searchWrap}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search areas…" style={styles.input}
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Areas ({filteredAreas.length})</div>
        <div style={styles.grid}>
          {filteredAreas.map(area => (
            <div key={area._id} style={styles.areaCard}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 30px rgba(0,0,0,0.55)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 18px rgba(0,0,0,0.4)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...styles.headerTitle, fontSize: '16px' }}>{area.areaName}</div>
                  <div style={styles.subText}>{area.areaType}</div>
                </div>
                <button style={{ ...styles.button, ...styles.secondary }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = styles.secondary.boxShadow; }}
                  onClick={() => { setExpanded(prev => ({ ...prev, [area._id]: !prev[area._id] })); loadDrivers(area._id); }}
                >
                  {expanded[area._id] ? 'Hide Drivers' : 'See Drivers'}
                </button>
              </div>

              {expanded[area._id] && (
                <div style={{ marginTop: 10, display: 'grid', gap: '10px' }}>
                  {driversByArea[area._id] === undefined ? (
                    <div style={styles.subText}>Loading drivers...</div>
                  ) : (driversByArea[area._id] || []).length === 0 ? (
                    <div style={styles.subText}>No drivers assigned yet</div>
                  ) : (
                    (driversByArea[area._id] || []).map((d) => (
                      <div key={d._id} style={{ display: 'flex', gap: '10px', alignItems: 'center', border: '1px solid #2a2a2a', background: '#0f2436', borderRadius: '10px', padding: '10px', boxShadow: '0 8px 18px rgba(0,0,0,0.4)', transition: 'all 0.3s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        {d.driverPhoto && <img src={d.driverPhoto} alt="driver" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 6px 14px rgba(0,0,0,0.5)' }} />}
                        {d.vehiclePhoto && <img src={d.vehiclePhoto} alt="bus" style={{ width: 64, height: 40, borderRadius: '8px', objectFit: 'cover', boxShadow: '0 6px 14px rgba(0,0,0,0.45)' }} />}
                        <div style={{ flex: 1 }}>
                          <div style={styles.headerTitle}>{d.name || d.email}</div>
                          <div style={styles.subText}>{d.email} {d.age ? `• Age: ${d.age}` : ''}</div>
                        </div>
                        <button style={styles.button}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 30px rgba(33,150,243,0.35)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(33,150,243,0.25)'; }}
                          onClick={() => chooseDriver(area._id, d)}
                        >Choose This Driver</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

