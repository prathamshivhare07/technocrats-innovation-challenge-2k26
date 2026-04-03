import React from 'react';

export function Sidebar() {
  return (
    <div style={{ width: '250px', backgroundColor: 'var(--surface-lowest)', borderRight: '1px solid var(--outline-variant)', minHeight: '100vh', padding: 'var(--spacing-4)' }}>
      <h2 className="headline-md" style={{ color: 'var(--primary)', marginBottom: 'var(--spacing-8)' }}>Sentinel</h2>
      <nav className="flex-col" style={{ gap: 'var(--spacing-4)' }}>
        <a href="/" style={{ color: 'var(--on-surface)', textDecoration: 'none', fontWeight: 600 }}>Command Center</a>
        <a href="/graph" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontWeight: 500 }}>Graph Investigation</a>
        <a href="#" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontWeight: 500 }}>FIU Reports</a>
        <a href="#" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none', fontWeight: 500 }}>Settings</a>
      </nav>
    </div>
  );
}
