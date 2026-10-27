import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, X, FileCode, CheckCircle2, Zap, GitFork } from 'lucide-react';
import { exportToMermaid, exportToMermaidSimulation, type RouteNodeData, type SimulationResult } from '../utils/mermaid';

interface MermaidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  treeData: RouteNodeData | null;
  simulation?: SimulationResult | null;
}

const MermaidExportModal: React.FC<MermaidExportModalProps> = ({ isOpen, onClose, treeData, simulation }) => {
  const hasSimulation = !!simulation && !!simulation.matched_routes && simulation.matched_routes.length > 0;
  const [diagramMode, setDiagramMode] = useState<'architecture' | 'simulation'>(hasSimulation ? 'simulation' : 'architecture');
  const [formatTab, setFormatTab] = useState<'markdown' | 'raw'>('markdown');
  const [copied, setCopied] = useState(false);

  // Synchronize mode if a new simulation arrives
  useEffect(() => {
    if (hasSimulation) {
      setDiagramMode('simulation');
    }
  }, [hasSimulation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !treeData) return null;

  const rawMermaid = diagramMode === 'simulation' && hasSimulation
    ? exportToMermaidSimulation(treeData, simulation)
    : exportToMermaid(treeData);

  const markdownMermaid = `\`\`\`mermaid\n${rawMermaid}\`\`\`\n`;
  const currentContent = formatTab === 'markdown' ? markdownMermaid : rawMermaid;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const prefix = diagramMode === 'simulation' ? 'alert-simulation-flow' : 'alert-routing-tree';
    const filename = formatTab === 'markdown' ? `${prefix}.md` : `${prefix}.mmd`;
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '92%',
          maxWidth: '720px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
          border: '1px solid var(--bg-panel-border)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--bg-panel-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-panel)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'rgba(235, 94, 40, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <FileCode size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Mermaid.js Diagram Export
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-node-translucent-strong)',
                    color: 'var(--text-muted)',
                  }}
                >
                  flowchart TD
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Native, theme-adaptive diagrams for GitHub/GitLab PRs, RFCs, and runbooks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode & Format Controls Toolbar */}
        <div
          style={{
            padding: '12px 22px',
            background: 'rgba(0, 0, 0, 0.03)',
            borderBottom: '1px solid var(--bg-panel-border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Diagram Type Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>
              Diagram:
            </span>

            <button
              onClick={() => setDiagramMode('architecture')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: diagramMode === 'architecture' ? 'var(--bg-surface)' : 'transparent',
                color: diagramMode === 'architecture' ? 'var(--text-node)' : 'var(--text-muted)',
                border: diagramMode === 'architecture' ? '1px solid var(--bg-node-border)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <GitFork size={13} />
              Routing Architecture
            </button>

            <button
              onClick={() => hasSimulation && setDiagramMode('simulation')}
              disabled={!hasSimulation}
              title={hasSimulation ? 'Export the simulated alert path' : 'Run a simulation in the Mock Alert Tester first'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: diagramMode === 'simulation' ? 'var(--bg-surface)' : 'transparent',
                color: diagramMode === 'simulation' ? 'var(--text-node)' : (hasSimulation ? 'var(--text-muted)' : 'rgba(0,0,0,0.3)'),
                border: diagramMode === 'simulation' ? '1px solid var(--color-matched)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: hasSimulation ? 'pointer' : 'not-allowed',
                opacity: hasSimulation ? 1 : 0.6,
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={13} color={hasSimulation ? 'var(--color-matched)' : undefined} />
              Simulated Alert Path
              {hasSimulation && (
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: 'var(--color-matched)',
                    color: '#fff',
                    marginLeft: '2px',
                  }}
                >
                  LIVE
                </span>
              )}
            </button>
          </div>

          {/* Format Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>
              Format:
            </span>
            <button
              onClick={() => setFormatTab('markdown')}
              style={{
                background: formatTab === 'markdown' ? 'var(--bg-surface)' : 'transparent',
                color: formatTab === 'markdown' ? 'var(--text-node)' : 'var(--text-muted)',
                border: formatTab === 'markdown' ? '1px solid var(--bg-node-border)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Markdown (```mermaid)
            </button>
            <button
              onClick={() => setFormatTab('raw')}
              style={{
                background: formatTab === 'raw' ? 'var(--bg-surface)' : 'transparent',
                color: formatTab === 'raw' ? 'var(--text-node)' : 'var(--text-muted)',
                border: formatTab === 'raw' ? '1px solid var(--bg-node-border)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Raw (.mmd)
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden', padding: '16px 22px' }}>
          <pre
            style={{
              margin: 0,
              padding: '16px',
              background: '#252422',
              color: '#FFFCF2',
              borderRadius: '8px',
              border: '1px solid #403D39',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              lineHeight: '1.5',
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: '42vh',
              whiteSpace: 'pre',
            }}
          >
            <code>{currentContent}</code>
          </pre>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--bg-panel-border)',
            background: 'var(--bg-panel)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <CheckCircle2 size={15} color="var(--status-success)" />
            <span>
              {diagramMode === 'simulation'
                ? 'Shows active green routing path & notified receivers for RFCs/PRs'
                : 'Decision conditions on branches with distinct receiver endpoints'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: '1px solid var(--bg-panel-border)',
                color: 'var(--text-main)',
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Download size={14} />
              {formatTab === 'markdown' ? 'Download .md' : 'Download .mmd'}
            </button>

            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: copied ? 'var(--status-success)' : 'var(--accent-primary)',
                border: 'none',
                color: '#fff',
                padding: '7px 18px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: copied ? 'none' : '0 2px 6px rgba(235, 94, 40, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MermaidExportModal;
