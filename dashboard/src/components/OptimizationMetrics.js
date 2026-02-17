import React from 'react';

function OptimizationMetrics({ data }) {
  if (!data) return null;

  const formatNumber = (value) => {
    return typeof value === 'number' ? value.toLocaleString() : value;
  };

  const formatCurrency = (value) => {
    return typeof value === 'number' ? `₹${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : value;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          Optimization Savings
        </h2>
        <span className="badge success">Active</span>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="metric">
            <div className="metric-label">Total Optimizations</div>
            <div className="metric-value success">
              {formatNumber(data.total_optimizations)}
            </div>
          </div>

          <div className="metric">
            <div className="metric-label">Energy Saved</div>
            <div className="metric-value" style={{ color: 'var(--accent-yellow)' }}>
              {formatNumber(data.energy_saved_kwh)}
              <span className="metric-unit">kWh</span>
            </div>
          </div>

          <div className="metric">
            <div className="metric-label">Cost Saved</div>
            <div className="metric-value warning">
              {formatCurrency(data.cost_saved_inr)}
            </div>
          </div>

          <div className="metric">
            <div className="metric-label">CO₂ Reduced</div>
            <div className="metric-value success">
              {formatNumber(data.co2_reduced_kg)}
              <span className="metric-unit">kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OptimizationMetrics;
