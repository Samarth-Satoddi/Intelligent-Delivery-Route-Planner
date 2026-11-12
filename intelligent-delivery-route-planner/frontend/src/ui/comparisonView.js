/**
 * Algorithm Comparison View Controller: Side-by-Side GBFS vs A* analytical metrics.
 */
export class ComparisonViewController {
  constructor(plannerController) {
    this.planner = plannerController;
    this.container = document.getElementById('comparisonContent');
  }

  render() {
    const res = this.planner.lastResult;
    if (!res || !res.gbfs || !res.astar) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-dim);">
          <p style="font-size: 1.1rem; margin-bottom: 8px;">No comparative query calculated yet.</p>
          <p style="font-size: 0.85rem;">Run <b>Both Algorithms</b> in the Route Planner dock to view full side-by-side performance analytics.</p>
        </div>
      `;
      return;
    }

    const g = res.gbfs;
    const a = res.astar;
    const c = res.comparison || {};
    const excess = c.excess_cost_percent || 0;

    this.container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- GBFS Card -->
        <div style="background: rgba(249, 115, 22, 0.08); border: 1px solid var(--orange-gbfs); border-radius: 12px; padding: 20px;">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--orange-gbfs); margin-bottom: 8px;">
            GREEDY BEST-FIRST SEARCH (GBFS)
          </div>
          <div style="font-size: 2.2rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #ffffff;">
            ${g.total_cost.toFixed(1)} <span style="font-size: 1rem; color: var(--text-muted);">metres</span>
          </div>
          <div style="margin: 14px 0; font-size: 0.85rem; line-height: 1.8; color: var(--text-muted);">
            <div>Evaluation Function: <b style="color: #ffffff;">f(n) = h(n)</b></div>
            <div>Nodes Expanded: <b style="color: #ffffff;">${g.expanded_nodes_count}</b></div>
            <div>Nodes Generated: <b style="color: #ffffff;">${g.generated_nodes_count}</b></div>
            <div>Execution Runtime: <b style="color: #ffffff;">${g.execution_time_ms.toFixed(3)} ms</b></div>
            <div>Optimality: <b style="color: ${excess > 0 ? '#ef4444' : '#22c55e'};">${excess > 0 ? `Suboptimal (+${excess}%)` : 'Optimal'}</b></div>
          </div>
          <div style="font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; color: #cbd5e1; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 6px;">
            ${g.path_names.join(' ➔ ')}
          </div>
        </div>

        <!-- A* Card -->
        <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid var(--cyan-glow); border-radius: 12px; padding: 20px;">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--cyan-glow); margin-bottom: 8px;">
            A* SEARCH ALGORITHM (OPTIMAL)
          </div>
          <div style="font-size: 2.2rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #ffffff;">
            ${a.total_cost.toFixed(1)} <span style="font-size: 1rem; color: var(--text-muted);">metres</span>
          </div>
          <div style="margin: 14px 0; font-size: 0.85rem; line-height: 1.8; color: var(--text-muted);">
            <div>Evaluation Function: <b style="color: #ffffff;">f(n) = g(n) + h(n)</b></div>
            <div>Nodes Expanded: <b style="color: #ffffff;">${a.expanded_nodes_count}</b></div>
            <div>Nodes Generated: <b style="color: #ffffff;">${a.generated_nodes_count}</b></div>
            <div>Execution Runtime: <b style="color: #ffffff;">${a.execution_time_ms.toFixed(3)} ms</b></div>
            <div>Optimality: <b style="color: #22c55e;">Guaranteed Minimal Cost</b></div>
          </div>
          <div style="font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; color: #cbd5e1; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 6px;">
            ${a.path_names.join(' ➔ ')}
          </div>
        </div>
      </div>

      <!-- Comparative Bar Visuals -->
      <div style="margin-top: 24px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
        <h4 style="font-size: 0.9rem; margin-bottom: 16px; color: #ffffff;">Relative Exploration & Cost Distribution</h4>
        
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span>Route Distance Comparison</span>
            <span class="monospace">GBFS: ${g.total_cost}m vs A*: ${a.total_cost}m</span>
          </div>
          <div style="height: 10px; background: #1e293b; border-radius: 5px; overflow: hidden; display: flex;">
            <div style="width: ${(a.total_cost / Math.max(g.total_cost, a.total_cost)) * 100}%; background: var(--cyan-glow);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span>Nodes Expanded (Search Effort)</span>
            <span class="monospace">GBFS: ${g.expanded_nodes_count} nodes vs A*: ${a.expanded_nodes_count} nodes</span>
          </div>
          <div style="height: 10px; background: #1e293b; border-radius: 5px; overflow: hidden; display: flex;">
            <div style="width: ${(g.expanded_nodes_count / (g.expanded_nodes_count + a.expanded_nodes_count)) * 100}%; background: var(--orange-gbfs);"></div>
            <div style="width: ${(a.expanded_nodes_count / (g.expanded_nodes_count + a.expanded_nodes_count)) * 100}%; background: var(--cyan-glow);"></div>
          </div>
        </div>
      </div>
    `;
  }
}
