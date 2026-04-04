import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function CommandCenter({ onOpenGraph }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all the different analytical patterns we built!
        const [layeringRes, circularRes, structuringRes, flaggedRes] = await Promise.all([
          fetch(`${API_URL}/api/detect/layering`),
          fetch(`${API_URL}/api/detect/circular`),
          fetch(`${API_URL}/api/detect/structuring`),
          fetch(`${API_URL}/api/detect/flagged`)
        ]);

        const layering = await layeringRes.json();
        const circular = await circularRes.json();
        const structuring = await structuringRes.json();
        const flagged = await flaggedRes.json();

        const formattedAlerts = [];

        // Format Layering
        layering.forEach((item, i) => {
          formattedAlerts.push({
            id: `lay-${i}`, type: 'Rapid Layering',
            source: item.path[0], target: item.path[item.path.length - 1],
            amount: `$${item.initial.toLocaleString()} -> $${item.final.toLocaleString()}`,
            risk: 'Critical'
          });
        });

        // Format Circular
        circular.forEach((item, i) => {
          formattedAlerts.push({
            id: `circ-${i}`, type: 'Round-Tripping',
            source: item.path[0], target: item.path[item.path.length - 1],
            amount: `$${item.volume.toLocaleString()}`,
            risk: 'High'
          });
        });

        // Format Structuring
        structuring.forEach((item, i) => {
          formattedAlerts.push({
            id: `struc-${i}`, type: 'Structuring',
            source: item.source, target: item.destination,
            amount: `$${item.total.toLocaleString()} (${item.count}x)`,
            risk: 'High'
          });
        });

        // Format Flagged (From CSV)
        flagged.forEach((item, i) => {
          formattedAlerts.push({
            id: `flag-${i}`, type: 'Directly Flagged Transfer',
            source: item.source, target: item.destination,
            amount: `$${item.amount.toLocaleString()}`,
            risk: 'Critical'
          });
        });

        setAlerts(formattedAlerts);
        setLoading(false);
      } catch (e) {
        console.error("API Error", e);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div style={{ padding: 'var(--spacing-8)', flex: 1, backgroundColor: '#0f0f14', color: '#e2e8f0', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--spacing-8)' }}>
        <div>
          <h1 className="headline-lg" style={{ margin: 0, background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NeuralTrace Command</h1>
          <div style={{ color: '#94a3b8', marginTop: 'var(--spacing-2)' }}>Centralized intelligence and data orchestration</div>
        </div>
        <button 
          onClick={async () => {
             const confirmed = window.confirm("Are you sure you want to VANISH the entire Graph Database? This action cannot be undone.");
             if (!confirmed) return;
             try {
                 const res = await fetch(`${API_URL}/api/clear`, { method: "DELETE" });
                 if (res.ok) {
                     alert("Database successfully vanished! You can now upload a new CSV.");
                     window.location.reload(); 
                 }
             } catch (e) {
                 alert("Error connecting to backend.");
             }
          }}
          style={{
            backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px',
            padding: '10px 20px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
          }}
          onMouseOver={(e) => { e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.target.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.4)'; }}
          onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
        >
          🧹 Deep Clean Database
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--spacing-6)' }}>
        
        {/* Top left Stats */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: 'var(--spacing-6)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Algorithmic Alerts</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f87171' }}>{loading ? '...' : alerts.length}</div>
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>▲ Requires immediate review</div>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
            <div style={{ flex: 1, background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: 'var(--spacing-5)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Neo4j Status</div>
              <div style={{ color: '#4ade80', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%' }}></span>
                Connected
              </div>
            </div>
            <div style={{ flex: 1, background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: 'var(--spacing-5)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>AI Engine</div>
              <div style={{ color: '#60a5fa', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#60a5fa', borderRadius: '50%' }}></span>
                Online
              </div>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.background = 'rgba(96, 165, 250, 0.05)'; }}
            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(30, 41, 59, 0.3)'; }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.3)';
              const file = e.dataTransfer.files[0];
              if (file && file.name.endsWith('.csv')) {
                e.currentTarget.querySelector('p').innerText = "Uploading to Neo4j...";
                const formData = new FormData();
                formData.append("file", file);
                try {
                  const res = await fetch(`${API_URL}/api/upload-csv`, { method: "POST", body: formData });
                  if (res.ok) {
                    const data = await res.json();
                    e.currentTarget.querySelector('p').innerText = `Success! ${data.message}`;
                    setTimeout(() => window.location.reload(), 1500);
                  } else {
                    e.currentTarget.querySelector('p').innerText = "Upload failed.";
                  }
                } catch (err) {
                  e.currentTarget.querySelector('p').innerText = "Backend disconnected.";
                }
              } else {
                e.currentTarget.querySelector('p').innerText = "Invalid file. CSV required.";
              }
            }}
            style={{
              flex: 1, minHeight: '180px',
              background: 'rgba(30, 41, 59, 0.3)', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', transition: 'all 0.2s ease', cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontWeight: 500 }}>Upload CSV Batch</h3>
            <p className="body-sm" style={{ marginTop: '8px' }}>Drag and drop new mock data here.</p>
          </div>
        </div>

        {/* Right side Alerts Grid */}
        <div style={{ gridColumn: 'span 8', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: 'var(--spacing-6)', boxShadow: '0 4px 30px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 150px)' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: '0 0 var(--spacing-4) 0', fontWeight: 600 }}>Suspicious Activity Report</h2>
          
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>Running neural cypher analysis...</div>
            ) : alerts.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>Platform secure. No anomalies detected.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px 8px', fontWeight: 500 }}>Signal Type</th>
                    <th style={{ padding: '12px 8px', fontWeight: 500 }}>Vector</th>
                    <th style={{ padding: '12px 8px', fontWeight: 500 }}>Value</th>
                    <th style={{ padding: '12px 8px', fontWeight: 500 }}>Severity</th>
                    <th style={{ padding: '12px 8px', fontWeight: 500 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding: '16px 8px', color: '#e2e8f0', fontWeight: 500 }}>{a.type}</td>
                      <td style={{ padding: '16px 8px', color: '#94a3b8', fontSize: '0.9rem' }}>{a.source} → {a.target}</td>
                      <td style={{ padding: '16px 8px', color: '#f1f5f9', fontWeight: 600 }}>{a.amount}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: a.risk === 'Critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: a.risk === 'Critical' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${a.risk === 'Critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`
                        }}>{a.risk}</span>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <button 
                          onClick={() => onOpenGraph(a.source)}
                          style={{
                            background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.2)',
                            borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => { e.target.style.background = '#60a5fa'; e.target.style.color = '#fff'; }}
                          onMouseOut={e => { e.target.style.background = 'rgba(96, 165, 250, 0.1)'; e.target.style.color = '#60a5fa'; }}
                        >
                          Trace
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
