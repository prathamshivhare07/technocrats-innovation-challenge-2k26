import React, { useEffect, useState, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function GraphWorkspace({ initialFocusNode }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [alerts, setAlerts] = useState([]);
  const [detectedNodes, setDetectedNodes] = useState(new Set());
  const [detectedEdges, setDetectedEdges] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  // Chatbot State
  const [chatMessages, setChatMessages] = useState([{ sender: 'bot', text: 'Hello! Ask me to find the biggest transactions, count total nodes, or show flagged accounts.' }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [targetFlashText, setTargetFlashText] = useState(null);
  
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

  const fetchAllData = () => {
    // Load Neo4j graph nodes and edges
    fetch(`${API_URL}/api/graph`)
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(console.error);
      
    // Load ML detected patterns
    Promise.all([
      fetch(`${API_URL}/api/detect/layering`).then(r => r.json()),
      fetch(`${API_URL}/api/detect/circular`).then(r => r.json()),
      fetch(`${API_URL}/api/detect/structuring`).then(r => r.json())
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
  };

  useEffect(() => {
    fetchAllData();
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

  const handleSearch = () => {
    if (!searchInput.trim()) return;
    const term = searchInput.trim().toLowerCase();
    const node = graphData.nodes.find(n => n.id.toLowerCase() === term);
    
    if (node) {
      handleNodeClick(node);
      setTargetFlashText(`Navigating to Node: ${node.id}`);
      setTimeout(() => setTargetFlashText(null), 3000);
      setSearchInput('');
    } else {
      setTargetFlashText(`Error: Node "${searchInput}" not found!`);
      setTimeout(() => setTargetFlashText(null), 3000);
    }
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
    URL.revokeObjectURL(url);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage.text })
      });
      
      const data = await res.json();
      
      // Auto focus on the first node returned by the bot
      if (data.nodes && data.nodes.length > 0) {
        setDetectedNodes(prev => new Set([...prev, ...data.nodes]));
        const firstNodeId = data.nodes[0];
        // Focus click after small timeout
        setTimeout(() => handleAlertClick(firstNodeId), 300);
      }
      
      setChatMessages(prev => [...prev, { sender: 'bot', text: data.text }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I lost connection to the backend.' }]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', flex: 1, backgroundColor: 'var(--background)', height: '100vh', overflow: 'hidden' }}>
      {/* Main Graph Area */}
      <div style={{ width: `${graphWidth}px`, position: 'relative', height: '100%', borderRight: '1px solid var(--surface-highest)', overflow: 'hidden' }}>
        <div style={{ 
            position: 'absolute', top: 'var(--spacing-6)', left: 'var(--spacing-6)', zIndex: 10,
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: 'var(--spacing-6)',
            boxShadow: '0 15px 50px rgba(0, 0, 0, 0.7)',
            width: '340px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-5)'
          }}>
          
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Graph Control</h1>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%', boxShadow: '0 0 12px #4ade80' }}></span>
              Live Neo4j Sync
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
             <div style={{ flex: 1, padding: '8px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Nodes</span>
                <span style={{ color: '#60a5fa', fontSize: '1.2rem' }}>{graphData.nodes.length}</span>
             </div>
             <div style={{ flex: 1, padding: '8px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Edges</span>
                <span style={{ color: '#a78bfa', fontSize: '1.2rem' }}>{graphData.links.length}</span>
             </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
             <input 
               type="text" 
               placeholder="Search Node ID..." 
               value={searchInput} 
               onChange={e => setSearchInput(e.target.value)} 
               onKeyDown={e => e.key === 'Enter' && handleSearch()}
               style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 14px', outline: 'none', transition: 'all 0.2s', fontSize: '0.9rem' }} 
               onFocus={e => e.target.style.borderColor = '#60a5fa'}
               onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
             />
             <button 
                onClick={handleSearch} 
                style={{ padding: '0 20px', borderRadius: '10px', background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = '#60a5fa'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'; e.currentTarget.style.color = '#60a5fa'; }}
             >
                Find
             </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <button 
               onClick={() => setIsFocusMode(!isFocusMode)}
               style={{ 
                 fontSize: '0.9rem', padding: '12px', borderRadius: '10px', width: '100%', display: 'flex', justifyContent: 'center', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                 background: isFocusMode ? 'linear-gradient(90deg, #f43f5e, #e11d48)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                 color: 'white', border: 'none', boxShadow: isFocusMode ? '0 4px 15px rgba(225, 29, 72, 0.4)' : '0 4px 15px rgba(139, 92, 246, 0.4)'
               }}
               onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
               onMouseOut={e => e.currentTarget.style.transform = 'none'}
            >
               {isFocusMode ? "⊝ Show Full Network" : "🎯 Focus Suspicious Nodes"}
            </button>
            <button 
               onClick={fetchAllData}
               style={{ 
                 fontSize: '0.9rem', padding: '12px', borderRadius: '10px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                 background: 'rgba(255,255,255,0.03)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
               }}
               onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
               onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#cbd5e1'; }}
            >
               🔄 Refresh Graph Data
            </button>
          </div>
        </div>
        
        {targetFlashText && (
          <div style={{
            position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'var(--surface-high)', color: 'var(--on-surface)',
            padding: 'var(--spacing-4) var(--spacing-8)', borderRadius: '100px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100, fontSize: '1.2rem', fontWeight: 600,
            border: '1px solid var(--primary)'
          }}>
            {targetFlashText}
          </div>
        )}
        
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
            d3AlphaDecay={0.06}
            d3VelocityDecay={0.6}
          />

          {/* Floating Chat Window overlay */}
          {isChatOpen && (
            <div style={{ position: 'absolute', bottom: 'var(--spacing-6)', right: 'var(--spacing-6)', width: '350px', height: '400px', backgroundColor: 'var(--surface-low)', border: '1px solid var(--outline-variant)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
               {/* Header */}
               <div style={{ backgroundColor: 'var(--surface)', padding: 'var(--spacing-3)', fontWeight: 600, borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Graph Assistant</span>
                  <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>✖</button>
               </div>
               
               {/* Messages */}
               <div style={{ flex: 1, padding: 'var(--spacing-3)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div className="label-sm" style={{ marginBottom: '2px', color: 'var(--on-surface-variant)', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>{msg.sender === 'user' ? 'You' : 'Bot'}</div>
                      <div style={{ backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'var(--surface-high)', color: msg.sender === 'user' ? 'var(--on-primary)' : 'var(--on-surface)', padding: 'var(--spacing-3)', borderRadius: '8px', whiteSpace: 'pre-line', fontSize: '0.9rem' }}>
                         {msg.text}
                      </div>
                    </div>
                  ))}
               </div>

               {/* Input */}
               <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--outline-variant)', display: 'flex', gap: 'var(--spacing-2)' }}>
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()} placeholder="Ask something..." style={{ flex: 1, backgroundColor: 'var(--surface-lowest)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)', borderRadius: '6px', padding: 'var(--spacing-2)' }} />
                  <button onClick={handleSendChatMessage} className="btn-primary" style={{ padding: '0 var(--spacing-4)' }}>Send</button>
               </div>
            </div>
          )}
          
          {/* Chat Bubble Toggle Button (if closed) */}
          {!isChatOpen && (
             <button onClick={() => setIsChatOpen(true)} className="btn-primary" style={{ position: 'absolute', bottom: 'var(--spacing-6)', right: 'var(--spacing-6)', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                💬
             </button>
          )}

        </div>
      </div>

      {/* Sidebar Details & Alerts */}
      <div className="flex-col" style={{ flex: 'none', width: '320px', minWidth: '320px', height: '100%', backgroundColor: 'rgba(15, 15, 20, 0.65)', padding: 'var(--spacing-6)', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        
        {/* LIVE ALERTS SECTION */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-4)' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', boxShadow: '0 0 10px #ef4444' }}></span>
          <h2 className="headline-md" style={{ color: '#f8fafc', margin: 0 }}>Live Alerts Stream</h2>
        </div>

        <div style={{ marginBottom: 'var(--spacing-6)', maxHeight: '40vh', overflowY: 'auto', padding: 'var(--spacing-2)', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
          {alerts.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 'var(--spacing-4)' }}>Tracking patterns...</div>
          ) : (
            alerts.map(alert => (
              <div 
                 key={alert.id} 
                 onClick={() => handleAlertClick(alert.rootNode)}
                 style={{ 
                   padding: '12px 16px', 
                   borderBottom: '1px solid rgba(255,255,255,0.05)',
                   cursor: 'pointer',
                   transition: 'all 0.2s',
                   borderRadius: '8px'
                 }}
                 onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                 onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>{alert.type}</div>
                <div className="body-sm" style={{ color: '#ef4444', marginTop: '4px' }}>{alert.summary}</div>
              </div>
            ))
          )}
        </div>

        {/* NODE DETAILS SECTION */}
        <h2 className="headline-md" style={{ marginBottom: 'var(--spacing-4)', color: '#f8fafc' }}>Investigation Target</h2>
        
        {selectedNode ? (
          <>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '12px', 
              padding: '16px',
              marginBottom: 'var(--spacing-4)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Selected Entity ID</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60a5fa', wordBreak: 'break-all' }}>{selectedNode.id}</div>
              
              <div style={{ marginTop: '12px' }}>
              {selectedNode.kyc_status === 'Flagged' ? (
                 <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-block' }}>⚠️ Flagged Entity</span>
              ) : (
                 <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'inline-block' }}>✓ {selectedNode.kyc_status || 'Verified'} {selectedNode.type}</span>
              )}
              </div>
            </div>

            <div style={{ 
              background: 'rgba(30, 41, 59, 0.4)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '12px', 
              padding: '16px',
              marginBottom: 'var(--spacing-6)'
            }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Profile Assessment</div>
              <div className="body-sm" style={{ color: '#cbd5e1' }}>
                Comparing declared monthly volume against algorithmic traversal throughput.
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <button 
                onClick={generateFIUPackage}
                style={{ 
                  width: '100%', padding: '14px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', 
                  border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, fontSize: '1rem',
                  cursor: 'pointer', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)', transition: 'all 0.2s',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'none'}
              >
                📄 Generate FIU Evidence Package
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center', background: 'rgba(30, 41, 59, 0.2)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
            Click an alert or select a node in the graph to view details.
          </div>
        )}
      </div>
    </div>
  );
}
