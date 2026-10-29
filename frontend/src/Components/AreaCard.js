import React, { useMemo, useRef, useState } from 'react';
import MapPreview from './MapPreview';

const styles = {
  card: {
    border: '1px solid #2a2a2a',
    borderRadius: '14px',
    padding: '16px',
    margin: '12px 0',
    backgroundColor: '#1e1e1e',
    boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
    transition: 'all 0.3s ease',
    color: '#e0e0e0'
  },
  mapBox: {
    marginTop: '10px',
    border: '1px solid #2a2a2a',
    borderRadius: '10px',
    overflow: 'hidden',
    height: '240px',
    boxShadow: '0 8px 18px rgba(0,0,0,0.4)'
  },
  cardHover: {
    boxShadow: '0 16px 30px rgba(0,0,0,0.5)',
    transform: 'translateY(-5px) scale(1.02)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  title: { fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 4px 0' },
  type: { fontSize: '12px', color: '#e0e0e0', backgroundColor: 'rgba(0,188,212,0.12)', border: '1px solid rgba(0,188,212,0.35)', padding: '2px 8px', borderRadius: '12px', display: 'inline-block' },
  coordinates: { fontSize: '12px', color: '#c8d6e5', fontFamily: 'monospace', marginBottom: '12px' },
  boundary: { fontSize: '12px', color: '#c8d6e5', marginBottom: '12px' },
  buttonContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  button: { padding: '10px 14px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.4s ease', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', color: '#0d1b2a', background: 'linear-gradient(135deg, #00bcd4, #2196f3)' },
  toggleButton: {},
  viewButton: {},
  viewButtonHover: { backgroundColor: '#1976D2' },
  editButton: { background: 'linear-gradient(135deg, #00bcd4, #2196f3)', color: '#0d1b2a' },
  editButtonHover: {
    backgroundColor: '#45a049'
  },
  deleteButton: { backgroundColor: '#f44336', color: '#fff' },
  deleteButtonHover: {
    backgroundColor: '#d32f2f'
  },
  saveButton: { background: 'linear-gradient(135deg, #bb86fc, #7c4dff)', color: '#0d1b2a' },
  cancelButton: { backgroundColor: '#223a5a', color: '#e0e0e0', border: '1px solid #2b4f73' },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px'
  },
  input: { padding: '12px 14px', border: '1px solid #223a5a', borderRadius: '12px', fontSize: '14px', background: '#102c44', color: '#e0e0e0', outline: 'none', transition: 'all 0.4s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  boundaryListBox: { maxHeight: '160px', overflowY: 'auto', border: '1px solid #223a5a', borderRadius: '12px', padding: '8px', backgroundColor: '#102c44', marginBottom: '10px' },
  boundaryItem: { fontFamily: 'monospace', fontSize: '12px', color: '#dfe6ee', padding: '4px 0', borderBottom: '1px dashed #2b4f73' }
};

const AreaCard = ({ area, onViewOnMap, onEdit, onDelete, showChooseButton = false, chooseDisabled = false, onChoose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    areaName: area.areaName,
    areaType: area.areaType
  });
  const [isHovered, setIsHovered] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const cardRef = useRef(null);

  // Normalize boundary formats to an array of { lat, lng } objects.
  // Supports:
  // 1) [{lat, lng}, ...]
  // 2) [[lat, lng], ...]
  // 3) Nominatim boundingbox: [south, north, west, east] -> rectangle polygon
  const normalizedBoundary = useMemo(() => {
    const b = area.boundary;
    if (!b || (Array.isArray(b) && b.length === 0)) return [];
    try {
      // Form 3: boundingbox
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
      // Form 1: objects
      if (Array.isArray(b) && b.length > 0 && typeof b[0] === 'object' && b[0] !== null && 'lat' in b[0] && 'lng' in b[0]) {
        return b.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) })).filter(p => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
      }
      // Form 2: pairs
      if (Array.isArray(b) && b.length > 0 && Array.isArray(b[0]) && b[0].length === 2) {
        return b.map(arr => ({ lat: parseFloat(arr[0]), lng: parseFloat(arr[1]) })).filter(p => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
      }
      return [];
    } catch (e) {
      console.warn('Boundary normalization failed, falling back to empty.', e);
      return [];
    }
  }, [area.boundary]);

  const toggleMap = () => {
    setShowMap(prev => !prev);
    // Scroll into view to ensure the newly mounted map is visible
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const handleEditSubmit = () => {
    onEdit(area._id, editData);
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditData({
      areaName: area.areaName,
      areaType: area.areaType
    });
    setIsEditing(false);
  };

  const cardStyle = {
    ...styles.card,
    ...(isHovered ? styles.cardHover : {})
  };

  return (
    <div 
      ref={cardRef}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing ? (
        <div style={styles.editForm}>
          <input
            style={styles.input}
            type="text"
            value={editData.areaName}
            onChange={(e) => setEditData({...editData, areaName: e.target.value})}
            placeholder="Area Name"
          />
          <input
            style={styles.input}
            type="text"
            value={editData.areaType}
            onChange={(e) => setEditData({...editData, areaType: e.target.value})}
            placeholder="Area Type"
          />
          <div style={styles.buttonContainer}>
            <button
              style={{...styles.button, ...styles.saveButton}}
              onClick={handleEditSubmit}
            >
              Save
            </button>
            <button
              style={{...styles.button, ...styles.cancelButton}}
              onClick={handleEditCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={styles.header}>
            <div>
              <h3 style={styles.title}>{area.areaName}</h3>
              <span style={styles.type}>{area.areaType}</span>
            </div>
          </div>

          <div style={styles.coordinates}>
            📍 Lat: {area.location.lat.toFixed(6)}, Lng: {area.location.lng.toFixed(6)}
          </div>

          {/* Boundary summary and point list (scrollable) */}
          {normalizedBoundary.length > 0 && (
            <div>
              <div style={styles.boundary}>🔷 Boundary points: {normalizedBoundary.length}</div>
              <div style={styles.boundaryListBox}>
                {normalizedBoundary.map((pt, idx) => (
                  <div key={idx} style={styles.boundaryItem}>
                    {idx + 1}. {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Map */}
          <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              style={{ ...styles.button, ...styles.toggleButton }}
              onClick={toggleMap}
              onMouseEnter={(e) => e.target.style.backgroundColor = styles.viewButtonHover.backgroundColor}
              onMouseLeave={(e) => e.target.style.backgroundColor = styles.toggleButton.backgroundColor}
            >
              {showMap ? 'Hide Map' : 'View on Map'}
            </button>
            {showChooseButton && (
              <button
                style={{ ...styles.button, backgroundColor: chooseDisabled ? '#ccc' : '#4CAF50', color: '#fff' }}
                disabled={chooseDisabled}
                title={chooseDisabled ? 'Max drivers reached or already assigned' : 'Choose this map'}
                onClick={() => onChoose && onChoose(area)}
              >
                Choose this map
              </button>
            )}
          </div>

          {/* Inline Map Preview */}
          {showMap && (
            <div style={styles.mapBox}>
              {/* Use a unique key to force Leaflet to re-initialize cleanly on toggle */}
              <MapPreview
                key={`map-${area._id}-${showMap}`}
                center={area.location}
                boundary={normalizedBoundary}
                allowPolygonDrawing={false}
                onBoundaryChange={undefined}
                zoom={15}
              />
            </div>
          )}

          {/* Action buttons */}
          <div style={styles.buttonContainer}>
            <button
              style={{...styles.button, ...styles.editButton}}
              onClick={() => setIsEditing(true)}
              onMouseEnter={(e) => e.target.style.backgroundColor = styles.editButtonHover.backgroundColor}
              onMouseLeave={(e) => e.target.style.backgroundColor = styles.editButton.backgroundColor}
            >
              Edit
            </button>
            <button
              style={{...styles.button, ...styles.deleteButton}}
              onClick={() => onDelete(area._id)}
              onMouseEnter={(e) => e.target.style.backgroundColor = styles.deleteButtonHover.backgroundColor}
              onMouseLeave={(e) => e.target.style.backgroundColor = styles.deleteButton.backgroundColor}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AreaCard;
