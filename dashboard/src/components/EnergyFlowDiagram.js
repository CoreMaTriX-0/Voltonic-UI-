import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';

function EnergyFlowDiagram() {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [energyFlow, setEnergyFlow] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      fetchEnergyFlow();
      const interval = setInterval(fetchEnergyFlow, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedBuilding]);

  const fetchBuildings = async () => {
    try {
      const response = await dashboardAPI.getBuildings();
      setBuildings(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedBuilding(response.data.data[0].id);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load buildings');
      setLoading(false);
    }
  };

  const fetchEnergyFlow = async () => {
    if (!selectedBuilding) return;

    try {
      const response = await dashboardAPI.getBuildingEnergyFlow(selectedBuilding);
      setEnergyFlow(response.data.data);
    } catch (err) {
      console.error('Failed to load energy flow:', err);
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'grid': return 'var(--secondary)'; // green
      case 'solar': return 'var(--accent-yellow)'; // yellow
      case 'diesel': return 'var(--danger)'; // red
      default: return 'var(--text-muted)'; // gray
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'classroom': return '📚';
      case 'lab': return '🔬';
      case 'staff': return '👔';
      case 'Smart_Class': return '💡';
      default: return '🏢';
    }
  };

  if (loading) return <div className="loading">Loading energy flow...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!energyFlow) return <div>Select a building to view energy flow</div>;

  const currentBuilding = buildings.find(b => b.id === selectedBuilding);

  return (
    <div className="energy-flow-container">
      <div className="flow-header">
        <h2>
          <span style={{ marginRight: '0.5rem' }}>🔋</span>
          Energy Flow Visualization
        </h2>
        <div className="building-selector">
          <label>Building: </label>
          <select
            value={selectedBuilding || ''}
            onChange={(e) => setSelectedBuilding(parseInt(e.target.value))}
          >
            {buildings.map(building => (
              <option key={building.id} value={building.id}>
                {building.name} - {building.faculty_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="building-summary">
        <div className="summary-card">
          <h4>{energyFlow.building_name}</h4>
          <p>Total Load: <strong>{energyFlow.total_load.toFixed(2)} kW</strong></p>
          <p>Floors: {energyFlow.floors.length}</p>
          <p className="timestamp">Updated: {new Date(energyFlow.timestamp).toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="energy-sources-legend">
        <h4>Energy Sources:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: 'var(--secondary)' }}></span>
            <span>Grid (₹8/kWh)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: 'var(--accent-yellow)' }}></span>
            <span>Solar (₹4/kWh)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: 'var(--danger)' }}></span>
            <span>Diesel (₹16/kWh)</span>
          </div>
        </div>
      </div>

      <div className="floors-container">
        {energyFlow.floors.map(floor => (
          <div key={floor.floor_id} className="floor-section">
            <div
              className="floor-header"
              onClick={() => setSelectedFloor(selectedFloor === floor.floor_id ? null : floor.floor_id)}
            >
              <h3>
                Floor {floor.floor_number}
                <span className="floor-load">{floor.total_load.toFixed(2)} kW</span>
              </h3>
              <span className="expand-icon">{selectedFloor === floor.floor_id ? '▼' : '▶'}</span>
            </div>

            {selectedFloor === floor.floor_id && (
              <div className="rooms-grid">
                {floor.rooms.map(room => (
                  <div
                    key={room.room_id}
                    className={`room-card ${room.occupancy ? 'occupied' : 'vacant'}`}
                    style={{
                      borderLeft: `4px solid ${getSourceColor(room.energy_source)}`
                    }}
                  >
                    <div className="room-header">
                      <span className="room-icon">{getTypeIcon(room.room_type)}</span>
                      <span className="room-name">{room.room_name}</span>
                    </div>

                    <div className="room-details">
                      <div className="detail-row">
                        <span>Type:</span>
                        <span className="room-type-badge">{room.room_type}</span>
                      </div>
                      <div className="detail-row">
                        <span>Capacity:</span>
                        <span>{room.capacity}</span>
                      </div>
                      <div className="detail-row">
                        <span>Load:</span>
                        <span className="load-value">{room.total_load.toFixed(2)} kW</span>
                      </div>
                      <div className="detail-row">
                        <span>Source:</span>
                        <span
                          className="source-badge"
                          style={{
                            backgroundColor: getSourceColor(room.energy_source),
                            color: 'var(--bg-primary)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85em'
                          }}
                        >
                          {room.energy_source}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Status:</span>
                        <span className={room.occupancy ? 'status-active' : 'status-idle'}>
                          {room.occupancy ? '✓ Occupied' : '○ Vacant'}
                        </span>
                      </div>
                      {room.optimized && (
                        <div className="optimized-badge">⚡ Optimized</div>
                      )}
                    </div>

                    <div className="energy-flow-arrow">
                      <div className="arrow">→</div>
                      <div className="flow-label">₹{(room.total_load * room.energy_source_cost).toFixed(2)}/h</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .energy-flow-container {
          padding: 1.5rem;
          background: var(--bg-card);
          border-radius: 16px;
          border: 1px solid var(--border-color);
        }

        .flow-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .flow-header h2 {
          color: var(--text-primary);
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          display: flex;
          align-items: center;
        }

        .building-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .building-selector label {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .building-selector select {
          padding: 0.625rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.9rem;
          transition: all 0.15s ease;
        }

        .building-selector select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .building-summary {
          background: var(--bg-secondary);
          padding: 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.25rem;
          border: 1px solid var(--border-color);
        }

        .summary-card h4 {
          color: var(--primary);
          margin: 0 0 0.75rem 0;
          font-size: 1.1rem;
        }

        .summary-card p {
          color: var(--text-secondary);
          margin: 0.375rem 0;
          font-size: 0.9rem;
        }

        .summary-card strong {
          color: var(--secondary);
          font-size: 1.1em;
        }

        .timestamp {
          font-size: 0.8rem !important;
          color: var(--text-muted) !important;
        }

        .energy-sources-legend {
          background: var(--bg-secondary);
          padding: 1rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.25rem;
          border: 1px solid var(--border-color);
        }

        .energy-sources-legend h4 {
          color: var(--text-primary);
          margin: 0 0 0.75rem 0;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .legend-items {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }

        .floors-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .floor-section {
          background: var(--bg-secondary);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .floor-header {
          padding: 1rem 1.25rem;
          background: var(--bg-card);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
          border-bottom: 1px solid var(--border-color);
          transition: all 0.15s ease;
        }

        .floor-header:hover {
          background: var(--bg-card-hover);
        }

        .floor-header h3 {
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 1rem;
          font-weight: 500;
        }

        .floor-load {
          font-size: 0.9em;
          color: var(--secondary);
          font-weight: 600;
        }

        .expand-icon {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
          padding: 1.25rem;
        }

        .room-card {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 1rem;
          transition: all 0.2s ease;
          border: 1px solid var(--border-color);
        }

        .room-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
          border-color: var(--border-light);
        }

        .room-card.occupied {
          background: var(--gradient-subtle);
        }

        .room-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .room-icon {
          font-size: 1.25rem;
        }

        .room-name {
          color: var(--text-primary);
          font-weight: 500;
          font-size: 0.9rem;
        }

        .room-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .room-type-badge {
          background: var(--bg-secondary);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .load-value {
          color: var(--accent-yellow);
          font-weight: 600;
        }

        .status-active {
          color: var(--secondary);
        }

        .status-idle {
          color: var(--text-muted);
        }

        .optimized-badge {
          background: var(--gradient-primary);
          color: var(--bg-primary);
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          text-align: center;
          margin-top: 0.75rem;
          font-weight: 600;
        }

        .energy-flow-arrow {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .arrow {
          color: var(--secondary);
          font-size: 1.1rem;
        }

        .flow-label {
          color: var(--accent-yellow);
          font-weight: 600;
          font-size: 0.85rem;
        }

        .loading, .error {
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
        }

        .error {
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}

export default EnergyFlowDiagram;
