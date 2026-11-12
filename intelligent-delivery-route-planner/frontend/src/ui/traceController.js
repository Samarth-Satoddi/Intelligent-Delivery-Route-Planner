/**
 * Search Trace Controller: Step-by-Step Priority Queue Timeline & 3D Node Illumination.
 */
export class TraceController {
  constructor(plannerController, sceneManager) {
    this.planner = plannerController;
    this.sceneManager = sceneManager;
    this.tableBody = document.getElementById('traceTableBody');
    this.stepCounter = document.getElementById('traceStepCounter');
    this.algoSelect = document.getElementById('traceAlgoSelect');
    this.btnPrev = document.getElementById('btnTracePrev');
    this.btnNext = document.getElementById('btnTraceNext');
    this.btnExport = document.getElementById('btnExportTrace');

    this.currentIndex = 0;
    this.currentTrace = [];

    this.bindEvents();
  }

  bindEvents() {
    this.algoSelect.addEventListener('change', () => this.render());
    this.btnPrev.addEventListener('click', () => this.step(-1));
    this.btnNext.addEventListener('click', () => this.step(1));
    this.btnExport.addEventListener('click', () => this.exportCSV());
  }

  render() {
    const res = this.planner.lastResult;
    const algo = this.algoSelect.value;

    if (!res || !res[algo] || !res[algo].search_trace) {
      this.tableBody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-dim);">
          No search trace loaded for ${algo.toUpperCase()}. Calculate a route first.
        </td></tr>
      `;
      this.stepCounter.innerText = 'Step: -- / --';
      return;
    }

    this.currentTrace = res[algo].search_trace;
    this.currentIndex = this.currentTrace.length - 1;
    this.updateTable();
  }

  step(delta) {
    if (this.currentTrace.length === 0) return;
    const nextIdx = this.currentIndex + delta;
    if (nextIdx >= 0 && nextIdx < this.currentTrace.length) {
      this.currentIndex = nextIdx;
      this.updateTable();

      // Focus camera and illuminate node in 3D
      const step = this.currentTrace[this.currentIndex];
      if (step && step['Node ID']) {
        this.sceneManager.focusOnNode(step['Node ID']);
      }
    }
  }

  updateTable() {
    this.tableBody.innerHTML = '';
    this.stepCounter.innerText = `Step ${this.currentIndex + 1} of ${this.currentTrace.length}`;

    this.currentTrace.forEach((step, idx) => {
      const tr = document.createElement('tr');
      if (idx === this.currentIndex) {
        tr.style.background = 'rgba(6, 182, 212, 0.18)';
        tr.style.outline = '1px solid var(--cyan-glow)';
      }

      tr.innerHTML = `
        <td class="monospace">${step.Step}</td>
        <td class="monospace">${step['Node ID']}</td>
        <td><b>${step['Node Name']}</b></td>
        <td class="monospace" style="color:var(--text-muted);">${step.Parent}</td>
        <td class="monospace">${step['g(n) [Cost so far]']}</td>
        <td class="monospace">${step['h(n) [Heuristic to Goal]']}</td>
        <td class="monospace" style="color:var(--cyan-glow); font-weight:700;">${step['f(n) [Evaluation Function]']}</td>
      `;
      this.tableBody.appendChild(tr);
    });
  }

  exportCSV() {
    if (!this.currentTrace || this.currentTrace.length === 0) return;
    const headers = Object.keys(this.currentTrace[0]).join(',');
    const rows = this.currentTrace.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_trace_${this.algoSelect.value}.csv`;
    a.click();
  }
}
