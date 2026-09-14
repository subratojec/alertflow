import React, { useState } from 'react';
import { AlertTriangle, Trash2, Plus, Clock } from 'lucide-react';

interface MockAlertTesterProps {
  config: string;
  onSimulate: (data: any) => void;
}

const MockAlertTester: React.FC<MockAlertTesterProps> = ({ config, onSimulate }) => {
  const [alerts, setAlerts] = useState([
    [
      { key: 'alertname', value: 'HighErrorRate' }, 
      { key: 'severity', value: 'critical' },
      { key: 'service', value: 'database' },
      { key: 'cluster', value: 'prod' }
    ],
    [
      { key: 'alertname', value: 'HighErrorRate' }, 
      { key: 'severity', value: 'warning' },
      { key: 'service', value: 'database' },
      { key: 'cluster', value: 'prod' }
    ]
  ]);
  const [mockTime, setMockTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [selectedResultIdx, setSelectedResultIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addAlert = () => setAlerts([...alerts, [{ key: '', value: '' }]]);
  const removeAlert = (idx: number) => {
    const newAlerts = alerts.filter((_, i) => i !== idx);
    setAlerts(newAlerts.length ? newAlerts : [[{ key: '', value: '' }]]);
  };

  const addLabel = (alertIdx: number) => {
    const newAlerts = [...alerts];
    newAlerts[alertIdx].push({ key: '', value: '' });
    setAlerts(newAlerts);
  };
  const removeLabel = (alertIdx: number, labelIdx: number) => {
    const newAlerts = [...alerts];
    newAlerts[alertIdx] = newAlerts[alertIdx].filter((_, i) => i !== labelIdx);
    setAlerts(newAlerts);
  };
  const updateLabel = (alertIdx: number, labelIdx: number, field: 'key' | 'value', val: string) => {
    const newAlerts = [...alerts];
    newAlerts[alertIdx][labelIdx][field] = val;
    setAlerts(newAlerts);
  };

  const handleSimulate = async () => {
    setLoading(true);
    const alertsPayload: Record<string, string>[] = [];
    alerts.forEach(alertLabels => {
      const alertData: Record<string, string> = {};
      alertLabels.forEach(l => {
        if (l.key && l.value) alertData[l.key] = l.value;
      });
      if (Object.keys(alertData).length > 0) {
        alertsPayload.push(alertData);
      }
    });

    try {
      setErrorMsg(null);
      let timePayload = undefined;
      if (mockTime) {
         const date = new Date(mockTime);
         if (!isNaN(date.getTime())) {
            timePayload = date.toISOString();
         }
      }

      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, alerts: alertsPayload, time: timePayload }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        setResultData(data);
        setSelectedResultIdx(0);
        // We pass the single selected result to the visualizer
        if (data.results && data.results.length > 0) {
           onSimulate(data.results[0]);
        } else {
           onSimulate(null);
        }
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

  const selectResult = (idx: number) => {
     setSelectedResultIdx(idx);
     if (resultData && resultData.results) {
        onSimulate(resultData.results[idx]);
     }
  };

  const result = resultData?.results ? resultData.results[selectedResultIdx] : null;

  return (
    <div className="glass-panel" style={{ width: '420px', maxWidth: '100%', display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--bg-panel-border)', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
           <AlertTriangle size={18} style={{ color: 'var(--accent-primary)' }} />
           Mock Alert Tester
        </h2>
      </div>

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto', background: 'var(--bg-panel)' }}>
        
        <div style={{ marginBottom: '20px', background: '#F8F9FA', padding: '16px', borderRadius: '8px', border: '1px solid #E9ECEF' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#212529', marginBottom: '10px' }}>
            <Clock size={16} style={{ color: 'var(--accent-primary)' }} /> Mock Time (Optional)
          </label>
          <input 
            type="datetime-local" 
            value={mockTime}
            onChange={(e) => setMockTime(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #CED4DA', borderRadius: '6px', color: '#212529', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
          />
        </div>

        {/* Alerts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {alerts.map((alertLabels, aIdx) => (
            <div key={aIdx} style={{ background: '#F8F9FA', padding: '16px', borderRadius: '8px', border: '1px solid #E9ECEF', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #DEE2E6' }}>
                 <span style={{ fontSize: '15px', fontWeight: 700, color: '#343A40' }}>Alert {aIdx + 1}</span>
                 {alerts.length > 1 && (
                    <button onClick={() => removeAlert(aIdx)} style={{ background: '#FFF5F5', border: '1px solid #FFE3E3', color: '#E03131', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>Remove</button>
                 )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alertLabels.map((lbl, lIdx) => (
                  <div key={lIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      placeholder="Key (e.g. severity)"
                      value={lbl.key}
                      onChange={(e) => updateLabel(aIdx, lIdx, 'key', e.target.value)}
                      style={{ flex: 1, minWidth: 0, padding: '8px 12px', background: '#FFFFFF', border: '1px solid #CED4DA', borderRadius: '4px', color: '#212529', fontSize: '13px', outline: 'none' }}
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. critical)"
                      value={lbl.value}
                      onChange={(e) => updateLabel(aIdx, lIdx, 'value', e.target.value)}
                      style={{ flex: 1, minWidth: 0, padding: '8px 12px', background: '#FFFFFF', border: '1px solid #CED4DA', borderRadius: '4px', color: '#212529', fontSize: '13px', outline: 'none' }}
                    />
                    <button
                      onClick={() => removeLabel(aIdx, lIdx)}
                      style={{ background: '#F1F3F5', border: '1px solid #DEE2E6', color: '#495057', cursor: 'pointer', padding: '8px', borderRadius: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addLabel(aIdx)}
                  style={{ alignSelf: 'flex-start', background: '#E9ECEF', border: '1px solid #CED4DA', color: '#495057', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> Add Label
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addAlert}
            style={{ alignSelf: 'center', background: '#FFFFFF', border: '2px dashed #CED4DA', color: '#495057', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
          >
            <Plus size={18} /> Add Another Alert
          </button>
        </div>

        <button
          onClick={handleSimulate}
          disabled={loading || !config}
          style={{ 
             width: '100%', padding: '12px', marginTop: '24px', 
             background: 'var(--accent-primary)', color: '#000', border: 'none', 
             borderRadius: '8px', fontWeight: 600, 
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

        {resultData && resultData.results && !errorMsg && (
          <div style={{ marginTop: '24px', background: 'var(--bg-translucent)', borderRadius: '8px', padding: '16px', border: '1px solid var(--bg-panel-border)' }}>
             
             {/* Result Tabs */}
             {resultData.results.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                   {resultData.results.map((_: any, i: number) => (
                      <button 
                         key={i} 
                         onClick={() => selectResult(i)}
                         style={{ 
                            padding: '4px 12px', borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            background: selectedResultIdx === i ? 'var(--accent-primary)' : 'var(--bg-panel-border)',
                            color: selectedResultIdx === i ? '#fff' : 'var(--text-main)'
                         }}
                      >
                         Alert {i + 1}
                      </button>
                   ))}
                </div>
             )}

             <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-main)' }}>Receivers Notified:</h3>
             {result && result.receivers_notified && result.receivers_notified.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                   {result.receivers_notified.map((rec: string, i: number) => (
                      <span key={i} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-matched)', border: '1px solid var(--color-matched-glow)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{rec}</span>
                   ))}
                </div>
             ) : (
                <div style={{ color: 'var(--status-critical)', fontSize: '13px', fontWeight: 600 }}>
                   {result?.inhibited ? `Suppressed by Inhibit Rule (${result.inhibited_by})` : result?.muted ? `Suppressed by Time Mute (${result.muted_by?.join(', ')})` : 'None'}
                </div>
             )}
             
             {result && result.matched_routes && result.matched_routes.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                   <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Routing Path Taken:</div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--bg-panel-border)' }}>
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
