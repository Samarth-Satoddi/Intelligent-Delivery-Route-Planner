/**
 * Benchmark Laboratory Controller: Runs automated experiments across all city
 * districts and legacy campus benchmarks with CSV export.
 */
import { api } from '../api/client.js';

export class BenchmarkController {
  constructor() {
    this.tableBody = document.getElementById('benchmarkTableBody');
    this.btnRun = document.getElementById('btnRerunBenchmarks');
    this.btnExport = document.getElementById('btnExportBenchmarks');
    this.tabCity = document.getElementById('tabBenchCity');
    this.tabStandard = document.getElementById('tabBenchStandard');

    this.benchmarkData = [];
    this.currentMode = 'city'; // 'city' or 'standard'

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnRun) {
      this.btnRun.addEventListener('click', () => this.runBenchmarks());
    }
    if (this.btnExport) {
      this.btnExport.addEventListener('click', () => this.exportCSV());
    }

    if (this.tabCity && this.tabStandard) {
      this.tabCity.addEventListener('click', () => {
        this.tabCity.classList.add('active');
        this.tabStandard.classList.remove('active');
        this.currentMode = 'city';
        this.runBenchmarks();
      });

      this.tabStandard.addEventListener('click', () => {
        this.tabStandard.classList.add('active');
        this.tabCity.classList.remove('active');
        this.currentMode = 'standard';
        this.runBenchmarks();
      });
    }
  }

  async runBenchmarks() {
    if (!this.tableBody) return;

    if (this.btnRun) {
      this.btnRun.innerText = 'Executing Benchmarks...';
      this.btnRun.disabled = true;
    }

    this.tableBody.innerHTML = `
      <tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);">
        Executing classical AI search algorithms across ${this.currentMode === 'city' ? 'all 6 smart city districts (32 experiments)' : 'standard demonstration maps'}...
      </td></tr>
    `;

    try {
      const modeParam = this.currentMode === 'city' ? 'smart_city_map' : 'standard';
      this.benchmarkData = await fetch(`/api/benchmarks?map_id=${modeParam}`).then((r) => r.json());
      this.renderTable();
    } catch (err) {
      this.tableBody.innerHTML = `
        <tr><td colspan="10" style="text-align:center; padding:30px; color:#ef4444;">
          Failed to load benchmarks: ${err.message}
        </td></tr>
      `;
    } finally {
      if (this.btnRun) {
        this.btnRun.innerText = '⚡ Re-run Full Suite';
        this.btnRun.disabled = false;
      }
    }
  }

  renderTable() {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';

    this.benchmarkData.forEach((row) => {
      const tr = document.createElement('tr');
      const excess = row['Excess Cost (%)'] || 0;
      const isOptimal = excess === 0;

      const colMap = row['Scenario'] || row['Test Map'] || 'Experiment';
      const colStart = row['Origin'] || row['Starting Node'] || '';
      const colGoal = row['Destination'] || row['Goal Node'] || '';

      tr.innerHTML = `
        <td><b>${colMap}</b></td>
        <td>${colStart}</td>
        <td>${colGoal}</td>
        <td class="monospace" style="color:var(--orange-gbfs);">${row['GBFS Cost (m)']}m</td>
        <td class="monospace" style="color:var(--cyan-glow); font-weight:700;">${row['A* Cost (m)']}m</td>
        <td class="monospace">${row['Dijkstra Cost (m)']}m</td>
        <td class="monospace">${row['GBFS Expanded'] || row['GBFS Expanded Nodes']}</td>
        <td class="monospace">${row['A* Expanded'] || row['A* Expanded Nodes']}</td>
        <td class="monospace" style="color:${isOptimal ? '#22c55e' : '#ef4444'}; font-weight:700;">
          ${excess}%
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
    a.download = `smart_city_${this.currentMode}_benchmarks.csv`;
    a.click();
  }
}
