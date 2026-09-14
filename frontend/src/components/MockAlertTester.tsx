import React, { useState } from 'react';
import { AlertTriangle, Trash2, Plus } from 'lucide-react';

interface MockAlertTesterProps {
  config: string;
  onSimulate: (data: any) => void;
}

const MockAlertTester: React.FC<MockAlertTesterProps> = ({ config, onSimulate }) => {
  const [labels, setLabels] = useState([{ key: 'alertname', value: 'HighErrorRate' }, { key: 'severity', value: 'critical' }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addLabel = () => setLabels([...labels, { key: '', value: '' }]);
  const removeLabel = (idx: number) => setLabels(labels.filter((_, i) => i !== idx));
  const updateLabel = (idx: number, field: 'key' | 'value', val: string) => {
    const newLabels = [...labels];
    newLabels[idx][field] = val;
    setLabels(newLabels);
  };

  const handleSimulate = async () => {
    setLoading(true);
    const alertData: Record<string, string> = {};
    labels.forEach(l => {
      if (l.key && l.value) alertData[l.key] = l.value;
    });

    try {
      setErrorMsg(null);
      const res = await fetch('http://localhost:8080/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, alert: alertData })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        onSimulate(data);
      } else {
        const text = await res.text();
        setErrorMsg(text || `Error ${res.status}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Network error');
    }
    setLoading(false);
  };

  return (

    <div className="glass-panel" style={{ width: '380px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--bg-panel-border)' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
           <AlertTriangle size={18} style={{ color: 'var(--accent-primary)' }} />
           Mock Alert Tester
        </h2>
      </div>

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {labels.map((lbl, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <input
                type="text"
                placeholder="Label key"
                value={lbl.key}
                onChange={(e) => updateLabel(idx, 'key', e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-translucent)', border: '1px solid var(--bg-panel-border)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
              />
              <input
                type="text"
                placeholder="Value"
                value={lbl.value}
                onChange={(e) => updateLabel(idx, 'value', e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-translucent)', border: '1px solid var(--bg-panel-border)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
              />
              <button
                onClick={() => removeLabel(idx)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button
            onClick={addLabel}
            style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--bg-panel-border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Add Label
          </button>
        </div>

        <button
          onClick={handleSimulate}
          disabled={loading || !config}
          style={{ 
             width: '100%', 
             padding: '12px', 
             marginTop: '24px', 
             background: 'var(--accent-primary)', 
             color: '#000', 
             border: 'none', 
             borderRadius: '8px', 
             fontWeight: 600, 
             cursor: loading || !config ? 'not-allowed' : 'pointer',
             opacity: loading || !config ? 0.5 : 1,
             boxShadow: '0 4px 14px var(--accent-primary-glow)'
          }}
        >
          {loading ? 'Simulating...' : 'Simulate Routing'}
        </button>

        {errorMsg && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(248, 81, 73, 0.1)', color: 'var(--status-critical)', borderRadius: '6px', border: '1px solid var(--status-critical-glow)', fontSize: '13px' }}>
             <strong>Simulation Failed:</strong><br/>
             {errorMsg}
          </div>
        )}

        {result && !errorMsg && (
          <div style={{ marginTop: '24px', background: 'var(--bg-translucent)', borderRadius: '8px', padding: '16px', border: '1px solid var(--bg-panel-border)' }}>
             <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-main)' }}>Receivers Notified:</h3>
             {result.receivers_notified && result.receivers_notified.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                   {result.receivers_notified.map((rec: string, i: number) => (
                      <span key={i} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-matched)', border: '1px solid var(--color-matched-glow)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{rec}</span>
                   ))}
                </div>
             ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>None</div>
             )}
             
             {result.matched_routes && result.matched_routes.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                   <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Routing Path Taken:</div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-space)', padding: '12px', borderRadius: '6px', border: '1px solid var(--bg-panel-border)' }}>
                      {result.matched_routes.filter((r: any) => r.matched).map((r: any, i: number, arr: any[]) => (
                         <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '16px' }}>
                               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.terminal ? 'var(--status-success)' : 'var(--color-matched)', boxShadow: r.terminal ? '0 0 10px var(--status-success)' : 'none', zIndex: 2 }} />
                               {i < arr.length - 1 && <div style={{ width: '2px', height: '24px', background: 'var(--bg-panel-border)', position: 'absolute', marginTop: '8px' }} />}
                            </div>
                            <span style={{ color: r.terminal ? 'var(--status-success)' : 'var(--text-main)', fontWeight: r.terminal ? 600 : 400 }}>{r.route_id === 'root' ? 'ROOT' : r.route_id}</span>
                            {r.terminal && <span style={{ fontSize: '10px', color: 'var(--status-success)', border: '1px solid var(--status-success)', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>TERMINAL</span>}
                         </div>
                      ))}
                   </div>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MockAlertTester;
