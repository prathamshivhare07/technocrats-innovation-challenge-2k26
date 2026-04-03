import React, { useEffect, useState } from 'react';

export function CommandCenter({ onOpenGraph }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all the different analytical patterns we built!
        const [layeringRes, circularRes, structuringRes] = await Promise.all([
          fetch('http://localhost:8000/api/detect/layering'),
          fetch('http://localhost:8000/api/detect/circular'),
          fetch('http://localhost:8000/api/detect/structuring')
        ]);

        const layering = await layeringRes.json();
        const circular = await circularRes.json();
        const structuring = await structuringRes.json();

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
    <div style={{ padding: 'var(--spacing-6)', flex: 1, backgroundColor: 'var(--background)' }}>
      <h1 className="headline-lg" style={{ marginBottom: 'var(--spacing-4)' }}>Command Center</h1>

      <div className="flex-row" style={{ gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-8)' }}>
        <div className="card-elevated" style={{ flex: 1 }}>
          <div className="label-sm">Algorithmic Alerts</div>
          <div className="headline-md" style={{ color: 'var(--error)' }}>{loading ? '...' : alerts.length} active</div>
        </div>
        <div className="card-elevated" style={{ flex: 1 }}>
          <div className="label-sm">Neo4j Database</div>
          <div className="headline-md" style={{ color: 'var(--primary)' }}>Connected</div>
        </div>
        <div className="card-elevated" style={{ flex: 1 }}>
          <div className="label-sm">Analytics Engine</div>
          <div className="headline-md" style={{ color: 'var(--on-surface)' }}>Online</div>
        </div>
      </div>

      {/* CSV DROPZONE */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--outline-variant)'; }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = 'var(--outline-variant)';
          const file = e.dataTransfer.files[0];
          if (file && file.name.endsWith('.csv')) {
            e.currentTarget.querySelector('p').innerText = "Uploading...";
            const formData = new FormData();
            formData.append("file", file);
            try {
              const res = await fetch("http://localhost:8000/api/upload-csv", { method: "POST", body: formData });
              if (res.ok) {
                const data = await res.json();
                e.currentTarget.querySelector('p').innerText = "Success! " + data.message + " (Navigate to Graph Investigation to see latest data via local Neo4j Server)";
              } else {
                e.currentTarget.querySelector('p').innerText = "Error uploading file. Check api log.";
              }
            } catch (err) {
              e.currentTarget.querySelector('p').innerText = "Failed to connect to server backend.";
            }
          } else {
            e.currentTarget.querySelector('p').innerText = "Invalid file format. Drop a CSV.";
          }
        }}
        style={{
          border: '2px dashed var(--outline-variant)', borderRadius: '8px', padding: 'var(--spacing-6)',
          textAlign: 'center', marginBottom: 'var(--spacing-8)', color: 'var(--on-surface-variant)',
          transition: 'border 0.2s ease-in-out'
        }}
      >
        <h3 className="headline-sm">Drop Mock CSV Here</h3>
        <p className="body-sm">Drag and drop generated CSV map to test custom bulk ingestion pipeline.</p>
      </div>

      <h2 className="headline-md" style={{ marginBottom: 'var(--spacing-4)' }}>Suspicious Patterns Detection</h2>
      <div className="card">
        {loading ? (
          <div style={{ padding: 'var(--spacing-4)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Running Cypher Graph Algorithms...</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 'var(--spacing-4)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No suspicious patterns detected.</div>
        ) : (
          alerts.map(a => (
            <div key={a.id} className="flex-row" style={{ padding: 'var(--spacing-2) 0', borderBottom: '1px solid var(--surface-highest)' }}>
              <div style={{ flex: 2, fontWeight: 600 }}>{a.type}</div>
              <div style={{ flex: 2, color: 'var(--on-surface-variant)' }}>{a.source} → {a.target}</div>
              <div style={{ flex: 1 }}>{a.amount}</div>
              <div style={{ flex: 1 }}>
                <span className={a.risk === 'Critical' ? 'badge-critical' : 'badge-info'}>{a.risk}</span>
              </div>
              <div>
                <button className="btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => onOpenGraph(a.source)}>Open Graph</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
