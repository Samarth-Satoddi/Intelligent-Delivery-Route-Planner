/**
 * Navigation and Modal Window Manager.
 */
import { auth } from '../auth/authManager.js';

export class NavManager {
  constructor(sceneManager, comparisonView, traceController, benchmarkController) {
    this.sceneManager = sceneManager;
    this.comparisonView = comparisonView;
    this.traceController = traceController;
    this.benchmarkController = benchmarkController;

    this.initElements();
    this.bindEvents();
    this.updateAuthUI();
  }

  initElements() {
    this.navPills = document.querySelectorAll('.nav-pill');
    this.floatingDock = document.getElementById('floatingDock');

    // Modals
    this.modalComparison = document.getElementById('modalComparison');
    this.modalTrace = document.getElementById('modalTrace');
    this.modalBenchmarks = document.getElementById('modalBenchmarks');
    this.modalAuth = document.getElementById('modalAuth');
    this.modalProfile = document.getElementById('modalProfile');
    this.modalAdmin = document.getElementById('modalAdmin');

    // Auth trigger & badges
    this.userBadge = document.getElementById('userBadge');
    this.userNameSpan = document.getElementById('userNameSpan');
    this.userRoleTag = document.getElementById('userRoleTag');

    // Camera buttons
    this.camBtns = document.querySelectorAll('.cam-btn');
  }

  bindEvents() {
    // Nav Pills
    this.navPills.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });

    // Close buttons on all modals
    document.querySelectorAll('.close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));
      });
    });

    // User Badge click
    this.userBadge.addEventListener('click', () => {
      if (auth.isAuthenticated()) {
        this.openProfileModal();
      } else {
        this.openAuthModal();
      }
    });

    // Camera presets and District Quick Jumps
    this.camBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        const district = e.currentTarget.dataset.district;
        if (preset) {
          this.sceneManager.setCameraPreset(preset);
        } else if (district) {
          this.sceneManager.focusOnDistrict(district);
        }
      });
    });

    // Listen to Auth state changes
    auth.onChange(() => this.updateAuthUI());
  }

  switchView(view) {
    // Close existing modals
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));
    this.navPills.forEach((p) => p.classList.remove('active'));

    const activePill = document.querySelector(`.nav-pill[data-view="${view}"]`);
    if (activePill) activePill.classList.add('active');

    if (view === 'planner') {
      this.floatingDock.style.display = 'flex';
    } else if (view === 'explorer') {
      this.floatingDock.style.display = 'none';
      this.sceneManager.setCameraPreset('isometric');
    } else if (view === 'comparison') {
      this.floatingDock.style.display = 'flex';
      this.modalComparison.classList.add('active');
      this.comparisonView.render();
    } else if (view === 'trace') {
      this.floatingDock.style.display = 'flex';
      this.modalTrace.classList.add('active');
      this.traceController.render();
    } else if (view === 'benchmarks') {
      this.floatingDock.style.display = 'flex';
      this.modalBenchmarks.classList.add('active');
      this.benchmarkController.runBenchmarks();
    }
  }

  openAuthModal() {
    this.modalAuth.classList.add('active');
  }

  async openProfileModal() {
    const user = auth.getUser();
    if (!user) return;

    document.getElementById('profileName').innerText = user.full_name;
    document.getElementById('profileEmail').innerText = user.email;
    document.getElementById('profileRole').innerText = user.role;

    // Load recent route history from backend
    try {
      const history = await fetch('/api/auth/history', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then((r) => r.json());

      const historyTbody = document.getElementById('profileHistoryBody');
      if (history && history.length > 0) {
        historyTbody.innerHTML = history
          .map(
            (h) => `
          <tr>
            <td>${h.map_id}</td>
            <td>${h.start_node} ➔ ${h.goal_node}</td>
            <td class="monospace">${h.algorithm.toUpperCase()}</td>
            <td class="monospace">${h.astar_cost || h.gbfs_cost || '--'}m</td>
            <td><span class="role-tag ${h.is_optimal ? 'user' : 'admin'}">${h.is_optimal ? 'OPTIMAL' : 'DETOUR'}</span></td>
          </tr>
        `
          )
          .join('');
      } else {
        historyTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">No calculated routes recorded yet.</td></tr>`;
      }
    } catch {
      // Ignore
    }

    this.modalProfile.classList.add('active');
  }

  updateAuthUI() {
    const user = auth.getUser();
    if (user) {
      this.userNameSpan.innerText = user.full_name;
      this.userRoleTag.style.display = 'inline-block';
      this.userRoleTag.className = `role-tag ${user.role === 'ADMIN' ? 'admin' : 'user'}`;
      this.userRoleTag.innerText = user.role;
    } else {
      this.userNameSpan.innerText = 'Sign In / Register';
      this.userRoleTag.style.display = 'none';
    }
  }
}
