import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';

// Building Card Component with Isometric View
function BuildingCard({ building, isSelected, onClick }) {
  const floorCount = building.floor_count || 0;
  const loadPercentage = building.total_load && building.max_capacity
    ? (building.total_load / building.max_capacity) * 100
    : 0;

  // Determine color based on load
  const getLoadColor = () => {
    if (loadPercentage < 30) return '#10B981'; // Green
    if (loadPercentage < 70) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  // Get load level text
  const getLoadLevelText = () => {
    if (loadPercentage < 30) return 'LOW';
    if (loadPercentage < 70) return 'MED';
    return 'HIGH';
  };

  // Determine power source color
  const getPowerSourceColor = () => {
    const source = building.power_source || 'grid';
    if (source === 'solar') return '#F59E0B'; // Yellow/Amber for solar
    if (source === 'diesel') return '#EF4444'; // Red for diesel
    return '#0EA5E9'; // Blue for grid
  };

  const getPowerSourceLabel = () => {
    const source = building.power_source || 'grid';
    return source.charAt(0).toUpperCase() + source.slice(1);
  };

  const baseHeight = 60;
  const floorHeight = 15;
  const totalHeight = baseHeight + (floorCount * floorHeight);

  return (
    <div
      className={`building-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <svg
        viewBox={`0 0 100 ${totalHeight + 40}`}
        className="building-svg"
      >
        {/* Building body - isometric */}
        <polygon
          points={`50,20 90,40 90,${totalHeight} 50,${totalHeight + 20} 10,${totalHeight} 10,40`}
          fill="var(--bg-card)"
          stroke="var(--border-color)"
          strokeWidth="1"
        />

        {/* Top face */}
        <polygon
          points="50,20 90,40 50,60 10,40"
          fill="var(--bg-secondary)"
          stroke="var(--border-color)"
          strokeWidth="1"
        />

        {/* Left face */}
        <polygon
          points={`10,40 10,${totalHeight} 50,${totalHeight + 20} 50,60`}
          fill="var(--bg-primary)"
          stroke="var(--border-color)"
          strokeWidth="1"
        />

        {/* Floor divisions */}
        {Array.from({ length: floorCount }).map((_, i) => {
          const y = 60 + (i * floorHeight);
          return (
            <g key={i}>
              <line
                x1="10"
                y1={y}
                x2="90"
                y2={y}
                stroke="var(--border-light)"
                strokeWidth="0.5"
                opacity="0.5"
              />
            </g>
          );
        })}

        {/* Energy load indicator with text */}
        <g>
          <rect
            x="15"
            y="5"
            width="30"
            height="12"
            fill={getLoadColor()}
            rx="3"
          />
          <text
            x="30"
            y="13"
            fontSize="6"
            fill="white"
            fontWeight="700"
            textAnchor="middle"
          >
            {getLoadLevelText()}
          </text>
        </g>

        {/* Power source indicator with text */}
        <g>
          <rect
            x="55"
            y="5"
            width="30"
            height="12"
            fill={getPowerSourceColor()}
            rx="3"
          />
          <text
            x="70"
            y="13"
            fontSize="5.5"
            fill="white"
            fontWeight="700"
            textAnchor="middle"
          >
            {getPowerSourceLabel().toUpperCase()}
          </text>
        </g>
      </svg>

      <div className="building-info">
        <div className="building-name">{building.name}</div>
        <div className="building-stats">
          <span>{floorCount} floors</span>
          <span>{building.room_count} rooms</span>
        </div>
        <div className="building-load">
          <div className="load-bar">
            <div
              className="load-fill"
              style={{
                width: `${Math.min(loadPercentage, 100)}%`,
                backgroundColor: getLoadColor()
              }}
            />
          </div>
          <div className="load-info">
            <span className="load-text">
              {building.total_load?.toFixed(1) || '0.0'} kW
            </span>
            <span
              className="power-source-badge"
              style={{ backgroundColor: getPowerSourceColor() }}
            >
              {getPowerSourceLabel()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floor Panel Component
function FloorPanel({ building, onFloorSelect }) {
  if (!building || !building.floors) return null;

  return (
    <div className="floor-panel">
      <h3>Building: {building.name}</h3>
      <div className="floor-list">
        {building.floors.map(floor => {
          const loadPercentage = floor.total_load && floor.max_capacity
            ? (floor.total_load / floor.max_capacity) * 100
            : 0;

          const getLoadColor = () => {
            if (loadPercentage < 30) return '#10B981';
            if (loadPercentage < 70) return '#F59E0B';
            return '#EF4444';
          };

          return (
            <div
              key={floor.id}
              className="floor-item"
              onClick={() => onFloorSelect(floor)}
            >
              <div className="floor-header">
                <span className="floor-number">Floor {floor.number}</span>
                <span className="floor-stats">
                  {floor.rooms?.length || 0} rooms | {floor.total_load?.toFixed(1) || '0.0'} kW
                </span>
              </div>
              <div className="floor-load-bar">
                <div
                  className="floor-load-fill"
                  style={{
                    width: `${Math.min(loadPercentage, 100)}%`,
                    backgroundColor: getLoadColor()
                  }}
                />
              </div>
              <div className="floor-occupancy">
                {floor.occupied_count || 0} occupied / {floor.rooms?.length || 0} total
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Floor Layout Component
function FloorLayout({ floor, onRoomClick }) {
  if (!floor || !floor.rooms) return null;

  const getRoomColor = (room) => {
    if (!room.total_load || !room.base_load) return 'var(--bg-card)';

    const loadRatio = room.total_load / (room.base_load * 3); // Assume 3x base is max
    if (loadRatio < 0.3) return '#10B981';
    if (loadRatio < 0.7) return '#F59E0B';
    return '#EF4444';
  };

  const getPowerSourceColor = (room) => {
    const source = room.power_source || 'grid';
    if (source === 'solar') return '#F59E0B';
    if (source === 'diesel') return '#EF4444';
    return '#0EA5E9';
  };

  const getPowerSourceLabel = (room) => {
    const source = room.power_source || 'grid';
    return source.charAt(0).toUpperCase() + source.slice(1);
  };

  return (
    <div className="floor-layout">
      <h3>Floor {floor.number} Layout</h3>
      <div className="rooms-grid">
        {floor.rooms.map(room => (
          <div
            key={room.id}
            className="room-box"
            style={{ borderLeftColor: getRoomColor(room) }}
            onClick={() => onRoomClick(room)}
          >
            <div className="room-name">{room.name}</div>
            <div className="room-type">{room.type}</div>
            <div className="room-load">{room.total_load?.toFixed(1) || '0.0'} kW</div>
            <div className="room-info-row">
              <div className="room-occupancy">
                {room.occupancy ? 'Occupied' : 'Vacant'}
              </div>
              <div
                className="room-power-source"
                style={{ backgroundColor: getPowerSourceColor(room) }}
              >
                {getPowerSourceLabel(room)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Campus Map Component
function CampusMap() {
  const [faculties, setFaculties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [viewMode, setViewMode] = useState('campus');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchRoomDetails(selectedRoom);
    }
  }, [selectedRoom]);

  const fetchData = async () => {
    try {
      const [facultiesRes, buildingsRes] = await Promise.all([
        dashboardAPI.getFaculties(),
        dashboardAPI.getBuildings()
      ]);

      setFaculties(facultiesRes.data.data || []);
      setBuildings(buildingsRes.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
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

  const handleBuildingClick = async (building) => {
    setSelectedBuilding(building);
    setSelectedFloor(null);

    // Fetch floors and rooms for the building if not already loaded
    if (!building.floors || building.floors.length === 0) {
      try {
        const response = await dashboardAPI.getBuildings();
        const updatedBuilding = response.data.data.find(b => b.id === building.id);
        if (updatedBuilding) {
          setSelectedBuilding(updatedBuilding);
        }
      } catch (err) {
        console.error('Error fetching building details:', err);
      }
    }
  };

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room.id);
  };

  // Filter buildings
  const filteredBuildings = buildings.filter(building => {
    if (selectedFaculty !== 'all' && building.faculty_id !== parseInt(selectedFaculty)) {
      return false;
    }

    if (buildingFilter !== 'all') {
      const loadPercentage = building.total_load && building.max_capacity
        ? (building.total_load / building.max_capacity) * 100
        : 0;

      if (buildingFilter === 'high' && loadPercentage < 70) return false;
      if (buildingFilter === 'low' && loadPercentage >= 30) return false;
    }

    return true;
  });

  // Calculate statistics
  const totalBuildings = buildings.length;
  const totalFloors = buildings.reduce((sum, b) => sum + (b.floor_count || 0), 0);
  const totalRooms = buildings.reduce((sum, b) => sum + (b.room_count || 0), 0);

  if (loading) return <div className="loading">Loading campus map...</div>;
  if (error && buildings.length === 0) return <div className="error">Error: {error}</div>;

  return (
    <div className="campus-map">
      <h2>Campus Map</h2>

      {/* Statistics Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-value">{faculties.length}</div>
          <div className="stat-label">Faculties</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalBuildings}</div>
          <div className="stat-label">Buildings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalFloors}</div>
          <div className="stat-label">Floors</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalRooms}</div>
          <div className="stat-label">Rooms</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="control-group">
          <label>Faculty:</label>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            <option value="all">All Faculties</option>
            {faculties.map(faculty => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Filter:</label>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
          >
            <option value="all">All Buildings</option>
            <option value="high">High Load (70%+)</option>
            <option value="low">Low Load (&lt;30%)</option>
          </select>
        </div>

        <div className="control-group">
          <label>View:</label>
          <div className="view-toggle">
            <button
              className={viewMode === 'campus' ? 'active' : ''}
              onClick={() => setViewMode('campus')}
            >
              Campus
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>

        <div className="legend">
          <div className="legend-group">
            <span className="legend-title">Load:</span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#10B981' }}></span>
              Low
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#F59E0B' }}></span>
              Med
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#EF4444' }}></span>
              High
            </span>
          </div>
          <div className="legend-separator"></div>
          <div className="legend-group">
            <span className="legend-title">Power:</span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#0EA5E9' }}></span>
              Grid
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#F59E0B' }}></span>
              Solar
            </span>
            <span className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#EF4444' }}></span>
              Diesel
            </span>
          </div>
        </div>
      </div>

      {/* Campus View */}
      {viewMode === 'campus' && (
        <div className="campus-view">
          <div className="buildings-grid">
            {filteredBuildings.map(building => (
              <BuildingCard
                key={building.id}
                building={building}
                isSelected={selectedBuilding?.id === building.id}
                onClick={() => handleBuildingClick(building)}
              />
            ))}
          </div>

          {selectedBuilding && (
            <FloorPanel
              building={selectedBuilding}
              onFloorSelect={handleFloorSelect}
            />
          )}

          {selectedFloor && (
            <FloorLayout
              floor={selectedFloor}
              onRoomClick={handleRoomClick}
            />
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="list-view">
          {filteredBuildings.map(building => (
            <div key={building.id} className="building-list-item">
              <div className="building-list-header">
                <h3>{building.name}</h3>
                <span className="building-list-stats">
                  {building.floor_count} floors | {building.room_count} rooms | {building.total_load?.toFixed(1) || '0.0'} kW
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room Details Modal */}
      {selectedRoom && roomDetails && (
        <div className="modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{roomDetails.name}</h3>
              <button onClick={() => setSelectedRoom(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{roomDetails.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Capacity</span>
                  <span className="detail-value">{roomDetails.capacity}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Base Load</span>
                  <span className="detail-value">{roomDetails.base_load_kw} kW</span>
                </div>
                {roomDetails.latest_reading && (
                  <>
                    <div className="detail-item">
                      <span className="detail-label">Current Load</span>
                      <span className="detail-value">{roomDetails.latest_reading.total_load.toFixed(2)} kW</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Temperature</span>
                      <span className="detail-value">{roomDetails.latest_reading.temperature.toFixed(1)}°C</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className="detail-value">
                        {roomDetails.latest_reading.occupancy ? 'Occupied' : 'Vacant'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .campus-map {
          padding: 0;
        }

        .campus-map h2 {
          color: var(--text-primary);
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: var(--bg-card);
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .controls-bar {
          display: flex;
          gap: 1.5rem;
          align-items: center;
          background: var(--bg-card);
          padding: 1rem 1.25rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .control-group label {
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .control-group select {
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .view-toggle {
          display: flex;
          gap: 0.25rem;
          background: var(--bg-secondary);
          padding: 0.25rem;
          border-radius: 8px;
        }

        .view-toggle button {
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .view-toggle button.active {
          background: var(--primary);
          color: var(--bg-primary);
        }

        .legend {
          display: flex;
          gap: 1.5rem;
          margin-left: auto;
          align-items: center;
        }

        .legend-group {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .legend-title {
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .legend-separator {
          width: 1px;
          height: 20px;
          background: var(--border-color);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--text-secondary);
          font-size: 0.8rem;
        }

        .legend-color {
          width: 14px;
          height: 14px;
          border-radius: 3px;
        }

        .campus-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .buildings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1.5rem;
        }

        .building-card {
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .building-card:hover {
          border-color: var(--primary);
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .building-card.selected {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
        }

        .building-svg {
          width: 100%;
          height: auto;
          margin-bottom: 0.75rem;
        }

        .building-info {
          text-align: center;
        }

        .building-name {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        .building-stats {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          color: var(--text-muted);
          font-size: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .building-load {
          margin-top: 0.5rem;
        }

        .load-bar {
          height: 6px;
          background: var(--bg-secondary);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .load-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .load-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .load-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .power-source-badge {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          color: white;
          font-weight: 600;
          text-transform: uppercase;
        }

        .floor-panel {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid var(--border-color);
        }

        .floor-panel h3 {
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .floor-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .floor-item {
          background: var(--bg-secondary);
          padding: 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid var(--border-color);
        }

        .floor-item:hover {
          border-color: var(--primary);
          transform: translateX(4px);
        }

        .floor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .floor-number {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .floor-stats {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .floor-load-bar {
          height: 8px;
          background: var(--bg-primary);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .floor-load-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .floor-occupancy {
          color: var(--text-secondary);
          font-size: 0.8rem;
        }

        .floor-layout {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid var(--border-color);
        }

        .floor-layout h3 {
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
        }

        .room-box {
          background: var(--bg-secondary);
          padding: 0.875rem;
          border-radius: 8px;
          border-left: 4px solid var(--primary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .room-box:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .room-name {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
        }

        .room-type {
          color: var(--text-secondary);
          font-size: 0.75rem;
          text-transform: capitalize;
          margin-bottom: 0.25rem;
        }

        .room-load {
          color: var(--primary);
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .room-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .room-occupancy {
          color: var(--text-muted);
          font-size: 0.7rem;
        }

        .room-power-source {
          font-size: 0.6rem;
          padding: 0.15rem 0.35rem;
          border-radius: 3px;
          color: white;
          font-weight: 700;
          text-transform: uppercase;
        }

        .list-view {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .building-list-item {
          background: var(--bg-card);
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .building-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .building-list-header h3 {
          color: var(--text-primary);
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .building-list-stats {
          color: var(--text-secondary);
          font-size: 0.85rem;
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
          background: var(--bg-card);
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          border: 1px solid var(--border-color);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h3 {
          color: var(--text-primary);
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .modal-header button {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .modal-header button:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .detail-value {
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
        }

        .loading, .error {
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
        }

        .error {
          color: var(--danger);
        }

        @media (max-width: 1024px) {
          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
          }

          .buildings-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }

          .controls-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .legend {
            margin-left: 0;
          }
        }

        @media (max-width: 768px) {
          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
          }

          .buildings-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .rooms-grid {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default CampusMap;
