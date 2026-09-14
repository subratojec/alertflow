import { useState, useEffect } from 'react';
import Visualizer from './components/Visualizer';
import Editor from './components/Editor';
import MockAlertTester from './components/MockAlertTester';

interface Message {
  line?: number;
  message: string;
}
const DEMO_CONFIG = `global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'team-operations-pager'
  routes:
  - matchers:
    - severity="critical"
    receiver: 'team-operations-pager'
    routes:
    - matchers:
      - service="database"
      receiver: 'team-db-pager'
      mute_time_intervals:
      - weekend-maintenance
  - matchers:
    - severity="warning"
    receiver: 'team-operations-slack'

inhibit_rules:
- source_matchers:
  - severity="critical"
  target_matchers:
  - severity="warning"
  equal: ['alertname', 'cluster', 'service']

receivers:
- name: 'team-operations-pager'
- name: 'team-operations-slack'
- name: 'team-db-pager'

time_intervals:
- name: weekend-maintenance
  intervals:
  - weekdays: ['saturday', 'sunday']
`;

const App = () => {
  const [config, setConfig] = useState<string>(DEMO_CONFIG);
  const [treeData, setTreeData] = useState<Record<string, any> | null>(null);
  const [simulationData, setSimulationData] = useState<Record<string, any> | null>(null);
  const [errors, setErrors] = useState<Message[]>([]);
  const [warnings, setWarnings] = useState<Message[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [redacted, setRedacted] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => setSidebarWidth(Math.max(200, Math.min(800, e.clientX)));
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Fetch tree data when config changes
  useEffect(() => {
    if (!config) {
      setTreeData(null);
      setErrors([]);
      setWarnings([]);
      setJumpTarget(null);
      return;
    }

    const fetchTree = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        setFetchError(null);
        let payload = config;
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        if (emailRegex.test(payload)) {
          payload = payload.replace(emailRegex, '[REDACTED_EMAIL]');
          setRedacted(true);
        } else {
          setRedacted(false);
        }

        const vRes = await fetch('/api/validate', {
           method: 'POST', body: payload, signal: controller.signal
        });
        if (vRes.ok) {
           const vData = await vRes.json();
           setErrors(vData.errors || []);
           setWarnings(vData.warnings || []);
        } else {
           setErrors([{ message: `Failed to validate config: ${vRes.statusText}` }]);
           setWarnings([]);
        }

        const res = await fetch('/api/tree', {
          method: 'POST',
          body: payload,
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json();
          setTreeData(data);
        } else {
          setTreeData(null);
          setFetchError(`Server returned ${res.status}: ${res.statusText}`);
        }
      } catch (err: any) {
        console.error("Failed to fetch tree:", err);
        setFetchError(err.name === 'AbortError' ? 'Request timed out' : 'Network error or server unreachable');
        setTreeData(null);
      } finally {
        clearTimeout(timeoutId);
      }
    };
    
    const debounceId = setTimeout(fetchTree, 500);
    return () => clearTimeout(debounceId);
  }, [config]);

  // Handle resetting simulation when config changes
  useEffect(() => {
     setSimulationData(null);
  }, [config]);

  const handleConfigChange = (val: string) => {
    setConfig(val);
  };

  const handleNodeClick = (nodeData: any) => {
    if (nodeData.receiver) {
       setJumpTarget(`receiver: ${nodeData.receiver}`);
    } else if (nodeData.matchers && nodeData.matchers.length > 0) {
       // Just grab the first matcher key to search
       const firstMatch = nodeData.matchers[0].split('=')[0];
       setJumpTarget(firstMatch);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '16px 24px', display: 'flex', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/logo.svg?v=2" alt="AlertFlow Logo" width="44" height="44" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-main)' }}>AlertFlow</h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Alertmanager Route Visualizer & CI Checker</p>
          </div>
        </div>
        
        {redacted && (
          <div style={{ marginLeft: 'auto', background: 'var(--status-warning)', color: '#000', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, animation: 'fadeIn 0.3s ease' }}>
             Protected Config: Emails Auto-Redacted
          </div>
        )}
        

      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* Editor Sidebar */}
        <div style={{ width: `${sidebarWidth}px`, flexShrink: 0, borderRight: '1px solid var(--bg-panel-border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', zIndex: 5, position: 'relative' }}>
          <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-panel-border)', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>alertmanager.yml</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {warnings.length > 0 && <span style={{ color: 'var(--status-warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{warnings.length} warning(s)</span>}
              {errors.length > 0 && <span style={{ color: 'var(--status-critical)', background: 'rgba(248, 81, 73, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{errors.length} error(s)</span>}
            </div>
          </div>

          {(errors.length > 0 || warnings.length > 0 || fetchError) && (
            <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-panel-border)', padding: '16px 20px', maxHeight: '150px', overflowY: 'auto' }}>
               {fetchError && (
                 <div style={{ marginBottom: '8px', color: 'var(--status-critical)', fontSize: '13px', fontWeight: 600 }}>
                   {fetchError}
                 </div>
               )}
               {errors.length > 0 && (
                 <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px', color: 'var(--status-critical)', fontSize: '13px' }}>
                    {errors.map((e, i) => <li key={i} style={{ marginBottom: '4px' }}>{e.message}</li>)}
                 </ul>
               )}
               {warnings.length > 0 && (
                 <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--status-warning)', fontSize: '13px' }}>
                    {warnings.map((w, i) => <li key={i} style={{ marginBottom: '4px' }}>{w.message}</li>)}
                 </ul>
               )}
            </div>
          )}

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor value={config} onChange={handleConfigChange} errors={errors} jumpTarget={jumpTarget} theme="dark" />
          </div>
          
          <div 
             onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
             style={{ position: 'absolute', top: 0, right: -4, width: 8, height: '100%', cursor: 'col-resize', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
             <div style={{ width: 4, height: 24, background: isDragging ? 'var(--accent-primary)' : 'transparent', borderRadius: 2, transition: 'background 0.2s ease' }} />
          </div>
        </div>
      
        {/* Visualizer Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Visualizer data={treeData} simulation={simulationData} onNodeClick={handleNodeClick} />
          
          {/* Floating Mock Tester Panel */}
          <div style={{ position: 'absolute', top: '24px', bottom: '24px', right: '24px', maxWidth: 'calc(100% - 48px)', zIndex: 20 }}>
            <MockAlertTester config={config} onSimulate={setSimulationData} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
