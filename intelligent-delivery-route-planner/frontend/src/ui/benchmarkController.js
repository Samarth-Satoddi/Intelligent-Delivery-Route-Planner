/**
 * Benchmark Laboratory Controller: Runs automated experiments across all 3 map topologies.
 */
import { api } from '../api/client.js';

export class BenchmarkController {
  constructor() {
    this.tableBody = document.getElementById('benchmarkTableBody');
    this.btnRun = document.getElementById('btnRerunBenchmarks');
    this.btnExport = document.getElementById('btnExportBenchmarks');
    this.benchmarkData = [];

    this.bindEvents();
  }

  bindEvents() {
    this.btnRun.addEventListener('click', () => this.runBenchmarks());
    this.btnExport.addEventListener('click', () => this.exportCSV());
  }

  async runBenchmarks() {
    this.btnRun.innerText = 'Running Experimental Benchmarks...';
    this.btnRun.disabled = true;

    this.tableBody.innerHTML = `
      <tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);">
        Executing classical AI search algorithms across all campus configurations...
      </td></tr>
    `;

    try {
      this.benchmarkData = await api.getBenchmarks();
      this.renderTable();
    } catch (err) {
      this.tableBody.innerHTML = `
        <tr><td colspan="10" style="text-align:center; padding:30px; color:#ef4444;">
          Failed to load benchmarks: ${err.message}
        </td></tr>
      `;
    } finally {
      this.btnRun.innerText = '⚡ Re-run Full Benchmark Suite';
      this.btnRun.disabled = false;
    }
  }

  renderTable() {
    this.tableBody.innerHTML = '';

    this.benchmarkData.forEach((row) => {
      const tr = document.createElement('tr');
      const isOptimal = row['Excess Cost (%)'] === 0;

      tr.innerHTML = `
        <td><b>${row['Test Map']}</b></td>
        <td>${row['Starting Node']}</td>
        <td>${row['Goal Node']}</td>
        <td class="monospace" style="color:var(--orange-gbfs);">${row['GBFS Cost (m)']}m</td>
        <td class="monospace" style="color:var(--cyan-glow); font-weight:700;">${row['A* Cost (m)']}m</td>
        <td class="monospace">${row['Dijkstra Cost (m)']}m</td>
        <td class="monospace">${row['GBFS Expanded Nodes']}</td>
        <td class="monospace">${row['A* Expanded Nodes']}</td>
        <td class="monospace" style="color:${isOptimal ? '#22c55e' : '#ef4444'}; font-weight:700;">
          ${row['Excess Cost (%)']}%
        </td>
        <td>
          <span class="role-tag ${isOptimal ? 'user' : 'admin'}">
            ${row['Optimality']}
          </span>
        </td>
      `;
      this.tableBody.appendChild(tr);
    });
  }

  exportCSV() {
    if (!this.benchmarkData || this.benchmarkData.length === 0) return;
    const headers = Object.keys(this.benchmarkData[0]).join(',');
    const rows = this.benchmarkData.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campus_delivery_benchmarks.csv';
    a.click();
  }
}
