import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import AreaCard from './AreaCard';
import MapPreview from './MapPreview';

const styles = {
  wrap: { maxWidth: '1400px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, Arial, sans-serif', background: '#0d1b2a', color: '#e0e0e0', minHeight: '100vh', scrollBehavior: 'smooth' },
  header: { marginBottom: '16px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#ffffff' },
  sub: { fontSize: '12px', color: '#c8d6e5' },
  card: { background: '#1b3b5a', border: '1px solid #223a5a', borderRadius: '16px', padding: '18px', marginBottom: '18px', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease' },
  row: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  avatar: { width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', background: '#102c44', boxShadow: '0 6px 15px rgba(0,0,0,0.3)' },
  button: { padding: '12px 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #00bcd4, #2196f3)', color: '#0d1b2a', cursor: 'pointer', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease', transform: 'translateY(0)' },
  danger: { background: 'linear-gradient(135deg, #bb86fc, #7c4dff)', color: '#0d1b2a' },
  neutral: { background: '#223a5a', color: '#e0e0e0', border: '1px solid #2b4f73' },
  list: { display: 'grid', gap: '12px' },
  inline: { fontSize: '12px', color: '#c8d6e5' },
  chips: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' },
  chip: { padding: '6px 10px', borderRadius: '14px', border: '1px solid #2b4f73', background: '#102c44', fontSize: '12px', cursor: 'pointer', color: '#e0e0e0' },
  paragraph: { marginTop: '10px', color: '#dfe6ee', lineHeight: 1.6, fontSize: '14px' },
  statusBar: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' },
  tooltip: { fontSize: '11px', color: '#c8d6e5', marginTop: '6px' }
};

const DriverDashboard = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';
  const [me, setMe] = useState(null);
  const [areas, setAreas] = useState([]);
  const [message, setMessage] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const geoWatchIdRef = useRef(null);
  const [explore, setExplore] = useState(false);
  const [countdown, setCountdown] = useState(null); // ms remaining to scheduledStart
  const [livePos, setLivePos] = useState(null); // {lat,lng}

  const assignedArea = useMemo(() => {
    if (!me || !me.assignedArea) return null;
    // Backend populates assignedArea; accept both id or populated object
    if (typeof me.assignedArea === 'object') return me.assignedArea;
    return areas.find(a => a._id === me.assignedArea) || null;
  }, [areas, me]);

  // Connect socket
  useEffect(() => {
    const s = io(API_BASE_URL, { withCredentials: true });
    socketRef.current = s;
    s.on('connect', () => setSocketConnected(true));
    s.on('disconnect', () => setSocketConnected(false));
    return () => s.disconnect();
  }, [API_BASE_URL]);

  // Auth socket to join personal room when we know driver id
  useEffect(() => {
    if (socketRef.current && me?._id) {
      socketRef.current.emit('authenticate', { driverId: me._id });
      socketRef.current.on('application-accepted', () => setMessage('Congratulations! Your application has been accepted.'));
      socketRef.current.on('application-rejected', (p) => setMessage(p?.message || 'Your application has been rejected'));
      socketRef.current.on('start-warning', () => setMessage('Your journey starts in 5 minutes.'));
      socketRef.current.on('driver-removed', (p) => {
        setMessage(p?.message || 'Due to some unconventional things you have been removed from the driving area.');
        // Try to refresh local state (may 401 if account deleted)
        loadMe();
      });
    }
  }, [me]);

  // Local countdown for any scheduledStart (kept for completeness, can be removed later)
  useEffect(() => {
    if (!me?.scheduledStart) { setCountdown(null); return; }
    const target = new Date(me.scheduledStart).getTime();
    const id = setInterval(() => {
      const remain = target - Date.now();
      setCountdown(remain > 0 ? remain : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [me?.scheduledStart]);

  // Load profile
  const loadMe = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/driver/me`, { credentials: 'include' });
      const d = await r.json();
      if (r.ok) setMe(d.data);
    } catch {}
  };

  // Load areas (host-created areas)
  const loadAreas = async () => {
    try {
      // Our Host GET requires createdBy filter; use demo createdBy
      const r = await fetch(`${API_BASE_URL}/host?createdBy=sandesh`);
      const d = await r.json();
      if (r.ok) setAreas(d.data || []);
    } catch {}
  };

  useEffect(() => { loadMe(); loadAreas(); }, []);

  const apply = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/driver/apply`, { method: 'POST', credentials: 'include' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to apply');
      setMessage(d.message || 'Applied');
      loadMe();
    } catch (e) { setMessage(e.message); }
  };

  const chooseArea = async (area) => {
    try {
      const r = await fetch(`${API_BASE_URL}/driver/choose-area/${area._id}`, { method: 'POST', credentials: 'include' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to choose area');
      setMessage('Area chosen successfully');
      await Promise.all([loadMe(), loadAreas()]);
    } catch (e) { setMessage(e.message); }
  };

  const leaveArea = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/driver/leave-area`, { method: 'POST', credentials: 'include' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to leave area');
      setMessage('Left area');
      // Stop watching when leaving area
      try { if (geoWatchIdRef.current != null && navigator.geolocation) { navigator.geolocation.clearWatch(geoWatchIdRef.current); } } catch {}
      geoWatchIdRef.current = null;
      setLivePos(null);
      await Promise.all([loadMe(), loadAreas()]);
    } catch (e) { setMessage(e.message); }
  };

  const setStatus = async (type, minutes) => {
    try {
      const r = await fetch(`${API_BASE_URL}/driver/set-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, minutes })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to set status');
      setMessage('Status updated');
      loadMe();
    } catch (e) { setMessage(e.message); }
  };

  // Start watching device geolocation and stream to backend/socket
  const startDeviceLocation = (hostId) => {
    if (!navigator.geolocation) { setMessage('Geolocation not supported on this device'); return; }
    if (!socketRef.current) return;
    if (geoWatchIdRef.current != null) return; // already watching

    // Ensure we are authenticated for area room
    try { socketRef.current.emit('authenticate', { driverId: me._id, hostId }); } catch {}

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try { socketRef.current.emit('location-update', { hostId, driverId: me._id, lat: latitude, lng: longitude, ts: Date.now() }); } catch {}
        try {
          await fetch(`${API_BASE_URL}/driver/start-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lat: latitude, lng: longitude })
          });
        } catch {}
        setLivePos({ lat: latitude, lng: longitude, ts: Date.now() });
      },
      (err) => { setMessage(err?.message || 'Location permission denied'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const startJourney = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/driver/start-journey`, { method: 'POST', credentials: 'include' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to start journey');
      setMessage('Journey started, publishing location…');
      // Subscribe to area room for broadcasting
      if (socketRef.current && me?.assignedArea) {
        const hostId = typeof me.assignedArea === 'object' ? me.assignedArea._id : me.assignedArea;
        startDeviceLocation(hostId);
      }
      loadMe();
    } catch (e) { setMessage(e.message); }
  };

  const stopJourney = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/driver/stop-journey`, { method: 'POST', credentials: 'include' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to stop journey');
      setMessage('Journey stopped');
      // Clear geolocation watcher
      try { if (geoWatchIdRef.current != null && navigator.geolocation) { navigator.geolocation.clearWatch(geoWatchIdRef.current); geoWatchIdRef.current = null; } } catch {}
      loadMe();
    } catch (e) { setMessage(e.message); }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { if (geoWatchIdRef.current != null && navigator.geolocation) { navigator.geolocation.clearWatch(geoWatchIdRef.current); } } catch {}
      geoWatchIdRef.current = null;
    };
  }, []);

  // Auto-start location streaming as soon as an area is assigned and socket is connected
  useEffect(() => {
    if (!socketConnected || !me?.assignedArea) return;
    const hostId = typeof me.assignedArea === 'object' ? me.assignedArea._id : me.assignedArea;
    startDeviceLocation(hostId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketConnected, me?.assignedArea]);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h2 style={styles.title}>Driver Dashboard</h2>
        <div style={styles.sub}>Socket: {socketConnected ? 'connected' : 'disconnected'}</div>
      </div>

      {message && <div style={{ ...styles.card, background: 'rgba(187,134,252,0.1)', borderColor: 'rgba(187,134,252,0.25)', boxShadow: '0 0 18px rgba(187,134,252,0.25)' }}>{message}</div>}

      {/* Profile */}
      <div style={styles.card}>
        <div style={styles.row}>
          {me?.driverPhoto ? (
            <img alt="avatar" src={me.driverPhoto} style={styles.avatar} />
          ) : (
            <div style={{ ...styles.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8fb9d9', fontSize: 36 }}>🧑‍✈️</div>
          )}
          <div>
            <div><b>{me?.name || 'Not logged in'}</b></div>
            <div style={styles.inline}>{me?.age ? `Age: ${me.age} · ` : ''}{me?.email}</div>
            {me?.status === 'pending' && (
              <div style={{ ...styles.inline, color: '#856404', marginTop: '6px' }}>
                {/* Exact pending message */}
                Your driving request has been submitted and you will be notified once your request is accepted.
              </div>
            )}
            {me?.status === 'rejected' && (
              <div style={{ ...styles.inline, color: '#a94442', marginTop: '6px' }}>
                Application rejected{me?.rejectionReason ? `: ${me.rejectionReason}` : ''}
              </div>
            )}
          </div>
        </div>
        <p style={styles.paragraph}>
          Welcome to our smart transit platform. Explore real-time maps, coordinate with hosts, and deliver a smooth commuting experience for students. This space will feature your personalized highlights and helpful links. Placeholders are used here; you can paste your own image URLs later in other sections.
        </p>

        {/* Actions shown only when not pending, not accepted, and no assigned area */}
        {me?.status !== 'pending' && me?.status !== 'accepted' && !assignedArea && (
          <div className="actions" style={{ ...styles.row, marginTop: '10px' }}>
            <button style={styles.button} onClick={apply}>Apply for Driving</button>
          </div>
        )}

        {/* Accepted message and Explore maps button */}
        {me?.status === 'accepted' && (
          <div style={{ ...styles.row, marginTop: '10px' }}>
            <div style={{ ...styles.inline, color: '#2e7d32' }}>Congratulations, your request has been accepted!</div>
            {!explore && (
              <button style={styles.button} onClick={() => setExplore(true)}>Explore Area</button>
            )}
          </div>
        )}
      </div>

      {/* Assigned area and Start Journey */}
      {assignedArea && (
        <div style={styles.card}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Assigned Area</div>
          {/* Capacity label based on host data */}
          <div style={{ ...styles.inline, marginBottom: '8px' }}>
            {(assignedArea.numberOfDrivers ?? 0)}/3 drivers assigned
          </div>
          <div style={{ ...styles.row, marginTop: '10px' }}>
            {!me?.isOnDuty ? (
              <button style={styles.button}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 30px rgba(33,150,243,0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(33,150,243,0.25)'; }}
                onClick={startJourney}
              >Start Journey</button>
            ) : (
              <button style={{ ...styles.button, ...styles.neutral }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={stopJourney}
              >Stop Journey</button>
            )}
            <button style={{ ...styles.button, ...styles.danger }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              onClick={leaveArea}
            >Leave Driving</button>
          </div>
          <div style={styles.tooltip}>Starting journey will share your live location to the assigned area in real time. You can stop at any time.</div>
          <div style={{ marginTop: '12px' }}>
            {/* Show live bus marker with driver photo; if not sharing, show info */}
            <MapPreview
              center={assignedArea.location}
              boundary={assignedArea.boundary}
              allowPolygonDrawing={false}
              zoom={15}
              liveDriver={livePos && me?.driverPhoto ? { lat: livePos.lat, lng: livePos.lng, photo: me.driverPhoto } : null}
              offlineMessage={!livePos ? 'Driver is not in area' : ''}
            />
            {/* Last seen badge */}
            <div style={{ display: 'inline-block', padding: '6px 10px', fontSize: '11px', color: '#e0e0e0', background: 'rgba(33,150,243,0.12)', border: '1px solid rgba(33,150,243,0.35)', borderRadius: '999px', boxShadow: '0 0 18px rgba(33,150,243,0.25)', marginTop: '8px' }}>
              {livePos?.ts ? (() => {
                const t = typeof livePos.ts === 'number' ? livePos.ts : new Date(livePos.ts).getTime();
                const diff = Math.max(0, Math.floor((Date.now() - t) / 1000));
                return `Last seen ${diff}s ago`;
              })() : 'Waiting for live location…'}
            </div>
          </div>
        </div>
      )}

      {/* Available areas — only when accepted and Explore pressed, and no assigned area */}
      {!assignedArea && me?.status === 'accepted' && explore && (
        <div style={styles.card}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Available Areas</div>
          <div style={styles.list}>
            {areas.map(a => {
              const full = (a.numberOfDrivers || 0) >= 3;
              const onChooseWrap = () => {
                if (full) { window.alert('No more drivers accepted for this area'); return; }
                chooseArea(a);
              };
              return (
                <AreaCard
                  key={a._id}
                  area={a}
                  showChooseButton
                  chooseDisabled={full}
                  onChoose={onChooseWrap}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
