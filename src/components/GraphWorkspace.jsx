import React, { useEffect, useState, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

export function GraphWorkspace({ initialFocusNode }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [alerts, setAlerts] = useState([]);
  const [detectedNodes, setDetectedNodes] = useState(new Set());
  const [detectedEdges, setDetectedEdges] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  const displayGraphData = React.useMemo(() => {
    if (!isFocusMode || !graphData.nodes.length) return graphData;

    const filteredNodes = graphData.nodes.filter(n => n.group === 1 || detectedNodes.has(n.id));
    const finalNodeIds = new Set(filteredNodes.map(n => n.id));
    
    const filteredLinks = graphData.links.filter(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return finalNodeIds.has(srcId) && finalNodeIds.has(tgtId);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [isFocusMode, graphData, detectedNodes]);
  
  // Calculate dynamic WebGL width: window width - 250px (left sidebar) - 300px (right sidebar)
  const [graphWidth, setGraphWidth] = useState(window.innerWidth - 550);
  const fgRef = useRef();

  useEffect(() => {
    const handleResize = () => setGraphWidth(window.innerWidth - 550);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Load Neo4j graph nodes and edges
    fetch('http://localhost:8000/api/graph')
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(console.error);
      
    // Load ML detected patterns (like CommandCenter) to list as single alerts
    Promise.all([
      fetch('http://localhost:8000/api/detect/layering').then(r => r.json()),
      fetch('http://localhost:8000/api/detect/circular').then(r => r.json()),
      fetch('http://localhost:8000/api/detect/structuring').then(r => r.json())
    ]).then(([layering, circular, structuring]) => {
      const formattedAlerts = [];
      const dNodes = new Set();
      const dEdges = new Set();

      layering.forEach((item, i) => {
        formattedAlerts.push({
          id: `lay-${i}`, type: 'Rapid Layering Alert', summary: `Chain spanning ${item.path.length} accounts`, rootNode: item.path[0]
        });
        item.path.forEach((n, idx) => {
          dNodes.add(n);
          if (idx < item.path.length - 1) dEdges.add(`${n}-${item.path[idx+1]}`);
        });
      });

      // Deduplicate Round-Tripping (A->B->C is same as B->C->A)
      const seenCycles = new Set();
      circular.forEach((item, i) => {
        const signature = [...item.path].sort().join('-');
        if (!seenCycles.has(signature)) {
          seenCycles.add(signature);
          formattedAlerts.push({
            id: `circ-${i}`, type: 'Round-Tripping Alert', summary: `$${item.volume.toLocaleString()} cyclic pattern`, rootNode: item.path[0]
          });
          item.path.forEach((n, idx) => {
            dNodes.add(n);
            const next = idx === item.path.length - 1 ? item.path[0] : item.path[idx+1];
            dEdges.add(`${n}-${next}`);
          });
        }
      });

      structuring.forEach((item, i) => {
        formattedAlerts.push({
          id: `struc-${i}`, type: 'Structuring Alert', summary: `${item.count} transfers near threshold`, rootNode: item.source
        });
        dNodes.add(item.source);
        dNodes.add(item.destination);
        dEdges.add(`${item.source}-${item.destination}`);
      });
      
      setAlerts(formattedAlerts);
      setDetectedNodes(dNodes);
      setDetectedEdges(dEdges);
    }).catch(console.error);
  }, []);

  const handleNodeClick = (node) => {
    if (!node) return;
    setSelectedNode(node);
    
    // Camera zoom logic
    if (fgRef.current) {
      const distance = 40;
      const distRatio = 1 + distance/Math.hypot(node.x || 0, node.y || 0, node.z || 0);
      fgRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio }, 
        node, 
        2000  
      );
    }
  };

  const handleAlertClick = (rootNodeId) => {
    const node = graphData.nodes.find(n => n.id === rootNodeId);
    if (node) handleNodeClick(node);
  };

  useEffect(() => {
    if (initialFocusNode && graphData.nodes.length > 0) {
      // Small timeout allows the physics engine / graph structure to lay out before flying
      setTimeout(() => {
        handleAlertClick(initialFocusNode);
      }, 500);
    }
  }, [initialFocusNode, graphData.nodes]);

  const generateFIUPackage = () => {
    if (!selectedNode) return;

    let report = `====================================================\n`;
    report += `FINANCIAL INTELLIGENCE UNIT - EVIDENCE PACKAGE\n`;
    report += `====================================================\n\n`;
    report += `PRIMARY SUBJECT: ${selectedNode.id}\n`;
    report += `ENTITY TYPE: ${selectedNode.type || 'Unknown'}\n`;
    report += `KYC STATUS: ${selectedNode.kyc_status || 'Unknown'}\n\n`;
    
    // Identify if the node is the root of detected patterns
    const relatedAlerts = alerts.filter(a => a.rootNode === selectedNode.id);
    if (relatedAlerts.length > 0) {
      report += `[!] ALGORITHMIC THREAT DETECTION:\n`;
      relatedAlerts.forEach(a => {
        report += `- PATTERN: ${a.type}\n`;
        report += `- DETAILS: ${a.summary}\n`;
      });
      report += `\n`;
    }

    // List localized transaction history
    const connectedLinks = graphData.links.filter(l => 
      (l.source.id === selectedNode.id || l.target.id === selectedNode.id) || 
      (l.source === selectedNode.id || l.target === selectedNode.id)
    );

    if (connectedLinks.length > 0) {
      report += `[+] RECENT TRANSACTION HISTORY:\n`;
      connectedLinks.forEach(l => {
        const src = l.source.id || l.source;
        const tgt = l.target.id || l.target;
        const flag = l.is_suspicious ? "[FLAGGED]" : "[NORMAL]";
        report += `${flag} ${src} -> ${tgt} | Amount: $${l.amount} | TXN ID: ${l.transaction_id}\n`;
      });
    }

    report += `\n====================================================\n`;
    report += `Auto-generated by NeuralTrace AML System\n`;

    // Trigger browser download
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FIU_EVIDENCE_${selectedNode.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', flex: 1, backgroundColor: 'var(--background)', height: '100vh', overflow: 'hidden' }}>
      {/* Main Graph Area */}
      <div style={{ width: `${graphWidth}px`, position: 'relative', height: '100%', borderRight: '1px solid var(--surface-highest)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 'var(--spacing-6)', left: 'var(--spacing-6)', zIndex: 10 }}>
          <h1 className="headline-md">Graph Investigation</h1>
          <div className="label-sm" style={{ marginBottom: 'var(--spacing-4)' }}>Live Neo4j Sync</div>
          <button 
             className={isFocusMode ? "btn-primary" : "btn-secondary"} 
             onClick={() => setIsFocusMode(!isFocusMode)}
             style={{ fontSize: '0.8rem', padding: 'var(--spacing-2) var(--spacing-4)' }}
          >
             {isFocusMode ? "Show Full Network" : "Focus Suspicious Nodes"}
          </button>
        </div>
        
        {/* Constrained 3D Canvas */}
        <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--surface-lowest)' }}>
          <ForceGraph3D
            ref={fgRef}
            width={graphWidth} // Explicitly block WebGL from expanding under the sidebar
            graphData={displayGraphData}
            nodeLabel="id"
            linkLabel={link => `Amount: $${link.amount} | TXN: ${link.transaction_id}`}
            nodeColor={node => (node.group === 1 || detectedNodes.has(node.id)) ? '#ee7d77' : '#a5c8ff'}
            linkColor={link => {
              const srcId = typeof link.source === 'object' ? link.source.id : link.source;
              const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
              return (link.is_suspicious || detectedEdges.has(`${srcId}-${tgtId}`)) ? '#ee7d77' : '#ffffff';
            }}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            backgroundColor="#000000"
            onNodeClick={handleNodeClick}
            nodeRelSize={6}
            linkWidth={1}
            d3AlphaDecay={0.01}
            d3VelocityDecay={0.1}
          />
        </div>
      </div>

      {/* Sidebar Details & Alerts */}
      <div className="flex-col" style={{ flex: 'none', width: '300px', minWidth: '300px', height: '100%', backgroundColor: 'var(--surface-low)', padding: 'var(--spacing-6)', overflowY: 'auto' }}>
        
        {/* LIVE ALERTS SECTION */}
        <h2 className="headline-md" style={{ marginBottom: 'var(--spacing-4)', color: 'var(--error)' }}>Live Alerts</h2>
        <div className="card" style={{ marginBottom: 'var(--spacing-6)', maxHeight: '40vh', overflowY: 'auto', padding: 'var(--spacing-2)', border: '1px solid var(--error)' }}>
          {alerts.length === 0 ? (
            <div style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: 'var(--spacing-4)' }}>Tracking patterns...</div>
          ) : (
            alerts.map(alert => (
              <div 
                 key={alert.id} 
                 onClick={() => handleAlertClick(alert.rootNode)}
                 style={{ 
                   padding: 'var(--spacing-3)', 
                   borderBottom: '1px solid var(--surface-highest)',
                   cursor: 'pointer',
                   transition: 'background 0.2s'
                 }}
                 onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                 onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{alert.type}</div>
                <div className="body-sm" style={{ color: 'var(--error)' }}>{alert.summary}</div>
              </div>
            ))
          )}
        </div>

        {/* NODE DETAILS SECTION */}
        <h2 className="headline-md" style={{ marginBottom: 'var(--spacing-6)' }}>Node Details</h2>
        
        {selectedNode ? (
          <>
            <div className="card" style={{ marginBottom: 'var(--spacing-6)' }}>
              <div className="label-sm">Selected Entity ID</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedNode.id}</div>
              
              {selectedNode.kyc_status === 'Flagged' ? (
                 <span className="badge-critical" style={{ marginTop: 'var(--spacing-2)', alignSelf: 'flex-start' }}>Flagged Entity</span>
              ) : (
                 <span className="badge-info" style={{ marginTop: 'var(--spacing-2)', alignSelf: 'flex-start' }}>{selectedNode.kyc_status || 'Verified'} {selectedNode.type}</span>
              )}
            </div>

            <div className="card" style={{ marginBottom: 'var(--spacing-6)' }}>
              <div className="label-sm" style={{ marginBottom: 'var(--spacing-2)' }}>Profile Assessment</div>
              <div className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Comparing declared monthly volume against algorithmic traversal throughput.
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <button className="btn-primary" style={{ width: '100%', padding: 'var(--spacing-4)' }} onClick={generateFIUPackage}>
                Generate FIU Evidence Package
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: 'var(--spacing-8)' }}>
            Click an alert or select a node in the graph to view details.
          </div>
        )}

      </div>
    </div>
  );
}
