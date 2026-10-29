import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import AreaCard from './AreaCard';
import MapPreview from './MapPreview';

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'Inter, Arial, sans-serif',
    background: '#0d1b2a',
    color: '#e0e0e0',
    minHeight: '100vh',
    scrollBehavior: 'smooth'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    color: '#ffffff'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#2196F3'
  },
  subtitle: {
    fontSize: '16px',
    color: '#bdbdbd',
    margin: 0
  },
  section: {
    backgroundColor: '#1b3b5a',
    border: '1px solid #223a5a',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 6px 15px rgba(0,0,0,0.3)',
    transition: 'all 0.4s ease'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#ffffff',
    borderBottom: '2px solid #2196F3',
    paddingBottom: '8px'
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  formGroup: {
    flex: 1,
    minWidth: '200px'
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#bdbdbd'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #223a5a',
    borderRadius: '12px',
    fontSize: '14px',
    boxSizing: 'border-box',
    background: '#102c44',
    color: '#e0e0e0',
    transition: 'all 0.4s ease',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
  },
  inputFocus: {
    borderColor: '#2196F3',
    outline: 'none'
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #223a5a',
    borderRadius: '12px',
    fontSize: '14px',
    backgroundColor: '#102c44',
    color: '#e0e0e0',
    boxSizing: 'border-box'
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.4s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 6px 15px rgba(0,0,0,0.3)'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #00bcd4, #2196f3)',
    color: '#0d1b2a'
  },
  primaryButtonHover: {
    backgroundColor: '#1976D2',
    transform: 'translateY(-3px)'
  },
  secondaryButton: {
    backgroundColor: '#223a5a',
    color: '#e0e0e0',
    border: '1px solid #2b4f73'
  },
  loginSection: {
    backgroundColor: 'rgba(187,134,252,0.08)',
    border: '1px solid rgba(187,134,252,0.25)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    boxShadow: '0 0 18px rgba(187,134,252,0.25)'
  },
  loginForm: {
    display: 'flex',
    gap: '12px',
    alignItems: 'end',
    flexWrap: 'wrap'
  },
  loginInput: {
    flex: 1,
    minWidth: '120px'
  },
  message: {
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  successMessage: {
    backgroundColor: 'rgba(76,175,80,0.12)',
    color: '#c8e6c9',
    border: '1px solid rgba(76,175,80,0.35)',
    boxShadow: '0 0 18px rgba(76,175,80,0.25)'
  },
  errorMessage: {
    backgroundColor: 'rgba(244,67,54,0.12)',
    color: '#ffcdd2',
    border: '1px solid rgba(244,67,54,0.35)',
    boxShadow: '0 0 18px rgba(244,67,54,0.25)'
  },
  areasList: {
    display: 'grid',
    gap: '16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#bdbdbd',
    fontSize: '16px'
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  mapContainer: {
    marginBottom: '16px'
  },
  coordinates: {
    fontSize: '12px',
    color: '#666',
    marginTop: '8px',
    fontFamily: 'monospace'
  }
};

// (component-scoped implementation will be defined inside component)

// Add CSS animation for spinner
const spinnerCSS = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const HostDashboard = () => {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [loginData, setLoginData] = useState({ id: '', password: '' });

  // Form state
  const [formData, setFormData] = useState({
    areaName: '',
    areaType: 'Bus Stop',
    location: null,
    boundary: []
  });

  // Areas state
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  // Host applications sidebar state
  const [activeTab, setActiveTab] = useState('areas'); // 'areas' | 'applications' | 'drivers'
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [students, setStudents] = useState([]);
  const socketRef = useRef(null);

  // Map state
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  
  // Search state (Nominatim)
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef(null);

  // API base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';
  const HOST_TOKEN = process.env.REACT_APP_HOST_TOKEN || 'HOST_TOKEN_SANDESH';

  // Fetch drivers list (host view) — uses /driver with host token
  const fetchAllDrivers = async () => {
    try {
      const url = `${API_BASE_URL}/driver`;
      const res = await fetch(url, { headers: { 'x-host-token': HOST_TOKEN } });
      const data = await res.json();
      if (res.ok) setAllDrivers(data.data || []);
    } catch {}
  };

  // Add spinner CSS to document
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = spinnerCSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Fetch students (host view) — use exact URL and header as requested
  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/student/list`, {
        headers: { 'x-host-token': HOST_TOKEN }
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch students' });
        setStudents([]);
        return;
      }
      setStudents(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error while fetching students' });
    }
  };

  // Nominatim search: fetch suggestions as user types (with debouncing and abort)
  useEffect(() => {
    if (!isLoggedIn) return;
    const q = searchText.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const timer = setTimeout(async () => {
      try {
        // Respect Nominatim Usage Policy and include a descriptive User-Agent via header if possible.
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Nominatim request failed');
        const data = await res.json();
        setSuggestions(data);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('Nominatim search error:', e.message);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, isLoggedIn]);

  // Try Overpass API to fetch precise administrative boundary polygon
  const tryFetchOverpassBoundary = async (osmType, osmId) => {
    try {
      // Only attempt for relations (typical for admin boundaries)
      if (osmType !== 'relation') return null;
      const query = `[
        out:json
      ];
      relation(${osmId});
      out ids tags geom;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.elements || data.elements.length === 0) return null;
      const el = data.elements[0];
      if (!el.geometry) return null;
      // Convert to simple polygon array if possible
      const coords = el.geometry.map(pt => ({ lat: pt.lat, lng: pt.lon }));
      return coords.length >= 3 ? coords : null;
    } catch (e) {
      console.warn('Overpass boundary fetch failed; using bounding box fallback');
      return null;
    }
  };

  const handleSuggestionSelect = async (item) => {
    try {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      setSelectedPlace(item);
      setMapCenter({ lat, lng });

      // Default boundary from bounding box (south, north, west, east)
      let boundary = [];
      if (item.boundingbox && item.boundingbox.length === 4) {
        const [south, north, west, east] = item.boundingbox.map(parseFloat);
        boundary = [
          { lat: south, lng: west },
          { lat: south, lng: east },
          { lat: north, lng: east },
          { lat: north, lng: west }
        ];
      }

      // Try Overpass for better polygon when available
      const overpassPoly = await tryFetchOverpassBoundary(item.osm_type, item.osm_id);
      const finalBoundary = overpassPoly || boundary;

      setFormData(prev => ({
        ...prev,
        areaName: prev.areaName || item.display_name || '',
        location: { lat, lng },
        boundary: finalBoundary
      }));
      setSearchText(item.display_name || '');
      setSuggestions([]);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to select place' });
    }
  };

  // Fetch areas and pending drivers on login; wire socket.io for host notifications
  useEffect(() => {
    if (isLoggedIn) {
      fetchAreas();
      fetchPendingDrivers();
      fetchAllDrivers();
      fetchStudents();
      const s = io(API_BASE_URL, { withCredentials: true });
      socketRef.current = s;
      s.on('connect', () => {
        s.emit('authenticate', { token: HOST_TOKEN });
      });
      s.on('new-application', (driverSummary) => {
        setPendingDrivers(prev => [driverSummary, ...prev]);
        fetchAllDrivers();
        setMessage({ type: 'success', text: `New application: ${driverSummary?.name || driverSummary?.email || 'Driver'}` });
      });
      s.on('driver-assigned', () => {
        fetchAreas();
        fetchAllDrivers();
      });
      s.on('driver-left-area', () => {
        fetchAreas();
        fetchAllDrivers();
      });
      s.on('student-selection-changed', () => {
        fetchStudents();
      });
      return () => { s.disconnect(); };
    }
  }, [isLoggedIn]);

  // Authentication functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    
    try {
      const response = await fetch(`${API_BASE_URL}/host/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setIsLoggedIn(true);
        setMessage({ type: 'success', text: 'Login successful!' });
        setLoginData({ id: '', password: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Login failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending drivers (host view)
  const fetchPendingDrivers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/driver?status=pending`, {
        headers: { 'x-host-token': HOST_TOKEN }
      });
      const data = await res.json();
      if (res.ok) {
        setPendingDrivers(data.data || []);
      }
    } catch (e) {
      // silent
    }
  };

  // API functions
  const fetchAreas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/host?createdBy=sandesh`);

      const data = await response.json();

      if (response.ok) {
        setAreas(data.data || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch areas' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while fetching areas' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArea = async () => {
    if (!formData.areaName || !formData.areaType || !formData.location) {
      setMessage({ type: 'error', text: 'Please fill in all required fields and select a location' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/host`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-host-token': token
        },
        body: JSON.stringify({
          ...formData,
          createdBy: 'sandesh'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Area saved successfully!' });
        setFormData({
          areaName: '',
          areaType: 'Bus Stop',
          location: null,
          boundary: []
        });
        setSelectedPlace(null);
        setMapCenter(null);
        setSearchText('');
        fetchAreas(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save area' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while saving area' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditArea = async (id, updateData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/host/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-host-token': token
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Area updated successfully!' });
        fetchAreas(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update area' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while updating area' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArea = async (id) => {
    if (!window.confirm('Are you sure you want to delete this area?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/host/${id}`, {
        method: 'DELETE',
        headers: {
          'x-host-token': token
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Area deleted successfully!' });
        fetchAreas(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete area' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while deleting area' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOnMap = (area) => {
    setMapCenter(area.location);
    // Scroll to map
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBoundaryChange = (boundary) => {
    setFormData(prev => ({ ...prev, boundary }));
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🚌 Bus Tracking Host Interface</h1>
          <p style={styles.subtitle}>Please login to manage areas</p>
        </div>
      
      {/* Drivers Tab (accepted drivers) */}
      {activeTab === 'drivers' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🚍 Drivers ({allDrivers.length})</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {allDrivers.length === 0 ? (
              <div style={styles.emptyState}>No drivers yet</div>
            ) : allDrivers.map((d) => {
              const area = areas.find(a => a._id === (d.assignedArea ? (typeof d.assignedArea === 'string' ? d.assignedArea : d.assignedArea?._id) : null));
              return (
                <div key={d._id} style={{ border: '1px solid #223a5a', borderRadius: '12px', padding: '12px', background: '#102c44' }}>
                  <div style={{ fontWeight: 'bold', color: '#e0e0e0' }}>{d.name || d.email}</div>
                  <div style={{ fontSize: '12px', color: '#c8d6e5' }}>{d.email}</div>
                  <div style={{ fontSize: '12px', color: '#8fb9d9', marginTop: '6px' }}>Status: {d.status || '-'}</div>
                  <div style={{ fontSize: '12px', color: '#8fb9d9', marginTop: '4px' }}>Assigned Area: {area ? area.areaName : (d.assignedArea ? String(d.assignedArea) : 'None')}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      
      

        <div style={styles.loginSection}>
          <h3 style={{ margin: '0 0 16px 0', color: '#856404' }}>Host Login</h3>
          <p style={{ fontSize: '12px', color: '#856404', margin: '0 0 16px 0' }}>
            Demo credentials: ID: "sandesh", Password: "sandesh@1230"
          </p>
          
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.loginInput}>
              <label style={styles.label}>Host ID</label>
              <input
                style={styles.input}
                type="text"
                value={loginData.id}
                onChange={(e) => setLoginData(prev => ({ ...prev, id: e.target.value }))}
                placeholder="Enter host ID"
                required
              />
            </div>
            <div style={styles.loginInput}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              style={{...styles.button, ...styles.primaryButton}}
              disabled={loading}
            >
              {loading ? <span style={styles.loadingSpinner}></span> : '🔑'} Login
            </button>
          </form>
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            ...(message.type === 'success' ? styles.successMessage : styles.errorMessage)
          }}>
            {message.text}
          </div>
        )}

     
      {/* Drivers Tab */}
      {activeTab === 'drivers' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🚍 Drivers ({allDrivers.length})</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {allDrivers.length === 0 ? (
              <div style={styles.emptyState}>No drivers yet</div>
            ) : allDrivers.map((d) => {
              const area = areas.find(a => a._id === (d.assignedArea ? (typeof d.assignedArea === 'string' ? d.assignedArea : d.assignedArea?._id) : null));
              return (
                <div key={d._id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px', background: '#fff' }}>
                  <div style={{ fontWeight: 'bold' }}>{d.name || d.email}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{d.email}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>Status: {d.status || '-'}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Assigned Area: {area ? area.areaName : (d.assignedArea ? String(d.assignedArea) : 'None')}</div>
                </div>
              );
            })}
          </div>

          <h2 style={{ ...styles.sectionTitle, marginTop: '24px' }}>📝 New Applications ({pendingDrivers.length})</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {pendingDrivers.length === 0 ? (
              <div style={styles.emptyState}>No pending applications</div>
            ) : pendingDrivers.map((d) => (
              <div key={d._id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px', background: '#fff' }}>
                <div style={{ fontWeight: 'bold' }}>{d.name || d.email}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{d.email}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>Applied: {d.appliedAt ? new Date(d.appliedAt).toLocaleString() : '-'}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    style={{ ...styles.button, ...styles.primaryButton }}
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE_URL}/driver/${d._id}/accept`, { method: 'POST', headers: { 'x-host-token': HOST_TOKEN } });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to accept');
                        setMessage({ type: 'success', text: 'Driver accepted' });
                        fetchPendingDrivers();
                        fetchAllDrivers();
                      } catch (e) { setMessage({ type: 'error', text: e.message }); }
                    }}
                  >Accept</button>
                  <button
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onClick={async () => {
                      const reason = window.prompt('Enter rejection reason (optional):') || '';
                      try {
                        const res = await fetch(`${API_BASE_URL}/driver/${d._id}/reject`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-host-token': HOST_TOKEN },
                          body: JSON.stringify({ reason })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to reject');
                        setMessage({ type: 'success', text: 'Driver rejected' });
                        fetchPendingDrivers();
                      } catch (e) { setMessage({ type: 'error', text: e.message }); }
                    }}
                  >Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🚌 Bus Tracking Host Interface</h1>
        <p style={styles.subtitle}>Manage bus stops and areas</p>
        <button
          style={{...styles.button, ...styles.secondaryButton, marginTop: '8px'}}
          onClick={() => {
            setIsLoggedIn(false);
            setToken('');
            setAreas([]);
            setFormData({ areaName: '', areaType: 'Bus Stop', location: null, boundary: [] });
          }}
        >
          🚪 Logout
        </button>
      </div>

      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === 'success' ? styles.successMessage : styles.errorMessage)
        }}>
          {message.text}
        </div>
      )}

      {/* Sidebar Tabs */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
        <button
          style={{ ...styles.button, ...(activeTab === 'areas' ? styles.primaryButton : styles.secondaryButton) }}
          onClick={() => setActiveTab('areas')}
        >
          🗺️ Areas
        </button>
        <button
          style={{ ...styles.button, ...(activeTab === 'applications' ? styles.primaryButton : styles.secondaryButton) }}
          onClick={() => setActiveTab('applications')}
        >
          👤 New drivers application
        </button>
        <button
          style={{ ...styles.button, ...(activeTab === 'drivers' ? styles.primaryButton : styles.secondaryButton) }}
          onClick={() => { setActiveTab('drivers'); fetchAllDrivers(); fetchPendingDrivers(); }}
        >
          🚍 Drivers
        </button>
       
      </div>

      {/* Add Area Section */}
      {activeTab === 'areas' && (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>➕ Add New Area</h2>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Search Location *</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Search for a place (powered by OpenStreetMap Nominatim)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {/* Nominatim suggestions */}
            {isSearching && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                Searching...
              </div>
            )}
            {suggestions.length > 0 && (
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                marginTop: '6px',
                maxHeight: '180px',
                overflowY: 'auto',
                background: 'white'
              }}>
                {suggestions.map((sug) => (
                  <div
                    key={`${sug.osm_type}-${sug.osm_id}`}
                    style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    onClick={() => handleSuggestionSelect(sug)}
                  >
                    {sug.display_name}
                  </div>
                ))}
              </div>
            )}
            <div style={styles.coordinates}>
              {formData.location && 
                `📍 Selected: ${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}`
              }
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
              • Uses OpenStreetMap Nominatim for geocoding. Respect rate limits and usage policy.
              For heavy use, consider running your own Nominatim instance.
              
              • Map uses OSM tiles. For production/heavy usage, use a commercial tile provider or host your own tiles.
            </div>
          </div>
        </div>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Area Name *</label>
            <input
              style={styles.input}
              type="text"
              value={formData.areaName}
              onChange={(e) => setFormData(prev => ({ ...prev, areaName: e.target.value }))}
              placeholder="Enter area name"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Area Type *</label>
            <select
              style={styles.select}
              value={formData.areaType}
              onChange={(e) => setFormData(prev => ({ ...prev, areaType: e.target.value }))}
            >
              <option value="Bus Stop">Bus Stop</option>
              <option value="Terminal">Terminal</option>
              <option value="Depot">Depot</option>
              <option value="Station">Station</option>
              <option value="Junction">Junction</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {mapCenter && (
          <div style={styles.mapContainer}>
            <label style={styles.label}>Map Preview & Boundary (Optional)</label>
            <MapPreview
              center={mapCenter}
              boundary={formData.boundary}
              onBoundaryChange={handleBoundaryChange}
              allowPolygonDrawing={true}
              zoom={16}
            />
            {formData.boundary.length > 0 && (
              <div style={styles.coordinates}>
                🔷 Boundary defined with {formData.boundary.length} points
              </div>
            )}
          </div>
        )}

        <button
          style={{...styles.button, ...styles.primaryButton}}
          onClick={handleSaveArea}
          disabled={loading || !formData.location}
        >
          {loading ? <span style={styles.loadingSpinner}></span> : '💾'} Save Area
        </button>
      </div>
      )}

      {/* Stored Areas Section */}
      {activeTab === 'areas' && (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📍 Stored Areas ({areas.length})</h2>
        {loading && areas.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.loadingSpinner}></span> Loading areas...
          </div>
        ) : areas.length === 0 ? (
          <div style={styles.emptyState}>
            📭 No areas found. Add your first area above!
          </div>
        ) : (
          <div style={styles.areasList}>
            {areas.map((area) => (
              <AreaCard
                key={area._id}
                area={area}
                onViewOnMap={handleViewOnMap}
                onEdit={handleEditArea}
                onDelete={handleDeleteArea}
              />
            ))}
          </div>
        )}
      </div>
      )}

      {/* Applications Section */}
      {activeTab === 'applications' && (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📝 Pending Driver Applications ({pendingDrivers.length})</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {pendingDrivers.length === 0 ? (
            <div style={styles.emptyState}>No pending applications</div>
          ) : pendingDrivers.map((d) => (
            <div key={d._id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '12px', background: '#fff', display: 'flex', gap: '10px' }}>
              {d.driverPhoto && <img src={d.driverPhoto} alt="driver" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />}
              {d.vehiclePhoto && <img src={d.vehiclePhoto} alt="vehicle" style={{ width: 64, height: 42, borderRadius: '8px', objectFit: 'cover' }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{d.name || d.email}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{d.email} {d.age ? `• Age: ${d.age}` : ''}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>Applied: {d.appliedAt ? new Date(d.appliedAt).toLocaleString() : '-'}</div>
                {d.experience && (
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>Experience: {d.experience}</div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    style={{ ...styles.button, ...styles.primaryButton }}
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE_URL}/driver/${d._id}/accept`, { method: 'POST', headers: { 'x-host-token': 'HOST_TOKEN_SANDESH' } });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to accept');
                        setMessage({ type: 'success', text: 'Driver accepted' });
                        fetchPendingDrivers();
                        fetchAllDrivers('accepted');
                      } catch (e) { setMessage({ type: 'error', text: e.message }); }
                    }}
                  >Accept</button>
                  <button
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onClick={async () => {
                      const reason = window.prompt('Enter rejection reason (optional):') || '';
                      try {
                        const res = await fetch(`${API_BASE_URL}/driver/${d._id}/reject`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-host-token': 'HOST_TOKEN_SANDESH' },
                          body: JSON.stringify({ reason })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to reject');
                        setMessage({ type: 'success', text: 'Driver rejected' });
                        fetchPendingDrivers();
                      } catch (e) { setMessage({ type: 'error', text: e.message }); }
                    }}
                  >Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Drivers Section */}
      {activeTab === 'drivers' && (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🚍 Drivers (accepted)</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {allDrivers.length === 0 ? (
            <div style={styles.emptyState}>No drivers yet</div>
          ) : allDrivers.map((d) => {
            const areaName = d.assignedArea ? (typeof d.assignedArea === 'string' ? String(d.assignedArea) : (d.assignedArea.areaName || d.assignedArea._id)) : 'None';
            return (
              <div key={d._id} style={{ display: 'flex', gap: '10px', alignItems: 'center', border: '1px solid #eee', borderRadius: '8px', padding: '10px', background: '#fff' }}>
                {d.driverPhoto && <img src={d.driverPhoto} alt="driver" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{d.name || d.email}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{d.email} {d.age ? `• Age: ${d.age}` : ''}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Assigned Area: {areaName}</div>
                </div>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={async () => {
                    if (!window.confirm('Delete this driver? This cannot be undone.')) return;
                    try {
                      const res = await fetch(`${API_BASE_URL}/driver/${d._id}`, { method: 'DELETE', headers: { 'x-host-token': HOST_TOKEN } });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to delete');
                      setMessage({ type: 'success', text: 'Driver deleted' });
                      fetchAllDrivers('accepted');
                      fetchAreas();
                    } catch (e) { setMessage({ type: 'error', text: e.message }); }
                  }}
                >Delete this driver</button>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};

export default HostDashboard;
