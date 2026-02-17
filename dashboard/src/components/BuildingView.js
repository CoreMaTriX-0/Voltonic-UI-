import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';

function BuildingView() {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingDetails, setBuildingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBuildings();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchBuildings, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      fetchBuildingDetails(selectedBuilding);
    }
  }, [selectedBuilding]);

  const fetchBuildings = async () => {
    try {
      const response = await dashboardAPI.getBuildingsLive();
      setBuildings(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching buildings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildingDetails = async (buildingId) => {
    try {
      const response = await dashboardAPI.getBuildingLive(buildingId);
      setBuildingDetails(response.data.data);
    } catch (err) {
      console.error('Error fetching building details:', err);
    }
  };

  if (loading && buildings.length === 0) {
    return <div className="loading">Loading buildings</div>;
  }

  if (error && buildings.length === 0) {
    return <div className="error">Error: {error}</div>;
  }

  const sortedBuildings = [...buildings].sort((a, b) => b.current_load_kw - a.current_load_kw);

  const getLoadClass = (load) => {
    if (load > 300) return 'danger';
    if (load > 150) return 'warning';
    return 'success';
  };

  return (
    <div className="buildings-view">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span style={{ fontSize: '1.25rem' }}>🏢</span>
            Building Energy Consumption
          </h2>
          <span className="badge info">{buildings.length} Buildings</span>
        </div>
        <div className="card-body">
          {buildings.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
              No building data available
            </div>
          ) : (
            <div className="grid-3">
              {sortedBuildings.map((building, index) => (
                <div 
                  key={building.building_id || index} 
                  className="card"
                  onClick={() => setSelectedBuilding(building.building_id)}
                  style={{ 
                    cursor: 'pointer',
                    borderLeft: index < 3 ? '3px solid var(--accent-yellow)' : '3px solid var(--accent-green)'
                  }}
                >
                  <div className="card-header" style={{ paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                      {building.building_name || `Building ${building.building_id}`}
                    </h3>
                    <span className={`badge ${index < 3 ? 'warning' : 'success'}`}>
                      #{index + 1}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="metric" style={{ margin: '0.5rem 0' }}>
                      <div className="metric-label">Current Load</div>
                      <div className={`metric-value ${getLoadClass(building.current_load_kw)}`} style={{ fontSize: '1.5rem' }}>
                        {building.current_load_kw?.toFixed(2) || '0.00'}
                        <span className="metric-unit">kW</span>
                      </div>
                    </div>
                    <div className="stats-row" style={{ marginTop: '1rem' }}>
                      <div className="stat-box" style={{ padding: '0.75rem' }}>
                        <div className="stat-box-value" style={{ fontSize: '1.25rem', color: 'var(--accent-yellow)' }}>
                          {building.room_count || 0}
                        </div>
                        <div className="stat-box-label">Rooms</div>
                      </div>
                      <div className="stat-box" style={{ padding: '0.75rem' }}>
                        <div className="stat-box-value" style={{ fontSize: '1.25rem' }}>
                          {building.occupied_count || 0}
                        </div>
                        <div className="stat-box-label">Occupied</div>
                      </div>
                    </div>
                    {building.avg_temperature && (
                      <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Avg Temp: <span style={{ color: 'var(--text-secondary)' }}>{building.avg_temperature.toFixed(1)}°C</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedBuilding && buildingDetails && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">
              <span style={{ fontSize: '1.25rem' }}>📊</span>
              {buildingDetails.building_name || `Building ${selectedBuilding}`}
            </h2>
            <button 
              className="btn btn-secondary"
              onClick={() => setSelectedBuilding(null)}
            >
              Close
            </button>
          </div>
          <div className="card-body">
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-box-value" style={{ color: 'var(--accent-yellow)' }}>{buildingDetails.current_load_kw?.toFixed(2)}</div>
                <div className="stat-box-label">Current Load (kW)</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-value">{buildingDetails.room_count}</div>
                <div className="stat-box-label">Total Rooms</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-value" style={{ color: 'var(--accent-yellow)' }}>{buildingDetails.occupied_count}</div>
                <div className="stat-box-label">Occupied Rooms</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-value">{buildingDetails.avg_temperature?.toFixed(1)}°C</div>
                <div className="stat-box-label">Avg Temperature</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuildingView;
