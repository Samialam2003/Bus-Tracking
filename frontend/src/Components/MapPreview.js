import React, { useEffect, useRef, useState } from 'react';

const styles = {
  container: {
    width: '100%',
    height: '400px',
    border: '1px solid #223a5a',
    borderRadius: '14px',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 6px 15px rgba(0,0,0,0.3)',
    background: '#102c44'
  },
  mapDiv: {
    width: '100%',
    height: '100%'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 27, 42, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#e0e0e0',
    backdropFilter: 'blur(2px)'
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1b3b5a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    fontSize: '14px',
    color: '#e0e0e0',
    textAlign: 'center',
    padding: '20px',
    border: '1px solid #223a5a'
  },
  controls: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#1b3b5a',
    padding: '10px',
    borderRadius: '12px',
    boxShadow: '0 6px 15px rgba(0,0,0,0.3)',
    border: '1px solid #223a5a',
    fontSize: '12px',
    color: '#e0e0e0'
  },
  button: {
    padding: '8px 12px',
    margin: '4px 0',
    border: '1px solid #2b4f73',
    borderRadius: '12px',
    backgroundColor: '#223a5a',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#e0e0e0',
    transition: 'all 0.4s ease'
  }
};

const MapPreview = ({ 
  center, 
  boundary, 
  onBoundaryChange, 
  allowPolygonDrawing = false,
  zoom = 15,
  liveDriver = null, // { lat, lng, photo }
  offlineMessage = ''
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonRef = useRef(null);
  const drawLayerRef = useRef(null);
  const drawControlRef = useRef(null);
  const liveMarkerRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const ensureLeaflet = async () => {
      try {
        // Prevent multiple initializations
        if (window.L && window.L.Map && mapInstanceRef.current) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        // Inject Leaflet CSS/JS and Leaflet.Draw if not present
        const head = document.head;
        const hasLeaflet = !!window.L;
        
        if (!document.querySelector('link[data-leaflet-css]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.crossOrigin = 'anonymous';
        link.setAttribute('data-leaflet-css', 'true');
        head.appendChild(link);
      }
      if (!hasLeaflet) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.crossOrigin = 'anonymous';
          script.defer = true;
          script.onload = resolve;
          script.onerror = reject;
          head.appendChild(script);
        });
        // Defensive: verify L is present after load
        if (!window.L) throw new Error('Leaflet library failed to load');
      }
      if (allowPolygonDrawing && !document.querySelector('link[data-leaflet-draw-css]')) {
        const link2 = document.createElement('link');
        link2.rel = 'stylesheet';
        link2.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
        link2.crossOrigin = 'anonymous';
        link2.setAttribute('data-leaflet-draw-css', 'true');
        head.appendChild(link2);
      }
      if (allowPolygonDrawing && !window.L.Draw) {
        await new Promise((resolve, reject) => {
          const script2 = document.createElement('script');
          script2.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
          script2.crossOrigin = 'anonymous';
          script2.defer = true;
          script2.onload = resolve;
          script2.onerror = reject;
          head.appendChild(script2);
        });
        if (!window.L.Draw) throw new Error('Leaflet.draw failed to load');
      }
      } catch (e) {
        console.error('ensureLeaflet error:', e);
      }
    };

    const normalizeCenter = (c) => {
      const fallback = { lat: 28.6139, lng: 77.2090 }; // Default: Delhi
      if (!c) return fallback;
      if (Array.isArray(c) && c.length === 2) {
        const lat = parseFloat(c[0]);
        const lng = parseFloat(c[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        return fallback;
      }
      if (typeof c === 'object' && c !== null && c.lat != null && c.lng != null) {
        const lat = parseFloat(c.lat);
        const lng = parseFloat(c.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        return fallback;
      }
      return fallback;
    };

    const normalizeBoundary = (b) => {
      try {
        if (!b) return [];
        // Nominatim boundingbox: [south, north, west, east]
        if (Array.isArray(b) && b.length === 4 && b.every(v => typeof v === 'string' || typeof v === 'number')) {
          const south = parseFloat(b[0]);
          const north = parseFloat(b[1]);
          const west = parseFloat(b[2]);
          const east = parseFloat(b[3]);
          return [
            { lat: south, lng: west },
            { lat: south, lng: east },
            { lat: north, lng: east },
            { lat: north, lng: west }
          ];
        }
        if (Array.isArray(b) && b.length > 0 && typeof b[0] === 'object' && b[0] !== null && 'lat' in b[0] && 'lng' in b[0]) {
          return b.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) })).filter(p => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
        }
        if (Array.isArray(b) && b.length > 0 && Array.isArray(b[0]) && b[0].length === 2) {
          return b.map(arr => ({ lat: parseFloat(arr[0]), lng: parseFloat(arr[1]) })).filter(p => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
        }
        return [];
      } catch (e) {
        console.warn('MapPreview boundary normalization failed; using empty.', e);
        return [];
      }
    };

    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await ensureLeaflet();
        if (!mapRef.current) return;
        const L = window.L;

        // Initialize map if not exists
        const c = normalizeCenter(center);
        const normBoundary = normalizeBoundary(boundary);
        if (!mapInstanceRef.current) {
          const map = L.map(mapRef.current, { zoomControl: true });
          try { map.setView(c, zoom); } catch {}
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          mapInstanceRef.current = map;
          // Drawing layer
          drawLayerRef.current = L.featureGroup().addTo(map);
        } else {
          try { mapInstanceRef.current.setView(c, zoom); } catch {}
        }

        const map = mapInstanceRef.current;
        // Defer any vector/path work until map is fully ready to avoid renderer bounds issues
        map.whenReady(() => {
          try {
            // Clear previous temp layers (except drawLayer)
            if (polygonRef.current) {
              map.removeLayer(polygonRef.current);
              polygonRef.current = null;
            }
            if (drawLayerRef.current) {
              try { drawLayerRef.current.clearLayers(); } catch {}
            }

            // Marker at center (use regular marker to avoid SVG CircleMarker issues)
            if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
              try {
                if (centerMarkerRef.current) {
                  centerMarkerRef.current.setLatLng(c);
                } else {
                  centerMarkerRef.current = L.marker(c, { interactive: false }).addTo(map);
                }
              } catch {}
            }

            // Existing boundary polygon
            if (normBoundary && normBoundary.length > 0) {
              const latlngs = normBoundary.map(p => [p.lat, p.lng]);
              const poly = L.polygon(latlngs, { color: '#FF0000', weight: 2, fillOpacity: 0.3 });
              poly.addTo(map);
              polygonRef.current = poly;
              try { map.fitBounds(poly.getBounds(), { padding: [20, 20] }); } catch {}
            } else if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
              // No polygon: fit a small bounds around the marker so it centers nicely
              const delta = 0.001;
              const bounds = L.latLngBounds(
                [c.lat - delta, c.lng - delta],
                [c.lat + delta, c.lng + delta]
              );
              try { map.fitBounds(bounds, { padding: [20, 20] }); } catch {}
            }

            // Drawing controls
            if (allowPolygonDrawing && window.L.Draw && !drawControlRef.current && drawLayerRef.current) {
              const drawControl = new L.Control.Draw({
                draw: {
                  polyline: false,
                  rectangle: false,
                  circle: false,
                  circlemarker: false,
                  marker: false,
                  polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: { color: '#FF0000' }
                  }
                },
                edit: { featureGroup: drawLayerRef.current }
              });
              map.addControl(drawControl);
              drawControlRef.current = drawControl;

              map.off(L.Draw.Event.CREATED);
              map.on(L.Draw.Event.CREATED, (e) => {
                try { drawLayerRef.current && drawLayerRef.current.clearLayers(); } catch {}
                const layer = e.layer;
                drawLayerRef.current && drawLayerRef.current.addLayer(layer);
                if (onBoundaryChange) {
                  const latlngs = layer.getLatLngs()[0] || [];
                  const coords = latlngs.map(pt => ({ lat: pt.lat, lng: pt.lng }));
                  onBoundaryChange(coords);
                }
              });
            }

            // Ensure proper sizing after being mounted in a collapsing area/card
            setTimeout(() => {
              try { map.invalidateSize(); } catch {}
            }, 150);

            setIsLoading(false);
          } catch (innerErr) {
            console.error('Map ready pipeline error:', innerErr);
            setError('Failed to render map overlays.');
            setIsLoading(false);
          }
        });
      } catch (err) {
        console.error('Leaflet init error:', err);
        setError(err?.message || 'Map failed to initialize. Please check network connectivity to Leaflet/CDN.');
        setIsLoading(false);
      }
    };

    initialize();
    // Cleanup on unmount: remove map instance to avoid duplicate renderers
    return () => {
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }
      } catch {}
      mapInstanceRef.current = null;
      polygonRef.current = null;
      drawLayerRef.current = null;
      drawControlRef.current = null;
      liveMarkerRef.current = null;
      centerMarkerRef.current = null;
    };
  }, [center, boundary, allowPolygonDrawing, zoom, onBoundaryChange]);

  // Render or update live driver marker
  useEffect(() => {
    try {
      const L = window.L;
      const map = mapInstanceRef.current;
      if (!map || !L) return;
      // Remove previous marker if needed
      if (liveMarkerRef.current) {
        map.removeLayer(liveMarkerRef.current);
        liveMarkerRef.current = null;
      }
      if (liveDriver) {
        const lat = typeof liveDriver.lat === 'string' ? parseFloat(liveDriver.lat) : liveDriver.lat;
        const lng = typeof liveDriver.lng === 'string' ? parseFloat(liveDriver.lng) : liveDriver.lng;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const hasPhoto = typeof liveDriver.photo === 'string' && liveDriver.photo.trim().length > 0;
          const photoLayer = hasPhoto
            ? `<div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; border: 2px solid #06b6d4; box-shadow: 0 0 12px rgba(6,182,212,0.45);">
                 <img src="${liveDriver.photo}" alt="driver" style="width: 100%; height: 100%; object-fit: cover;"/>
               </div>`
            : `<div style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #06b6d4; background: linear-gradient(135deg,#1976D2,#00BCD4); display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px; box-shadow: 0 0 12px rgba(6,182,212,0.45);">🚌</div>`;

          const html = `
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <!-- pulse ring -->
              <div style="position:absolute; width: 54px; height:54px; border-radius:50%; border:2px solid rgba(6,182,212,0.45); animation: lpulse 1.6s infinite; opacity: 0.7;"></div>
              ${photoLayer}
              <!-- bus overlay at bottom-right -->
              <div style="position:absolute; right:-2px; bottom:-2px; width: 20px; height: 20px; border-radius:50%; background:#0ea5e9; border:2px solid #fff; display:flex; align-items:center; justify-content:center; font-size:12px;">🚌</div>
            </div>
            <style>
              @keyframes lpulse { 0% { transform: scale(0.85); opacity: 0.6; } 70% { transform: scale(1.1); opacity: 0.2; } 100% { transform: scale(0.85); opacity: 0.6; } }
            </style>
          `;

          const icon = L.divIcon({ html, className: 'driver-live-marker', iconSize: [48, 48], iconAnchor: [24, 24] });
          const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 });
          marker.addTo(map);
          liveMarkerRef.current = marker;
        }
      }
    } catch {}
  }, [liveDriver]);

  const toggleDrawingMode = () => {
    // Leaflet-draw shows controls; we simply toggle a note. Drawing is initiated via the control.
    setIsDrawingMode(v => !v);
  };

  const clearBoundary = () => {
    try {
      const map = mapInstanceRef.current;
      if (polygonRef.current) {
        map.removeLayer(polygonRef.current);
        polygonRef.current = null;
      }
      if (drawLayerRef.current) {
        drawLayerRef.current.clearLayers();
      }
      onBoundaryChange && onBoundaryChange([]);
    } catch {}
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorOverlay}>
          <div>⚠️ Map Error</div>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            {error}
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#888' }}>
            Leaflet + OpenStreetMap tiles are used. For heavy use, consider a commercial tile provider or hosting tiles.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div ref={mapRef} style={styles.mapDiv} />
      {offlineMessage && !liveDriver && !isLoading && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,188,212,0.12)', padding: 8, borderRadius: 999, border: '1px solid rgba(0,188,212,0.35)', fontSize: 12, color: '#e0e0e0', boxShadow: '0 0 18px rgba(0,188,212,0.25)' }}>
          {offlineMessage}
        </div>
      )}
      
      {isLoading && (
        <div style={styles.loadingOverlay}>
          Loading map…
        </div>
      )}

      {allowPolygonDrawing && !isLoading && (
        <div style={styles.controls}>
          <div>Boundary Tools</div>
          <button
            style={{
              ...styles.button,
              backgroundColor: isDrawingMode ? '#4CAF50' : 'white',
              color: isDrawingMode ? 'white' : 'black'
            }}
            onClick={toggleDrawingMode}
          >
            {isDrawingMode ? 'Drawing On' : 'Draw: Use the polygon tool in map control'}
          </button>
          <button
            style={styles.button}
            onClick={clearBoundary}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default MapPreview;
