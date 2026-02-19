import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

function AnalyticsCharts() {
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [campusHistory, setCampusHistory] = useState([]);
  const [timeRange, setTimeRange] = useState({ hourly: 24, daily: 7, history: 24 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchAllData, 5000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAllData = async () => {
    try {
      const [hourlyRes, dailyRes, historyRes] = await Promise.all([
        dashboardAPI.getHourlyAnalytics(timeRange.hourly),
        dashboardAPI.getDailyAnalytics(timeRange.daily),
        dashboardAPI.getCampusHistory(timeRange.history)
      ]);

      setHourlyData(hourlyRes.data.data || []);
      setDailyData(dailyRes.data.data || []);
      setCampusHistory(historyRes.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && hourlyData.length === 0) {
    return <div className="loading">Loading analytics</div>;
  }

  if (error && hourlyData.length === 0) {
    return <div className="error">Error: {error}</div>;
  }

  const formatHourlyData = () => {
    return hourlyData.map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      consumption: parseFloat(item.total_consumption_kwh?.toFixed(2) || 0),
      avgLoad: parseFloat(item.avg_load_kw?.toFixed(2) || 0),
      maxLoad: parseFloat(item.max_load_kw?.toFixed(2) || 0)
    })).reverse();
  };

  const formatDailyData = () => {
    return dailyData.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      consumption: parseFloat(item.total_consumption_kwh?.toFixed(2) || 0),
      avgLoad: parseFloat(item.avg_load_kw?.toFixed(2) || 0),
      peakLoad: parseFloat(item.peak_load_kw?.toFixed(2) || 0)
    })).reverse();
  };

  const formatCampusHistory = () => {
    return campusHistory.map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      load: parseFloat(item.total_load_kw?.toFixed(2) || 0),
      temperature: parseFloat(item.avg_temperature?.toFixed(1) || 0),
      occupied: item.occupied_rooms || 0,
      optimized: item.optimized_rooms || 0
    })).reverse();
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.875rem 1rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <p style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '0.25rem 0', fontSize: '0.8rem' }}>
              {entry.name}: <strong>{entry.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-view">
      {/* Hourly Consumption */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">

            Hourly Energy Consumption
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${timeRange.hourly === 12 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeRange({ ...timeRange, hourly: 12 })}
            >
              12h
            </button>
            <button
              className={`btn ${timeRange.hourly === 24 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeRange({ ...timeRange, hourly: 24 })}
            >
              24h
            </button>
            <button
              className={`btn ${timeRange.hourly === 48 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeRange({ ...timeRange, hourly: 48 })}
            >
              48h
            </button>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={formatHourlyData()}>
              <defs>
                <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'var(--text-secondary)', paddingTop: '1rem' }} />
              <Area
                type="monotone"
                dataKey="consumption"
                stroke="#0EA5E9"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConsumption)"
                name="Consumption (kWh)"
              />
              <Line type="monotone" dataKey="avgLoad" stroke="#10B981" strokeWidth={2} name="Avg Load (kW)" dot={false} />
              <Line type="monotone" dataKey="maxLoad" stroke="#EF4444" strokeWidth={2} name="Max Load (kW)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">

            Daily Energy Summary
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${timeRange.daily === 7 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeRange({ ...timeRange, daily: 7 })}
            >
              7 days
            </button>
            <button
              className={`btn ${timeRange.daily === 14 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeRange({ ...timeRange, daily: 14 })}
            >
              14 days
            </button>
            <button
              className={`btn ${timeRange.daily === 30 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeRange({ ...timeRange, daily: 30 })}
            >
              30 days
            </button>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formatDailyData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend wrapperStyle={{ color: 'var(--text-secondary)', paddingTop: '1rem' }} />
              <Bar dataKey="consumption" fill="#10B981" name="Total Consumption (kWh)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="peakLoad" fill="#0EA5E9" name="Peak Load (kW)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campus History */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">

            Campus Load History
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${timeRange.history === 6 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeRange({ ...timeRange, history: 6 })}
            >
              6h
            </button>
            <button
              className={`btn ${timeRange.history === 24 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeRange({ ...timeRange, history: 24 })}
            >
              24h
            </button>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formatCampusHistory()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="left" stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: 'var(--text-secondary)', paddingTop: '1rem' }} />
              <Line yAxisId="left" type="monotone" dataKey="load" stroke="#0EA5E9" strokeWidth={2} name="Total Load (kW)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#F59E0B" strokeWidth={2} name="Avg Temp (°C)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="occupied" stroke="#8B5CF6" strokeWidth={2} name="Occupied Rooms" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="optimized" stroke="#34D399" strokeWidth={2} name="Optimized Rooms" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsCharts;
