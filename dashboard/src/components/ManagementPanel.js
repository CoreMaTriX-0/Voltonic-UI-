import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';

function ManagementPanel() {
  const [faculties, setFaculties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [message, setMessage] = useState(null);
  const [activeSection, setActiveSection] = useState('infrastructure');
  const [expandedSections, setExpandedSections] = useState({
    building: true,
    floor: false,
    room: false
  });
  const [expandedFaculties, setExpandedFaculties] = useState({});
  const [expandedBuildings, setExpandedBuildings] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Room form
  const [roomForm, setRoomForm] = useState({
    name: '',
    type: 'classroom',
    capacity: 40,
    base_load_kw: 0.5,
    floor_id: ''
  });

  // Floor form
  const [floorForm, setFloorForm] = useState({
    number: 1,
    building_id: ''
  });

  // Building form
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    faculty_id: ''
  });

  // Power control
  const [powerControl, setPowerControl] = useState({
    room_id: '',
    action: 'increase',
    value: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [facultiesRes, buildingsRes] = await Promise.all([
        dashboardAPI.getFaculties(),
        dashboardAPI.getBuildings()
      ]);

      setFaculties(facultiesRes.data.data);
      setBuildings(buildingsRes.data.data);

      // Extract all floors
      const allFloors = [];
      buildingsRes.data.data.forEach(building => {
        building.floors.forEach(floor => {
          allFloors.push({
            ...floor,
            building_name: building.name
          });
        });
      });
      setFloors(allFloors);
    } catch (err) {
      showMessage('Failed to load data', 'error');
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const addToRecentActivity = (text) => {
    const newActivity = {
      text,
      timestamp: new Date()
    };
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await dashboardAPI.createRoom(roomForm);
      showMessage(`Room ${roomForm.name} created successfully!`, 'success');
      addToRecentActivity(`Room ${roomForm.name} created`);
      setRoomForm({
        name: '',
        type: 'classroom',
        capacity: 40,
        base_load_kw: 0.5,
        floor_id: ''
      });
      fetchData();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to create room', 'error');
    }
  };

  const handleCreateFloor = async (e) => {
    e.preventDefault();
    try {
      const response = await dashboardAPI.createFloor(floorForm);
      showMessage(`Floor ${floorForm.number} created successfully!`, 'success');
      addToRecentActivity(`Floor ${floorForm.number} added`);
      setFloorForm({ number: 1, building_id: '' });
      fetchData();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to create floor', 'error');
    }
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    try {
      const response = await dashboardAPI.createBuilding(buildingForm);
      showMessage(`Building ${buildingForm.name} created successfully!`, 'success');
      addToRecentActivity(`Building ${buildingForm.name} created`);
      setBuildingForm({ name: '', faculty_id: '' });
      fetchData();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to create building', 'error');
    }
  };

  const handlePowerControl = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        action: powerControl.action,
        ...(powerControl.action === 'set' && { value: parseFloat(powerControl.value) })
      };
      const response = await dashboardAPI.controlRoomPower(powerControl.room_id, payload);
      showMessage(response.data.message, 'success');
      addToRecentActivity(`Power adjusted for room`);
      setPowerControl({ room_id: '', action: 'increase', value: 0 });
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to control power', 'error');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleFaculty = (facultyId) => {
    setExpandedFaculties(prev => ({
      ...prev,
      [facultyId]: !prev[facultyId]
    }));
  };

  const toggleBuilding = (buildingId) => {
    setExpandedBuildings(prev => ({
      ...prev,
      [buildingId]: !prev[buildingId]
    }));
  };

  const toggleFloor = (floorId) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floorId]: !prev[floorId]
    }));
  };

  // Calculate statistics
  const totalBuildings = buildings.length;
  const totalFloors = buildings.reduce((sum, b) => sum + (b.floors?.length || 0), 0);
  const totalRooms = buildings.reduce((sum, b) =>
    sum + b.floors.reduce((fsum, f) => fsum + (f.rooms?.length || 0), 0), 0
  );

  // Get all rooms for power control
  const allRooms = [];
  buildings.forEach(building => {
    building.floors.forEach(floor => {
      floor.rooms?.forEach(room => {
        allRooms.push({
          ...room,
          floor_number: floor.number,
          building_name: building.name,
          display_name: `${building.name} - Floor ${floor.number} - ${room.name}`
        });
      });
    });
  });

  // Filter rooms by search query
  const filteredRooms = allRooms.filter(room =>
    room.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected room details
  const selectedRoom = allRooms.find(r => r.id === powerControl.room_id);

  // Get preview text for forms
  const getFloorPreview = () => {
    if (floorForm.building_id) {
      const building = buildings.find(b => b.id === parseInt(floorForm.building_id));
      return building ? `Floor ${floorForm.number} in ${building.name}` : '';
    }
    return '';
  };

  const getRoomPreview = () => {
    if (roomForm.floor_id) {
      const floor = floors.find(f => f.id === parseInt(roomForm.floor_id));
      return floor ? `${roomForm.type} in ${floor.building_name}, Floor ${floor.number}` : '';
    }
    return '';
  };

  return (
    <div className="management-panel">
      <h2>Campus Management</h2>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="management-grid">
        {/* Left Sidebar */}
        <div className="sidebar">
          {/* Statistics Card */}
          <div className="stats-card">
            <h3>Campus Overview</h3>
            <div className="stat-item">
              <span className="stat-label">Total Buildings</span>
              <span className="stat-value">{totalBuildings}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Floors</span>
              <span className="stat-value">{totalFloors}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Rooms</span>
              <span className="stat-value">{totalRooms}</span>
            </div>
          </div>

          {/* Hierarchy Tree */}
          <div className="hierarchy-card">
            <h3>Campus Structure</h3>
            <div className="hierarchy-tree">
              {faculties.map(faculty => {
                const facultyBuildings = buildings.filter(b => b.faculty_id === faculty.id);
                return (
                  <div key={faculty.id} className="tree-item">
                    <div
                      className="tree-node faculty-node"
                      onClick={() => toggleFaculty(faculty.id)}
                    >
                      <span className="tree-icon">
                        {expandedFaculties[faculty.id] ? '▼' : '▶'}
                      </span>
                      <span className="tree-label">{faculty.name}</span>
                      <span className="tree-count">({facultyBuildings.length} buildings)</span>
                    </div>
                    {expandedFaculties[faculty.id] && (
                      <div className="tree-children">
                        {facultyBuildings.map(building => (
                          <div key={building.id} className="tree-item">
                            <div
                              className="tree-node building-node"
                              onClick={() => toggleBuilding(building.id)}
                            >
                              <span className="tree-icon">
                                {expandedBuildings[building.id] ? '▼' : '▶'}
                              </span>
                              <span className="tree-label">{building.name}</span>
                              <span className="tree-count">({building.floors?.length || 0} floors)</span>
                            </div>
                            {expandedBuildings[building.id] && (
                              <div className="tree-children">
                                {building.floors?.map(floor => (
                                  <div key={floor.id} className="tree-item">
                                    <div
                                      className="tree-node floor-node"
                                      onClick={() => toggleFloor(floor.id)}
                                    >
                                      <span className="tree-icon">
                                        {expandedFloors[floor.id] ? '▼' : '▶'}
                                      </span>
                                      <span className="tree-label">Floor {floor.number}</span>
                                      <span className="tree-count">({floor.rooms?.length || 0} rooms)</span>
                                    </div>
                                    {expandedFloors[floor.id] && (
                                      <div className="tree-children">
                                        {floor.rooms?.map(room => (
                                          <div key={room.id} className="tree-node room-node">
                                            <span className="tree-bullet">•</span>
                                            <span className="tree-label">{room.name}</span>
                                            <span className="tree-meta">{room.type}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-card">
            <h3>Recent Changes</h3>
            <div className="activity-feed">
              {recentActivity.length === 0 ? (
                <p className="no-activity">No recent activity</p>
              ) : (
                recentActivity.map((activity, idx) => (
                  <div key={idx} className="activity-item">
                    <span className="activity-text">{activity.text}</span>
                    <span className="activity-time">
                      {Math.floor((new Date() - activity.timestamp) / 60000)} min ago
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Main Panel */}
        <div className="main-panel">
          {/* Segmented Control */}
          <div className="segmented-control">
            <button
              className={activeSection === 'infrastructure' ? 'active' : ''}
              onClick={() => setActiveSection('infrastructure')}
            >
              Infrastructure
            </button>
            <button
              className={activeSection === 'power' ? 'active' : ''}
              onClick={() => setActiveSection('power')}
            >
              Power Control
            </button>
          </div>

          {/* Infrastructure Section */}
          {activeSection === 'infrastructure' && (
            <div className="forms-container">
              {/* Add Building */}
              <div className="accordion-section">
                <div
                  className="accordion-header"
                  onClick={() => toggleSection('building')}
                >
                  <span className="accordion-icon">
                    {expandedSections.building ? '▼' : '▶'}
                  </span>
                  <h3>Add New Building</h3>
                </div>
                {expandedSections.building && (
                  <form onSubmit={handleCreateBuilding} className="accordion-content">
                    <div className="form-group">
                      <label>Building Name</label>
                      <input
                        type="text"
                        value={buildingForm.name}
                        onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                        placeholder="e.g., ENG-B4"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Faculty</label>
                      <select
                        value={buildingForm.faculty_id}
                        onChange={(e) => setBuildingForm({ ...buildingForm, faculty_id: parseInt(e.target.value) })}
                        required
                      >
                        <option value="">Select Faculty</option>
                        {faculties.map(faculty => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" className="btn-primary">Create Building</button>
                  </form>
                )}
              </div>

              {/* Add Floor */}
              <div className="accordion-section">
                <div
                  className="accordion-header"
                  onClick={() => toggleSection('floor')}
                >
                  <span className="accordion-icon">
                    {expandedSections.floor ? '▼' : '▶'}
                  </span>
                  <h3>Add New Floor</h3>
                </div>
                {expandedSections.floor && (
                  <form onSubmit={handleCreateFloor} className="accordion-content">
                    <div className="form-group">
                      <label>Building</label>
                      <select
                        value={floorForm.building_id}
                        onChange={(e) => setFloorForm({ ...floorForm, building_id: parseInt(e.target.value) })}
                        required
                      >
                        <option value="">Select Building</option>
                        {buildings.map(building => (
                          <option key={building.id} value={building.id}>
                            {building.name} - {building.faculty_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Floor Number</label>
                      <input
                        type="number"
                        value={floorForm.number}
                        onChange={(e) => setFloorForm({ ...floorForm, number: parseInt(e.target.value) })}
                        min="1"
                        required
                      />
                    </div>

                    {getFloorPreview() && (
                      <div className="form-preview">
                        Preview: {getFloorPreview()}
                      </div>
                    )}

                    <button type="submit" className="btn-primary">Create Floor</button>
                  </form>
                )}
              </div>

              {/* Add Room */}
              <div className="accordion-section">
                <div
                  className="accordion-header"
                  onClick={() => toggleSection('room')}
                >
                  <span className="accordion-icon">
                    {expandedSections.room ? '▼' : '▶'}
                  </span>
                  <h3>Add New Room</h3>
                </div>
                {expandedSections.room && (
                  <form onSubmit={handleCreateRoom} className="accordion-content">
                    <div className="form-group">
                      <label>Floor</label>
                      <select
                        value={roomForm.floor_id}
                        onChange={(e) => setRoomForm({ ...roomForm, floor_id: parseInt(e.target.value) })}
                        required
                      >
                        <option value="">Select Floor</option>
                        {floors.map(floor => (
                          <option key={floor.id} value={floor.id}>
                            {floor.building_name} - Floor {floor.number}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Room Name</label>
                      <input
                        type="text"
                        value={roomForm.name}
                        onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                        placeholder="e.g., ENG-B1-F1-C31"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Room Type</label>
                      <select
                        value={roomForm.type}
                        onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
                      >
                        <option value="classroom">Classroom</option>
                        <option value="lab">Lab</option>
                        <option value="staff">Staff Room</option>
                        <option value="Smart_Class">Smart Class</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Capacity</label>
                        <input
                          type="number"
                          value={roomForm.capacity}
                          onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
                          min="1"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Base Load (kW)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={roomForm.base_load_kw}
                          onChange={(e) => setRoomForm({ ...roomForm, base_load_kw: parseFloat(e.target.value) })}
                          min="0.1"
                          required
                        />
                      </div>
                    </div>

                    {getRoomPreview() && (
                      <div className="form-preview">
                        Preview: {getRoomPreview()}
                      </div>
                    )}

                    <button type="submit" className="btn-primary">Create Room</button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Power Control Section */}
          {activeSection === 'power' && (
            <div className="power-control-section">
              <form onSubmit={handlePowerControl}>
                <div className="form-group">
                  <label>Search Room</label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Type to search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Select Room</label>
                  <select
                    value={powerControl.room_id}
                    onChange={(e) => setPowerControl({ ...powerControl, room_id: parseInt(e.target.value) })}
                    required
                  >
                    <option value="">Select Room</option>
                    {filteredRooms.map((room, idx) => (
                      <option key={idx} value={room.id}>
                        {room.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRoom && (
                  <div className="room-details">
                    <h4>Selected Room Details</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Current Load</span>
                        <span className="detail-value">{selectedRoom.total_load?.toFixed(2) || '0.00'} kW</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Type</span>
                        <span className="detail-value">{selectedRoom.type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Capacity</span>
                        <span className="detail-value">{selectedRoom.capacity}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Action</label>
                  <select
                    value={powerControl.action}
                    onChange={(e) => setPowerControl({ ...powerControl, action: e.target.value })}
                  >
                    <option value="increase">Increase (+0.5 kW)</option>
                    <option value="decrease">Decrease (-0.5 kW)</option>
                    <option value="set">Set Custom Value</option>
                  </select>
                </div>

                {powerControl.action === 'set' && (
                  <div className="form-group">
                    <label>Custom Load (kW)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={powerControl.value}
                      onChange={(e) => setPowerControl({ ...powerControl, value: parseFloat(e.target.value) })}
                      min="0.1"
                      required
                    />
                  </div>
                )}

                <button type="submit" className="btn-primary">Apply Power Control</button>
              </form>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .management-panel {
          padding: 0;
        }

        .management-panel h2 {
          color: var(--text-primary);
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .message {
          padding: 1rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .message.success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--secondary);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .message.error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .management-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 1.5rem;
        }

        /* Sidebar Styles */
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .stats-card,
        .hierarchy-card,
        .activity-card {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid var(--border-color);
        }

        .stats-card h3,
        .hierarchy-card h3,
        .activity-card h3 {
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border-color);
        }

        .stat-item:last-child {
          border-bottom: none;
        }

        .stat-label {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .stat-value {
          color: var(--primary);
          font-size: 1.25rem;
          font-weight: 700;
        }

        .hierarchy-tree {
          max-height: 400px;
          overflow-y: auto;
        }

        .tree-item {
          margin-bottom: 0.5rem;
        }

        .tree-node {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s ease;
          font-size: 0.9rem;
        }

        .tree-node:hover {
          background: var(--bg-card-hover);
        }

        .faculty-node {
          color: var(--primary);
          font-weight: 600;
        }

        .building-node {
          color: var(--text-primary);
          font-weight: 500;
          padding-left: 1rem;
        }

        .floor-node {
          color: var(--text-secondary);
          font-weight: 500;
          padding-left: 2rem;
        }

        .room-node {
          color: var(--text-muted);
          padding-left: 3rem;
          cursor: default;
          font-size: 0.85rem;
        }

        .room-node:hover {
          background: transparent;
        }

        .tree-icon {
          color: var(--text-muted);
          font-size: 0.75rem;
          width: 12px;
        }

        .tree-bullet {
          color: var(--text-muted);
        }

        .tree-label {
          flex: 1;
        }

        .tree-meta {
          color: var(--text-muted);
          font-size: 0.75rem;
          font-style: italic;
        }

        .tree-count {
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .tree-children {
          margin-top: 0.25rem;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .no-activity {
          color: var(--text-muted);
          font-size: 0.85rem;
          text-align: center;
          padding: 1rem 0;
        }

        .activity-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 8px;
          border-left: 3px solid var(--primary);
        }

        .activity-text {
          color: var(--text-primary);
          font-size: 0.85rem;
        }

        .activity-time {
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        /* Main Panel Styles */
        .main-panel {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .segmented-control {
          display: flex;
          gap: 0.5rem;
          background: var(--bg-card);
          padding: 0.5rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .segmented-control button {
          flex: 1;
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .segmented-control button:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .segmented-control button.active {
          background: var(--gradient-primary);
          color: var(--bg-primary);
        }

        .forms-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .accordion-section {
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .accordion-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .accordion-header:hover {
          background: var(--bg-card-hover);
        }

        .accordion-icon {
          color: var(--text-muted);
          font-size: 0.75rem;
          width: 12px;
        }

        .accordion-header h3 {
          color: var(--text-primary);
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .accordion-content {
          padding: 0 1.25rem 1.25rem 1.25rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.85rem;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.9rem;
          transition: all 0.15s ease;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .form-group input::placeholder {
          color: var(--text-muted);
        }

        .search-input {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-preview {
          background: var(--bg-secondary);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border-left: 3px solid var(--primary);
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }

        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: var(--gradient-primary);
          color: var(--bg-primary);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 100%;
        }

        .btn-primary:hover {
          box-shadow: var(--shadow-glow);
          transform: translateY(-1px);
        }

        .power-control-section {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid var(--border-color);
        }

        .room-details {
          background: var(--bg-secondary);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .room-details h4 {
          color: var(--text-primary);
          margin: 0 0 0.75rem 0;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .detail-value {
          color: var(--text-primary);
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .management-grid {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default ManagementPanel;
