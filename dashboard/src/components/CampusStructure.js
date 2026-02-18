import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';

function CampusStructure() {
  const [structure, setStructure] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [expandedFaculty, setExpandedFaculty] = useState(null);
  const [expandedBuilding, setExpandedBuilding] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCampusStructure();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchCampusStructure, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchRoomDetails(selectedRoom);
    }
  }, [selectedRoom]);

  const fetchCampusStructure = async () => {
    try {
      const response = await dashboardAPI.getCampusStructure();
      setStructure(response.data.data.structure);
      setStatistics(response.data.data.statistics);
      setError(null);
    } catch (err) {
      console.error('Error fetching campus structure:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomDetails = async (roomId) => {
    try {
      const response = await dashboardAPI.getRoomDetails(roomId);
      setRoomDetails(response.data.data);
    } catch (err) {
      console.error('Error fetching room details:', err);
    }
  };

  const loadRoomsForBuilding = async (buildingId) => {
    try {
      const response = await dashboardAPI.getRooms(null, buildingId);
      return response.data.data || [];
    } catch (err) {
      console.error('Error fetching rooms:', err);
      return [];
    }
  };

  const handleBuildingClick = async (buildingId) => {
    if (expandedBuilding === buildingId) {
      setExpandedBuilding(null);
    } else {
      setExpandedBuilding(buildingId);
      const rooms = await loadRoomsForBuilding(buildingId);
      
      // Update structure with rooms
      setStructure(prevStructure => 
        prevStructure.map(faculty => ({
          ...faculty,
          buildings: faculty.buildings.map(building => 
            building.id === buildingId 
              ? { ...building, rooms } 
              : building
          )
        }))
      );
    }
  };

  if (loading && !structure) {
    return <div className="loading">Loading campus structure</div>;
  }

  if (error && !structure) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="campus-structure">
      {/* Statistics Overview */}
      {statistics && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <span style={{ fontSize: '1.25rem' }}>🗺️</span>
              Campus Overview
            </h2>
            <span className="badge success">Live</span>
          </div>
          <div className="card-body">
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-box-value" style={{ color: 'var(--accent-yellow)' }}>{statistics.total_faculties}</div>
                <div className="stat-box-label">Faculties</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-value">{statistics.total_buildings}</div>
                <div className="stat-box-label">Buildings</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-value" style={{ color: 'var(--accent-yellow)' }}>{statistics.total_floors}</div>
                <div className="stat-box-label">Floors</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-value">{statistics.total_rooms}</div>
                <div className="stat-box-label">Rooms</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campus Structure Tree */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <span style={{ fontSize: '1.25rem' }}>🌳</span>
            Campus Hierarchy
          </h2>
        </div>
        <div className="card-body">
          {structure && structure.length > 0 ? (
            <div className="structure-tree">
              {structure.map(faculty => (
                <div key={faculty.id} className="faculty-node">
                  <div 
                    className="tree-node faculty"
                    onClick={() => setExpandedFaculty(expandedFaculty === faculty.id ? null : faculty.id)}
                  >
                    <span className="node-icon">
                      {expandedFaculty === faculty.id ? '📂' : '📁'}
                    </span>
                    <span className="node-label">{faculty.name}</span>
                    <span className="node-count">
                      {faculty.buildings.length} buildings
                    </span>
                  </div>

                  {expandedFaculty === faculty.id && (
                    <div className="buildings-container">
                      {faculty.buildings.map(building => (
                        <div key={building.id} className="building-node">
                          <div 
                            className="tree-node building"
                            onClick={() => handleBuildingClick(building.id)}
                          >
                            <span className="node-icon">
                              {expandedBuilding === building.id ? '🏢' : '🏬'}
                            </span>
                            <span className="node-label">{building.name}</span>
                            <div className="node-stats">
                              <span className="badge info">{building.room_count} rooms</span>
                              <span className="badge info">{building.floor_count} floors</span>
                            </div>
                          </div>

                          {expandedBuilding === building.id && building.rooms && (
                            <div className="rooms-container">
                              <div className="rooms-grid">
                                {building.rooms.slice(0, 20).map(room => (
                                  <div 
                                    key={room.id} 
                                    className="room-card"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRoom(room.id);
                                    }}
                                  >
                                    <div className="room-icon">
                                      {room.type === 'lab' ? '🔬' : room.type === 'classroom' ? '📚' : '👔'}
                                    </div>
                                    <div className="room-info">
                                      <div className="room-name">{room.name}</div>
                                      <div className="room-type">{room.type}</div>
                                      <div className="room-capacity">Cap: {room.capacity}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {building.rooms.length > 20 && (
                                <div style={{ marginTop: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                  Showing 20 of {building.rooms.length} rooms
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
              No campus structure data available
            </div>
          )}
        </div>
      </div>

      {/* Room Details Modal */}
      {selectedRoom && roomDetails && (
        <div className="modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  {roomDetails.name}
                </h2>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setSelectedRoom(null)}
                >
                  ✕
                </button>
              </div>
              <div className="card-body">
                <div className="stats-row">
                  <div className="stat-box">
                    <div className="stat-box-value" style={{ color: 'var(--accent-yellow)', fontSize: '1.1rem' }}>{roomDetails.type}</div>
                    <div className="stat-box-label">Type</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-box-value" style={{ fontSize: '1.25rem' }}>{roomDetails.capacity}</div>
                    <div className="stat-box-label">Capacity</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-box-value" style={{ color: 'var(--accent-yellow)', fontSize: '1.25rem' }}>{roomDetails.base_load_kw}</div>
                    <div className="stat-box-label">Base Load (kW)</div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '1rem' }}>Location</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    <div>Faculty: <span style={{ color: 'var(--accent-yellow)' }}>{roomDetails.faculty.name}</span></div>
                    <div>Building: <span style={{ color: 'var(--text-primary)' }}>{roomDetails.building.name}</span></div>
                    <div>Floor: <span style={{ color: 'var(--text-primary)' }}>{roomDetails.floor.number}</span></div>
                  </div>
                </div>

                {roomDetails.latest_reading && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '1rem' }}>Latest Reading</h3>
                    <div className="stats-row">
                      <div className="stat-box">
                        <div className="stat-box-value" style={{ color: 'var(--accent-yellow)', fontSize: '1.25rem' }}>
                          {roomDetails.latest_reading.total_load.toFixed(2)}
                        </div>
                        <div className="stat-box-label">Load (kW)</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-box-value" style={{ fontSize: '1.25rem' }}>
                          {roomDetails.latest_reading.temperature.toFixed(1)}°C
                        </div>
                        <div className="stat-box-label">Temperature</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-box-value">
                          {roomDetails.latest_reading.occupancy ? '✓' : '✗'}
                        </div>
                        <div className="stat-box-label">Occupied</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-box-value">
                          {roomDetails.latest_reading.optimized ? '✓' : '✗'}
                        </div>
                        <div className="stat-box-label">Optimized</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Updated: {new Date(roomDetails.latest_reading.timestamp).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .structure-tree {
          padding: 1rem 0;
        }

        .faculty-node,
        .building-node {
          margin-bottom: 0.75rem;
        }

        .tree-node {
          padding: 1rem 1.25rem;
          background: #0a0a0a;
          border: 1px solid #27272a;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .tree-node:hover {
          background: #111111;
          border-color: #fbbf24;
          transform: translateX(4px);
        }

        .tree-node.faculty {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%);
          border: 1px solid #27272a;
          font-weight: 600;
          font-size: 1rem;
        }

        .tree-node.building {
          margin-left: 2rem;
          margin-top: 0.75rem;
          background: #111111;
        }

        .node-icon {
          font-size: 1.25rem;
        }

        .node-label {
          flex: 1;
          color: #ffffff;
        }

        .node-count,
        .node-stats {
          color: #71717a;
          font-size: 0.85rem;
          display: flex;
          gap: 0.5rem;
        }

        .buildings-container {
          margin-top: 0.75rem;
        }

        .rooms-container {
          margin-left: 2rem;
          margin-top: 1rem;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 0.75rem;
          margin-top: 0.75rem;
        }

        .room-card {
          background: #0a0a0a;
          border: 1px solid #27272a;
          border-radius: 10px;
          padding: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .room-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
          border-color: #22c55e;
        }

        .room-icon {
          font-size: 1.25rem;
        }

        .room-info {
          flex: 1;
        }

        .room-name {
          font-weight: 600;
          color: #ffffff;
          font-size: 0.85rem;
        }

        .room-type {
          color: #fbbf24;
          font-size: 0.75rem;
          text-transform: capitalize;
        }

        .room-capacity {
          color: #71717a;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

export default CampusStructure;
