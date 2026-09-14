import React, { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MarkerType, Handle, Position, MiniMap } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import dagre from 'dagre';
import { PlusCircle, MinusCircle, ShieldAlert, GitMerge } from 'lucide-react';
import 'reactflow/dist/style.css';

interface VisualizerProps {
  data: any;
  simulation: any;
  onNodeClick?: (nodeData: any) => void;
}

const RouteNodeComponent = ({ data }: any) => {
  return (
    <div className={`node-card ${data.isMatched ? 'matched' : ''} ${data.isTerminal ? 'terminal' : ''}`} style={{ width: '380px' }}>
      <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />
      
      <div className="node-header" style={{ cursor: 'pointer' }} onClick={() => data.onNodeClick && data.onNodeClick(data)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitMerge size={14} style={{ color: 'var(--text-muted)' }} />
          <span className="node-title">{data.id === 'root' ? 'ROOT ROUTE' : `ROUTE (${data.id})`}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {data.isTerminal && !data.isMuted && !data.isInhibited && <span className="node-badge" style={{ background: 'var(--color-matched)', color: '#fff' }}>TERMINAL</span>}
          {data.isTerminal && data.isMuted && <span className="node-badge" style={{ background: 'var(--status-warning)', color: '#000' }}>MUTED</span>}
          {data.isTerminal && data.isInhibited && <span className="node-badge" style={{ background: 'var(--status-critical)', color: '#fff' }}>INHIBITED</span>}
          {data.continue && <span className="node-badge badge-continue">CONTINUE</span>}
        </div>
      </div>

      <div className="node-body">
        {data.matchers && data.matchers.length > 0 ? (
          <div style={{ cursor: 'pointer' }} onClick={() => data.onNodeClick && data.onNodeClick(data)}>
            {data.matchers.map((m: string, i: number) => (
              <span key={i} className="chip">{m}</span>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Matches all alerts (catch-all)</span>
        )}

        <div className="receiver-box" style={{ cursor: 'pointer' }} onClick={() => data.onNodeClick && data.onNodeClick(data)}>
           <ShieldAlert size={14} style={{ color: 'var(--text-muted)' }} />
           <span className="receiver-name">{data.receiver ? data.receiver : (data.inherited_receiver ? `(Inherited / ${data.inherited_receiver})` : '(Inherited / None)')}</span>
        </div>
        
        {/* Additional Properties */}
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {data.mute_time_intervals && data.mute_time_intervals.length > 0 && (
            <span className="node-badge badge-prop">Mutes: {data.mute_time_intervals.join(', ')}</span>
          )}
          {data.active_time_intervals && data.active_time_intervals.length > 0 && (
            <span className="node-badge badge-prop">Active: {data.active_time_intervals.join(', ')}</span>
          )}
          {data.group_by && data.group_by.length > 0 && (
            <span className="node-badge badge-prop">Group By: {data.group_by.join(', ')}</span>
          )}
          {data.group_wait && <span className="node-badge badge-prop">Wait: {data.group_wait}</span>}
          {data.group_interval && <span className="node-badge badge-prop">Interval: {data.group_interval}</span>}
          {data.repeat_interval && <span className="node-badge badge-prop">Repeat: {data.repeat_interval}</span>}
        </div>
        
        {data.hasChildren && (
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); data.toggleCollapse(data.id); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}
            >
              {data.isCollapsed ? (
                <><PlusCircle size={14} style={{ color: 'var(--accent-primary)' }}/> Expand Subtree</>
              ) : (
                <><MinusCircle size={14} /> Collapse Subtree</>
              )}
            </button>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />
    </div>
  );
};

const nodeTypes = {
  routeNode: RouteNodeComponent,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 400;
const nodeHeight = 240;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

const Visualizer: React.FC<VisualizerProps> = ({ data, simulation, onNodeClick }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    
    const ns: Node[] = [];
    const es: Edge[] = [];
    
    const matchedNodes = new Map<string, any>();
    if (simulation && simulation.matched_routes) {
       simulation.matched_routes.forEach((m: any) => {
          if (m.matched) {
             matchedNodes.set(m.route_id, m);
          }
       });
    }

    const traverse = (node: any) => {
       const matchInfo = matchedNodes.get(node.id);
       const isMatched = !!matchInfo;
       const isTerminal = matchInfo?.terminal || false;
       const hasChildren = node.children && node.children.length > 0;
       const isCollapsed = collapsedNodes.has(node.id);
       
       const isInhibited = simulation?.inhibited || false;
       const isMuted = simulation?.muted || false;

       ns.push({
          id: node.id,
          type: 'routeNode',
          position: { x: 0, y: 0 },
          data: { ...node, isMatched, isTerminal, hasChildren, isCollapsed, toggleCollapse, onNodeClick, isInhibited, isMuted }
       });
       
       if (hasChildren && !isCollapsed) {
          for (let i = 0; i < node.children.length; i++) {
             const child = node.children[i];
             traverse(child);
             
             const edgeId = `${node.id}->${child.id}`;
             const edgeMatched = isMatched && matchedNodes.has(child.id); 
             
             es.push({
                id: edgeId,
                source: node.id,
                target: child.id,
                type: 'smoothstep',
                animated: edgeMatched,
                markerEnd: { type: MarkerType.ArrowClosed, color: edgeMatched ? 'var(--color-matched)' : 'var(--bg-panel-border)' },
                style: { stroke: edgeMatched ? 'var(--color-matched)' : 'var(--bg-panel-border)', strokeWidth: edgeMatched ? 4 : 2 },
                className: edgeMatched ? 'animated-edge' : ''
             });
          }
       }
    };
    
    traverse(data);
    return getLayoutedElements(ns, es);
  }, [data, simulation, collapsedNodes, onNodeClick]);

  if (!data) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', color: 'var(--text-main)', margin: '0 0 8px 0' }}>Waiting for configuration</h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>Paste a valid Alertmanager config on the left to visualize the routing tree.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick && onNodeClick(node.data)}
        fitView
        minZoom={0.05}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background color="var(--bg-panel-border)" gap={24} size={2} />
        <Controls style={{ background: 'var(--bg-panel)', border: '1px solid var(--bg-panel-border)', fill: 'var(--text-main)', borderRadius: '8px', overflow: 'hidden' }} />
        <MiniMap 
          nodeColor={(n: any) => {
             if (n.data?.isMatched) return 'var(--color-matched)';
             return 'var(--bg-surface)';
          }}
          maskColor="rgba(0, 0, 0, 0.4)"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--bg-panel-border)', borderRadius: '8px' }}
        />
      </ReactFlow>
    </div>
  );
};

export default Visualizer;
