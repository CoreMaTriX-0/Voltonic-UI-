import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { dashboardAPI } from '../api';

function EnergyFlowDiagram() {
    const [buildings, setBuildings] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedFaculty, setSelectedFaculty] = useState(null);

    const [energyFlow, setEnergyFlow] = useState(null); // For single building
    const [facultyData, setFacultyData] = useState(null); // For faculty aggregation

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [energySources, setEnergySources] = useState([]);

    const containerRef = useRef(null);

    // Grouping mapping
    const FACULTY_ABBR = {
        "Faculty of Engineering": "FoE",
        "Faculty of Science": "FoS",
        "Faculty of Arts": "FoA",
        "Faculty of Commerce": "FoC"
    };

    const SOURCE_COLORS = {
        grid: 'var(--secondary)', // green
        solar: 'var(--accent-yellow)', // yellow
        diesel: 'var(--danger)' // red
    };

    const updateDimensions = () => {
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            setDimensions({
                width: clientWidth,
                height: clientHeight
            });
        }
    };

    useLayoutEffect(() => {
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        const observer = new ResizeObserver(updateDimensions);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', updateDimensions);
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        fetchBuildings();
        fetchEnergySources();
    }, []);

    // Poll for Building Data
    useEffect(() => {
        if (selectedBuilding) {
            fetchEnergyFlow(selectedBuilding);
            const interval = setInterval(() => fetchEnergyFlow(selectedBuilding), 5000);
            return () => clearInterval(interval);
        } else {
            setEnergyFlow(null);
        }
    }, [selectedBuilding]);

    // Poll for Faculty Data
    useEffect(() => {
        if (selectedFaculty) {
            fetchFacultyData(selectedFaculty);
            const interval = setInterval(() => fetchFacultyData(selectedFaculty), 5000);
            return () => clearInterval(interval);
        } else {
            setFacultyData(null);
        }
    }, [selectedFaculty]);


    const fetchBuildings = async () => {
        try {
            const response = await dashboardAPI.getBuildings();
            setBuildings(response.data.data);
            setLoading(false);
            setTimeout(updateDimensions, 100);
        } catch (err) {
            setError('Failed to load buildings');
            setLoading(false);
        }
    };

    const fetchEnergyFlow = async (buildingId) => {
        try {
            const response = await dashboardAPI.getBuildingEnergyFlow(buildingId);
            setEnergyFlow(response.data.data);
        } catch (err) {
            console.error('Failed to load energy flow:', err);
        }
    };

    const fetchEnergySources = async () => {
        try {
            const response = await dashboardAPI.getEnergySources();
            setEnergySources(response.data.data);
        } catch (err) {
            console.error('Failed to load energy sources:', err);
        }
    };

    const fetchFacultyData = async (facultyName) => {
        const facBuildings = buildings.filter(b => b.faculty_name === facultyName);

        if (facBuildings.length === 0) return;

        try {
            const promises = facBuildings.map(b => dashboardAPI.getBuildingEnergyFlow(b.id));
            const responses = await Promise.all(promises);

            let totalLoad = 0;
            const buildingStats = [];

            responses.forEach(res => {
                const data = res.data.data;
                totalLoad += data.total_load;
                buildingStats.push({
                    id: data.building_id,
                    name: data.building_name,
                    load: data.total_load
                });
            });

            setFacultyData({
                name: facultyName,
                total_load: totalLoad,
                buildings: buildingStats
            });

        } catch (err) {
            console.error("Failed to load faculty data", err);
        }
    };

    const handleBuildingClick = (buildingId) => {
        if (selectedBuilding === buildingId) {
            setSelectedBuilding(null);
        } else {
            setSelectedBuilding(buildingId);
            setSelectedFaculty(null); // Close faculty view
        }
    };

    const handleFacultyClick = (facultyName) => {
        if (selectedFaculty === facultyName) {
            setSelectedFaculty(null);
        } else {
            setSelectedFaculty(facultyName);
            setSelectedBuilding(null); // Close building view
        }
    };

    // Helper to expand building names (e.g., "FoE-B1" -> "Engineering Block 1")
    const expandBuildingName = (shortName) => {
        if (!shortName) return "";
        const [facAbbr, blockCode] = shortName.split('-');

        const facultMap = {
            "FoE": "Engineering",
            "FoS": "Science",
            "FoA": "Arts",
            "FoC": "Commerce"
        };

        const blockNum = blockCode ? blockCode.replace('B', '') : '';
        return `${facultMap[facAbbr] || facAbbr} - Block ${blockNum}`;
    };

    const [activeFloorIndex, setActiveFloorIndex] = useState(0);

    // Reset tab when building changes
    useEffect(() => {
        if (selectedBuilding) setActiveFloorIndex(0);
    }, [selectedBuilding]);

    const getSourceColor = (sourceName) => {
        if (!sourceName) return '#ccc';
        const source = energySources.find(s => s.name.toLowerCase() === sourceName.toLowerCase());
        // Fallback to hardcoded colors if API data doesn't have color info (it might not)
        // Or if we want to keep using the CSS variables mapping
        const s = sourceName.toLowerCase();
        return SOURCE_COLORS[s] || '#ff00ff';
    };

    if (loading) return <div className="loading">Loading diagram...</div>;
    if (error) return <div className="error">{error}</div>;

    // --- Layout Calculations ---

    const SIDEBAR_WIDTH = 450;
    const isSidebarOpen = !!selectedBuilding || !!selectedFaculty;

    let availableWidth = dimensions.width;
    if (isSidebarOpen) {
        availableWidth = dimensions.width - SIDEBAR_WIDTH;
    }

    const centerX = availableWidth / 2;
    const centerY = dimensions.height / 2;

    const minDim = Math.min(availableWidth, dimensions.height);

    // Faculty Radius currently ~32% -> Reduced to 30%
    const rFaculty = minDim * 0.30;
    // Building Radius ~16% -> Increased to 19%
    const rBuilding = minDim * 0.19;


    // Calculate source nodes dynamically
    const sourceNodes = energySources.map((source, index) => {
        // Simple mapping for icons based on name
        let icon = '⚡';
        const name = source.name.toLowerCase();
        if (name.includes('solar')) icon = '☀️';
        if (name.includes('diesel') || name.includes('generator')) icon = '🛢️';
        if (name.includes('grid')) icon = '⚡';

        // Calculate offset to center them
        // Total width approx = (count-1) * spacing
        // Start = -totalWidth / 2
        // spacing = 90
        const spacing = 90;
        const totalWidth = (energySources.length - 1) * spacing;
        const startX = -totalWidth / 2;
        const xOffset = startX + (index * spacing);

        return {
            id: name, // Use name as ID for matching
            label: source.name,
            color: SOURCE_COLORS[name] || '#999',
            icon: icon,
            xOffset: xOffset
        };
    });

    // Group buildings
    const groupedBuildings = buildings.reduce((acc, b) => {
        const fac = b.faculty_name || "Other";
        if (!acc[fac]) acc[fac] = { buildings: [], sources: new Set() };

        acc[fac].buildings.push(b);

        // Aggregate actual active sources from buildings
        if (b.active_sources && b.active_sources.length > 0) {
            b.active_sources.forEach(s => acc[fac].sources.add(s));
        }
        // REMOVED FALLBACK: If no active sources, we show nothing.

        return acc;
    }, {});

    const facultyNames = Object.keys(groupedBuildings);

    const nodes = [];
    const links = [];

    // Calculate Nodes & Links
    facultyNames.forEach((facName, i) => {
        const groupData = groupedBuildings[facName];

        // Distribute Faculties
        const angle = (i / facultyNames.length) * 2 * Math.PI - Math.PI / 4;
        const fx = centerX + rFaculty * Math.cos(angle);
        const fy = centerY + rFaculty * Math.sin(angle);

        // Faculty Node
        nodes.push({
            type: 'faculty',
            id: `fac-${facName}`,
            name: FACULTY_ABBR[facName] || facName,
            fullName: facName,
            x: fx, y: fy
        });

        // Connections: Source -> Faculty (Iterate all active sources)
        sourceNodes.forEach(source => {
            if (groupData.sources.has(source.id)) {
                const sx = centerX + source.xOffset;
                const sy = centerY;

                links.push({
                    id: `link-${source.id}-${facName}`,
                    x1: sx, y1: sy,
                    x2: fx, y2: fy,
                    color: source.color,
                    type: 'primary'
                });
            }
        });

        // Buildings
        const facBuildings = groupData.buildings;
        facBuildings.forEach((b, j) => {
            // WIDENED SPREAD: PI/1.4 to fix overlap
            const spreadAngle = Math.PI / 1.4;
            const startAngle = angle - spreadAngle / 2;
            const bAngle = startAngle + (j / (facBuildings.length - 1 || 1)) * spreadAngle;

            const bx = fx + rBuilding * Math.cos(bAngle);
            const by = fy + rBuilding * Math.sin(bAngle);

            // Multi-Line Connection Logic - Use specific building sources
            const buildingSources = b.active_sources && b.active_sources.length > 0
                ? b.active_sources
                : []; // No fallback to grid

            const totalLinkWidth = (buildingSources.length - 1) * 4; // 4px spacing

            // Calculate Normal Vector for offsets
            const dx = bx - fx;
            const dy = by - fy;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / len;
            const uy = dy / len;
            const nx = -uy; // Perpendicular vector
            const ny = ux;

            buildingSources.forEach((sourceId, sIndex) => {
                // Calculate offset: Centered around 0
                // e.g., 2 items: -2, +2.  3 items: -4, 0, +4.
                const offsetStep = 4;
                const currentOffset = (sIndex - (buildingSources.length - 1) / 2) * offsetStep;

                const offX = nx * currentOffset;
                const offY = ny * currentOffset;

                links.push({
                    id: `link-${facName}-${b.id}-${sourceId}`,
                    x1: fx + offX, y1: fy + offY,
                    x2: bx + offX, y2: by + offY,
                    color: SOURCE_COLORS[sourceId],
                    type: 'secondary',
                    active: selectedBuilding === b.id
                });
            });

            nodes.push({
                type: 'building',
                id: b.id,
                data: b,
                x: bx, y: by
            });
        });
    });

    const hasDimensions = dimensions.width > 0 && dimensions.height > 0;

    return (
        <div className="energy-flow-page" ref={containerRef}>
            {hasDimensions && (
                <div className="diagram-container">
                    <svg className="connections-layer" width={dimensions.width} height={dimensions.height}>
                        <defs>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {links.map(link => (
                            <path
                                key={link.id}
                                d={`M ${link.x1} ${link.y1} L ${link.x2} ${link.y2}`}
                                className={`connection-line ${link.type} ${link.active ? 'active' : ''}`}
                                stroke={link.color}
                                fill="none"
                                style={{
                                    strokeWidth: link.type === 'primary' ? 3 : 2,
                                    filter: 'url(#glow)'
                                }}
                            />
                        ))}
                    </svg>

                    {/* Source Stack */}
                    <div className="source-stack-container" style={{ left: centerX, top: centerY }}>
                        {sourceNodes.map(source => (
                            <div
                                key={source.id}
                                className="source-node"
                                style={{ borderColor: source.color }}
                            >
                                <span className="source-icon-sm">{source.icon}</span>
                                <span className="source-label-sm">{source.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Render Nodes */}
                    {nodes.map(node => {
                        if (node.type === 'faculty') {
                            const isSelected = selectedFaculty === node.fullName;
                            return (
                                <div
                                    key={node.id}
                                    className={`faculty-node ${isSelected ? 'selected' : ''}`}
                                    style={{ left: node.x, top: node.y }}
                                    onClick={() => handleFacultyClick(node.fullName)}
                                >
                                    <span className="faculty-label">{node.name}</span>
                                </div>
                            );
                        } else {
                            const b = node.data;
                            return (
                                <div
                                    key={node.id}
                                    className={`building-node ${selectedBuilding === b.id ? 'selected' : ''}`}
                                    style={{ left: node.x, top: node.y }}
                                    onClick={() => handleBuildingClick(b.id)}
                                >
                                    <div className="building-icon">🏢</div>
                                    <div className="building-label">{b.name}</div>
                                </div>
                            );
                        }
                    })}
                </div>
            )}

            {/* DETAIL SIDEBAR */}
            <div className={`detail-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                {/* Sidebar content same as before ... keeping concise */}
                {selectedFaculty && facultyData && (
                    <>
                        <div className="sidebar-header">
                            <button className="close-btn" onClick={() => setSelectedFaculty(null)}>×</button>
                            <h3>{facultyData.name}</h3>
                        </div>
                        <div className="sidebar-content">
                            <div className="kpi-card">
                                <div className="kpi-label">Total Faculty Load</div>
                                <div className="kpi-value">{facultyData.total_load.toFixed(2)} kW</div>
                            </div>
                            <h4>Buildings Breakdown</h4>
                            <div className="floors-list">
                                {facultyData.buildings.map(b => (
                                    <div key={b.id} className="floor-item" onClick={() => handleBuildingClick(b.id)} style={{ cursor: 'pointer' }}>
                                        <div className="floor-summary" style={{ border: 'none', marginBottom: 0 }}>
                                            <h4>{b.name}</h4>
                                            <span>{b.load.toFixed(2)} kW</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                {selectedBuilding && energyFlow && (
                    <>
                        <div className="sidebar-header">
                            <button className="close-btn" onClick={() => setSelectedBuilding(null)}>×</button>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{expandBuildingName(energyFlow.building_name)}</h3>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{energyFlow.building_name}</span>
                            </div>
                        </div>
                        <div className="sidebar-content">
                            <div className="kpi-card">
                                <div className="kpi-label">Total Load</div>
                                <div className="kpi-value">{energyFlow.total_load.toFixed(2)} kW</div>
                            </div>

                            {/* Floor Tabs */}
                            <div className="tabs" style={{ marginBottom: '1rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                {energyFlow.floors.map((floor, index) => (
                                    <button
                                        key={floor.floor_id}
                                        className={activeFloorIndex === index ? 'active' : ''}
                                        onClick={() => setActiveFloorIndex(index)}
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem',
                                            fontSize: '0.85rem',
                                            whiteSpace: 'nowrap',
                                            background: activeFloorIndex === index ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                                            color: activeFloorIndex === index ? 'var(--bg-primary)' : 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Floor {floor.floor_number}
                                    </button>
                                ))}
                            </div>

                            {/* Active Floor Content */}
                            {energyFlow.floors[activeFloorIndex] && (
                                <div className="floor-item animate-fade-in">
                                    <div className="floor-summary">
                                        <h4>Floor {energyFlow.floors[activeFloorIndex].floor_number} Summary</h4>
                                        <span>{energyFlow.floors[activeFloorIndex].total_load.toFixed(2)} kW</span>
                                    </div>
                                    <div className="rooms-mini-grid">
                                        {energyFlow.floors[activeFloorIndex].rooms.map(room => (
                                            <div key={room.room_id} className="room-mini-card">
                                                <div className="room-status-indicator"
                                                    title={`Source: ${room.energy_source}`}
                                                    style={{
                                                        backgroundColor: getSourceColor(room.energy_source),
                                                        boxShadow: `0 0 8px ${getSourceColor(room.energy_source)}`
                                                    }} />
                                                <span className="room-mini-name">{room.room_name}</span>
                                                <span className="room-mini-val">{room.total_load.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
                {isSidebarOpen && !selectedBuilding && !selectedFaculty && (
                    <div className="empty-state"><p>Select an item</p></div>
                )}
                {(selectedFaculty && !facultyData) || (selectedBuilding && !energyFlow) ? (
                    <div className="empty-state"><p>Loading details...</p></div>
                ) : null}
            </div>

            <style jsx>{`
        .energy-flow-page {
          width: 100%;
          height: calc(100vh - 120px);
          position: relative;
          background: var(--bg-primary);
          overflow: hidden;
          display: flex;
        }

        .diagram-container {
          flex: 1;
          position: relative;
          width: 100%;
          height: 100%;
          transition: width 0.4s ease; 
        }

        .connections-layer {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 0;
        }

        .connection-line {
          stroke-dasharray: 10, 5, 2, 5;
          stroke-dashoffset: 0;
          animation: electricFlow 0.4s linear infinite;
          opacity: 0.6;
          transition: stroke-width 0.3s;
        }
        
        .connection-line.active {
          opacity: 1;
          animation: electricFlow 0.15s linear infinite;
          stroke-width: 4 !important;
        }

        @keyframes electricFlow {
          0% { stroke-dashoffset: 22; }
          100% { stroke-dashoffset: 0; }
        }

        .source-stack-container {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          gap: 15px;
          z-index: 10;
          transition: left 0.4s ease;
        }

        .source-node {
            width: 60px;
            height: 60px;
            background: var(--bg-card);
            border: 2px solid;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 15px rgba(0,0,0,0.5);
            transition: transform 0.2s;
        }
        
        .source-node:hover { transform: scale(1.15); }
        .source-icon-sm { font-size: 1.5rem; }
        .source-label-sm { font-size: 0.7rem; font-weight: 700; color: var(--text-primary); margin-top: 2px; }

        .faculty-node {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 70px; /* Reduced from 80 */
          height: 70px; /* Reduced from 80 */
          border-radius: 50%;
          background: var(--bg-secondary);
          border: 3px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 15; 
          box-shadow: 0 0 25px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .faculty-node:hover {
            border-color: var(--accent-yellow);
            transform: translate(-50%, -50%) scale(1.1);
        }

        .faculty-node.selected {
            border-color: var(--accent-yellow);
            box-shadow: 0 0 30px rgba(255, 191, 0, 0.4);
            background: var(--bg-card);
        }
        
        .faculty-label { font-size: 1rem; font-weight: 800; color: var(--text-secondary); text-align: center; }

        .building-node {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 75px; /* Increased from 55 */
          height: 75px; /* Increased from 55 */
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 15;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .building-node:hover {
          transform: translate(-50%, -50%) scale(1.2);
          border-color: var(--accent-yellow);
          box-shadow: 0 0 15px rgba(255, 191, 0, 0.5);
        }

        .building-node.selected {
           border-color: var(--accent-yellow);
           background: var(--bg-secondary);
           box-shadow: 0 0 20px rgba(255, 191, 0, 0.6);
           z-index: 20;
        }

        .building-icon { font-size: 1.4rem; }
        .building-label { font-size: 0.7rem; color: var(--text-primary); font-weight: 700; text-align: center; line-height: 1; margin-top: 2px; }

        .detail-sidebar {
          position: absolute;
          right: -450px;
          top: 0;
          width: 450px;
          height: 100%;
          background: var(--bg-card); /* Changed from hardcoded dark rgba */
          backdrop-filter: blur(15px);
          border-left: 1px solid var(--border-color);
          transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 50;
          display: flex;
          flex-direction: column;
        }

        .detail-sidebar.open {
          right: 0;
          box-shadow: var(--shadow-lg); /* Changed from hardcoded shadow */
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
        }
        
        .sidebar-content { flex: 1; overflow-y: auto; padding: 1.5rem; }
        
        .kpi-card {
           background: var(--bg-card);
           padding: 1.2rem;
           border-radius: 12px;
           margin-bottom: 1.5rem;
           border: 1px solid var(--border-color);
           text-align: center;
           box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .kpi-value { color: var(--accent-yellow); font-size: 2rem; font-weight: 700; }
        
        .floors-list { display: flex; flex-direction: column; gap: 1rem; }
        
        .floor-item {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid var(--border-color);
          transition: background 0.2s;
        }
        
        .floor-item:hover { background: var(--bg-card); }

        .floor-summary {
          display: flex; justify-content: space-between; margin-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;
        }
        
        .rooms-mini-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
        
        .room-mini-card {
          background: var(--bg-card); padding: 0.75rem; border-radius: 6px;
          display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem;
          border: 1px solid transparent;
        }
        
        .room-status-indicator { width: 10px; height: 10px; border-radius: 50%; }
        .room-mini-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary); }
        .room-mini-val { font-weight: 600; }
        
        .empty-state { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); }
      `}</style>
        </div>
    );
}

export default EnergyFlowDiagram;
