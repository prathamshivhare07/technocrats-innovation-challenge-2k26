import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CommandCenter } from './components/CommandCenter';
import { GraphWorkspace } from './components/GraphWorkspace';

function App() {
  const [currentView, setCurrentView] = useState('command');
  const [focusNodeId, setFocusNodeId] = useState(null);

  const goToGraphWithFocus = (nodeId) => {
    setFocusNodeId(nodeId);
    setCurrentView('graph');
  };

  // We are cheating the routing here just for the quick PoC demonstration 
  // since the user wants to see it working immediately without setting up full react-router
  
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', minHeight: '100vh', width: '100vw', backgroundColor: 'var(--background)' }}>
      <div style={{ width: '250px', backgroundColor: 'var(--surface-lowest)', borderRight: '1px solid var(--outline-variant)', minHeight: '100vh', padding: 'var(--spacing-4)' }}>
        <h2 className="headline-md" style={{ color: 'var(--primary)', marginBottom: 'var(--spacing-8)' }}>NeuralTrace</h2>
        <nav className="flex-col" style={{ gap: 'var(--spacing-4)' }}>
          <button 
            onClick={() => setCurrentView('command')}
            style={{ 
              background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
              color: currentView === 'command' ? 'var(--on-surface)' : 'var(--on-surface-variant)', 
              fontWeight: currentView === 'command' ? 600 : 500 
            }}>
            Command Center
          </button>
          <button 
            onClick={() => setCurrentView('graph')}
            style={{ 
              background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
              color: currentView === 'graph' ? 'var(--on-surface)' : 'var(--on-surface-variant)', 
              fontWeight: currentView === 'graph' ? 600 : 500 
            }}>
            Graph Investigation
          </button>
        </nav>
      </div>
      
      {currentView === 'command' ? <CommandCenter onOpenGraph={goToGraphWithFocus} /> : <GraphWorkspace initialFocusNode={focusNodeId} />}
    </div>
  );
}

export default App;
