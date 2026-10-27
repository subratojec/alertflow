export interface RouteNodeData {
  id: string;
  matchers?: string[];
  receiver?: string;
  inherited_receiver?: string;
  continue?: boolean;
  group_by?: string[];
  group_by_all?: boolean;
  group_wait?: string;
  group_interval?: string;
  repeat_interval?: string;
  mute_time_intervals?: string[];
  active_time_intervals?: string[];
  children?: RouteNodeData[];
}

export interface RouteMatch {
  route_id: string;
  matched: boolean;
  continue?: boolean;
  terminal?: boolean;
}

export interface SimulationResult {
  labels: Record<string, string>;
  matched_routes: RouteMatch[];
  receivers_notified: string[];
  inhibited?: boolean;
  inhibited_by?: string;
  muted?: boolean;
  muted_by?: string[];
  explanation?: string;
}

/**
 * Sanitizes an ID for Mermaid node identifiers.
 */
export function sanitizeMermaidId(id: string): string {
  if (!id) return 'root';
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Escapes characters that break Mermaid node or edge labels.
 */
export function escapeMermaid(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '#quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r?\n/g, ' ');
}

/**
 * Formats matchers into a compact, human-readable label for diagram edges.
 */
export function formatEdgeMatchers(matchers?: string[]): string {
  if (!matchers || matchers.length === 0) {
    return 'catch-all';
  }
  return matchers.map(m => escapeMermaid(m)).join('<br/>');
}

/**
 * Generates a full architecture routing tree in Mermaid format.
 * - Match conditions are displayed on the branching edges.
 * - Receivers are displayed as distinct, styled destination endpoints.
 * - Fallback receivers and continue directives are explicitly labeled.
 */
export function exportToMermaid(root: RouteNodeData | null): string {
  if (!root) return '';

  const nodes: string[] = [];
  const edges: string[] = [];
  const receiverNodes = new Map<string, string>(); // name -> node definition

  const getReceiverId = (name: string) => `rec_${sanitizeMermaidId(name)}`;

  const traverse = (node: RouteNodeData) => {
    const sId = sanitizeMermaidId(node.id);
    const isRoot = node.id === 'root';

    // Build Route Node Label
    const labelLines: string[] = [];
    if (isRoot) {
      labelLines.push('<b>ROOT ROUTE</b>');
      if (node.receiver) {
        labelLines.push(`<i>Default: ${escapeMermaid(node.receiver)}</i>`);
      }
    } else {
      let title = `<b>ROUTE (${escapeMermaid(node.id)})</b>`;
      if (node.continue) {
        title += ' <span style="#quot;color:#D4A24C;#quot;">[CONTINUE]</span>';
      }
      labelLines.push(title);
    }

    // Properties
    if (node.group_by_all) {
      labelLines.push('Group by: [ALL]');
    } else if (node.group_by && node.group_by.length > 0) {
      labelLines.push(`Group by: [${escapeMermaid(node.group_by.join(', '))}]`);
    }

    const timings: string[] = [];
    if (node.group_wait) timings.push(`Wait: ${escapeMermaid(node.group_wait)}`);
    if (node.group_interval) timings.push(`Interval: ${escapeMermaid(node.group_interval)}`);
    if (node.repeat_interval) timings.push(`Repeat: ${escapeMermaid(node.repeat_interval)}`);
    if (timings.length > 0) labelLines.push(timings.join(' | '));

    if (node.mute_time_intervals && node.mute_time_intervals.length > 0) {
      labelLines.push(`Mutes: ${escapeMermaid(node.mute_time_intervals.join(', '))}`);
    }
    if (node.active_time_intervals && node.active_time_intervals.length > 0) {
      labelLines.push(`Active: ${escapeMermaid(node.active_time_intervals.join(', '))}`);
    }

    const nodeClass = isRoot ? 'rootNode' : 'routeNode';
    nodes.push(`    ${sId}["${labelLines.join('<br/>')}"]:::${nodeClass}`);

    const hasChildren = node.children && node.children.length > 0;

    // Connect to child routes with match conditions on edges
    if (hasChildren) {
      for (const child of node.children!) {
        const childId = sanitizeMermaidId(child.id);
        const condition = formatEdgeMatchers(child.matchers);
        edges.push(`    ${sId} -->|"${condition}"| ${childId}`);
        traverse(child);
      }

      // If parent has its own receiver, show it as fallback when children don't match
      if (node.receiver) {
        const recId = getReceiverId(node.receiver);
        if (!receiverNodes.has(node.receiver)) {
          receiverNodes.set(node.receiver, `    ${recId}["🛡️ Receiver: ${escapeMermaid(node.receiver)}"]:::receiverNode`);
        }
        edges.push(`    ${sId} -.->|"fallback if no children match"| ${recId}`);
      }
    } else {
      // Terminal route: dispatches directly to its receiver
      const targetReceiver = node.receiver || node.inherited_receiver;
      if (targetReceiver) {
        const recId = getReceiverId(targetReceiver);
        const isInherited = !node.receiver && !!node.inherited_receiver;
        const recLabel = `🛡️ Receiver: ${escapeMermaid(targetReceiver)}${isInherited ? ' (inherited)' : ''}`;
        if (!receiverNodes.has(targetReceiver)) {
          receiverNodes.set(targetReceiver, `    ${recId}["${recLabel}"]:::receiverNode`);
        }
        edges.push(`    ${sId} ==>|"dispatches to"| ${recId}`);
      }
    }
  };

  traverse(root);

  let out = 'flowchart TD\n';
  out += '    %% Theme Styling Definitions\n';
  out += '    classDef rootNode fill:#403D39,stroke:#EB5E28,stroke-width:2px,color:#FFFCF2;\n';
  out += '    classDef routeNode fill:#252422,stroke:#5A5652,stroke-width:1.5px,color:#FFFCF2;\n';
  out += '    classDef receiverNode fill:#EB5E28,stroke:#C2410C,stroke-width:2px,color:#FFFFFF,font-weight:bold;\n\n';

  out += '    %% Routing Tree Nodes\n';
  out += nodes.join('\n') + '\n\n';

  if (receiverNodes.size > 0) {
    out += '    %% Receivers (Destination Endpoints)\n';
    out += Array.from(receiverNodes.values()).join('\n') + '\n\n';
  }

  if (edges.length > 0) {
    out += '    %% Routing Decision Branches\n';
    out += edges.join('\n') + '\n';
  }

  return out;
}

/**
 * Generates an active Simulation Flow diagram in Mermaid format.
 * - Highlights the simulated alert labels in a banner.
 * - Highlights the matched path in vibrant green with thick arrows (==>).
 * - Highlights terminal route and notified receivers in green & orange.
 * - Shows muted or inhibited states if suppressed.
 * - Dims un-matched routing branches with dashed arrows.
 */
export function exportToMermaidSimulation(root: RouteNodeData | null, sim: SimulationResult | null): string {
  if (!root || !sim) {
    return exportToMermaid(root);
  }

  const matchedMap = new Map<string, RouteMatch>();
  if (sim.matched_routes) {
    sim.matched_routes.forEach(m => {
      if (m.matched) matchedMap.set(m.route_id, m);
    });
  }

  const notifiedSet = new Set(sim.receivers_notified || []);
  const isInhibited = sim.inhibited || false;
  const isMuted = sim.muted || false;

  const nodes: string[] = [];
  const edges: string[] = [];
  const receiverNodes = new Map<string, string>();

  const getReceiverId = (name: string) => `rec_${sanitizeMermaidId(name)}`;

  const traverse = (node: RouteNodeData) => {
    const sId = sanitizeMermaidId(node.id);
    const isRoot = node.id === 'root';
    const matchInfo = matchedMap.get(node.id);
    const isMatched = !!matchInfo;
    const isTerminal = matchInfo?.terminal || false;

    // Node title & styling class
    let nodeClass = 'dimmedNode';
    const labelLines: string[] = [];

    if (isRoot) {
      labelLines.push('<b>ROOT ROUTE</b>');
      if (isMatched) nodeClass = isTerminal ? 'terminalNode' : 'matchedNode';
    } else {
      let title = `<b>ROUTE (${escapeMermaid(node.id)})</b>`;
      if (node.continue) {
        title += ' [CONTINUE]';
      }
      labelLines.push(title);

      if (isMatched) {
        if (isTerminal) {
          if (isInhibited) {
            nodeClass = 'inhibitedNode';
            labelLines.push(`<b>[INHIBITED by ${escapeMermaid(sim.inhibited_by || 'rule')}]</b>`);
          } else if (isMuted) {
            nodeClass = 'mutedNode';
            labelLines.push(`<b>[MUTED: ${escapeMermaid((sim.muted_by || []).join(', '))}]</b>`);
          } else {
            nodeClass = 'terminalNode';
            labelLines.push('<b>[TERMINAL MATCH]</b>');
          }
        } else {
          nodeClass = 'matchedNode';
        }
      }
    }

    if (node.matchers && node.matchers.length > 0) {
      labelLines.push(node.matchers.map(m => escapeMermaid(m)).join(', '));
    }

    nodes.push(`        ${sId}["${labelLines.join('<br/>')}"]:::${nodeClass}`);

    const hasChildren = node.children && node.children.length > 0;

    if (hasChildren) {
      for (const child of node.children!) {
        const childId = sanitizeMermaidId(child.id);
        const childMatched = matchedMap.has(child.id);
        const condition = formatEdgeMatchers(child.matchers);

        if (isMatched && childMatched) {
          // Active matched branch
          edges.push(`        ${sId} == "${condition}" ==> ${childId}`);
        } else {
          // Inactive branch
          edges.push(`        ${sId} -. "${condition}" .-> ${childId}`);
        }
        traverse(child);
      }
    } else {
      // Terminal route: points to receiver
      const targetReceiver = node.receiver || node.inherited_receiver;
      if (targetReceiver) {
        const recId = getReceiverId(targetReceiver);
        const isNotified = notifiedSet.has(targetReceiver);

        let recClass = 'dimmedReceiver';
        let recLabel = `🛡️ Receiver: ${escapeMermaid(targetReceiver)}`;

        if (isNotified) {
          recClass = 'notifiedReceiver';
          recLabel = `🎯 NOTIFIED: ${escapeMermaid(targetReceiver)}`;
        } else if (isMatched && isTerminal) {
          if (isInhibited) {
            recClass = 'inhibitedReceiver';
            recLabel = `🚫 SUPPRESSED: ${escapeMermaid(targetReceiver)}`;
          } else if (isMuted) {
            recClass = 'mutedReceiver';
            recLabel = `⏳ MUTED: ${escapeMermaid(targetReceiver)}`;
          }
        }

        if (!receiverNodes.has(targetReceiver)) {
          receiverNodes.set(targetReceiver, `        ${recId}["${recLabel}"]:::${recClass}`);
        }

        if (isMatched && isTerminal && isNotified) {
          edges.push(`        ${sId} ==>|"DISPATCH"| ${recId}`);
        } else if (isMatched && isTerminal && (isInhibited || isMuted)) {
          edges.push(`        ${sId} -.->|"SUPPRESSED"| ${recId}`);
        } else {
          edges.push(`        ${sId} -.-> ${recId}`);
        }
      }
    }
  };

  traverse(root);

  // Format label string for the simulation banner
  const alertLabels = Object.entries(sim.labels || {})
    .map(([k, v]) => `${k}=#quot;${escapeMermaid(v)}#quot;`)
    .join(', ');

  let out = 'flowchart TD\n';
  out += '    %% Simulation Flow Styling\n';
  out += '    classDef matchedNode fill:#14532D,stroke:#22C55E,stroke-width:2.5px,color:#FFFFFF;\n';
  out += '    classDef terminalNode fill:#15803D,stroke:#4ADE80,stroke-width:3px,color:#FFFFFF,font-weight:bold;\n';
  out += '    classDef notifiedReceiver fill:#EB5E28,stroke:#22C55E,stroke-width:3px,color:#FFFFFF,font-weight:bold;\n';
  out += '    classDef mutedNode fill:#78350F,stroke:#D97706,stroke-width:2px,color:#FDE68A;\n';
  out += '    classDef mutedReceiver fill:#78350F,stroke:#D97706,stroke-width:1.5px,color:#FDE68A;\n';
  out += '    classDef inhibitedNode fill:#7F1D1D,stroke:#EF4444,stroke-width:2px,color:#FECACA;\n';
  out += '    classDef inhibitedReceiver fill:#7F1D1D,stroke:#EF4444,stroke-width:1.5px,color:#FECACA;\n';
  out += '    classDef dimmedNode fill:#252422,stroke:#44403C,stroke-width:1px,color:#78716C;\n';
  out += '    classDef dimmedReceiver fill:#252422,stroke:#44403C,stroke-width:1px,color:#78716C;\n\n';

  out += `    subgraph Sim ["⚡ Simulation: { ${alertLabels} }"]\n`;
  out += nodes.join('\n') + '\n\n';

  if (receiverNodes.size > 0) {
    out += Array.from(receiverNodes.values()).join('\n') + '\n\n';
  }

  if (edges.length > 0) {
    out += edges.join('\n') + '\n';
  }
  out += '    end\n';

  return out;
}

/**
 * Generates Mermaid markdown code block (```mermaid ... ```).
 */
export function exportToMermaidMarkdown(root: RouteNodeData | null, sim?: SimulationResult | null): string {
  const raw = sim ? exportToMermaidSimulation(root, sim) : exportToMermaid(root);
  if (!raw) return '';
  return `\`\`\`mermaid\n${raw}\`\`\`\n`;
}
