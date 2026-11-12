/**
 * Route Planner Controller: Manages dispatch inputs, API routing, 3D overlays, and robot controls.
 */
import { api } from '../api/client.js';

export class PlannerController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.currentMapId = 'campus_map';
    this.currentGraph = null;
    this.lastResult = null;
    this.selectedAlgo = 'both';

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.mapSelect = document.getElementById('mapSelect');
    this.startSelect = document.getElementById('startSelect');
    this.goalSelect = document.getElementById('goalSelect');
    this.btnCalculate = document.getElementById('btnCalculateRoute');

    // Algorithm switcher buttons
    this.algoBtns = document.querySelectorAll('.algo-tab');

    // Metrics elements
    this.resultsCard = document.getElementById('plannerMetrics');
    this.metricGbfsCost = document.getElementById('metricGbfsCost');
    this.metricAstarCost = document.getElementById('metricAstarCost');
    this.metricDiff = document.getElementById('metricDiff');
    this.metricExpansions = document.getElementById('metricExpansions');
    this.optimalityBadge = document.getElementById('optimalityBadge');

    // Robot transport elements
    this.robotTransport = document.getElementById('robotTransport');
    this.btnPlay = document.getElementById('btnRobotPlay');
    this.btnPause = document.getElementById('btnRobotPause');
    this.btnReset = document.getElementById('btnRobotReset');
    this.speedSelect = document.getElementById('robotSpeed');
    this.progressFill = document.getElementById('robotProgressFill');
    this.progressText = document.getElementById('robotProgressText');
  }

  bindEvents() {
    this.mapSelect.addEventListener('change', () => this.loadMap(this.mapSelect.value));
    this.btnCalculate.addEventListener('click', () => this.calculateRoute());

    this.algoBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.algoBtns.forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        this.selectedAlgo = e.target.dataset.algo;
      });
    });

    // Robot transport
    this.btnPlay.addEventListener('click', () => this.sceneManager.courierRobot.play());
    this.btnPause.addEventListener('click', () => this.sceneManager.courierRobot.pause());
    this.btnReset.addEventListener('click', () => this.sceneManager.courierRobot.reset());
    this.speedSelect.addEventListener('change', (e) =>
      this.sceneManager.courierRobot.setSpeed(parseFloat(e.target.value))
    );

    // Robot progress callback
    this.sceneManager.courierRobot.onProgress = (info) => {
      if (this.progressFill) this.progressFill.style.width = `${info.percentage}%`;
      if (this.progressText) {
        this.progressText.innerText = `${info.percentage}% (${info.traversedDistance}m) — Leg ${info.currentSegment}/${info.totalSegments}`;
      }
    };

    this.sceneManager.courierRobot.onComplete = () => {
      if (this.progressText) this.progressText.innerText = '✅ Delivery Completed!';
    };

    // Node click in 3D sets destination
    this.sceneManager.onNodeClick = (node) => {
      if (this.goalSelect) {
        this.goalSelect.value = node.id;
      }
    };
  }

  async loadMap(mapId) {
    this.currentMapId = mapId;
    try {
      this.currentGraph = await api.getMapData(mapId);
      this.sceneManager.loadGraph(this.currentGraph);
      this.populateNodeSelects();
      this.resultsCard.style.display = 'none';
      this.robotTransport.style.display = 'none';
    } catch (err) {
      console.error('Failed to load map data:', err);
    }
  }

  populateNodeSelects() {
    this.startSelect.innerHTML = '';
    this.goalSelect.innerHTML = '';

    const nodes = this.currentGraph.nodes || [];
    const defaultStart = this.currentGraph.metadata?.default_start || nodes[0]?.id;
    const defaultDests = this.currentGraph.metadata?.default_destinations || [];

    nodes.forEach((n) => {
      const optStart = document.createElement('option');
      optStart.value = n.id;
      optStart.innerText = `${n.name} (${n.id})`;
      if (n.id === defaultStart) optStart.selected = true;
      this.startSelect.appendChild(optStart);

      const optGoal = document.createElement('option');
      optGoal.value = n.id;
      optGoal.innerText = `${n.name} (${n.id})`;
      if (defaultDests.includes(n.id)) optGoal.selected = true;
      this.goalSelect.appendChild(optGoal);
    });

    if (defaultDests.length > 0) {
      this.goalSelect.value = defaultDests[0];
    }
  }

  async calculateRoute() {
    const start = this.startSelect.value;
    const goal = this.goalSelect.value;

    this.btnCalculate.innerText = 'Calculating Optimal Route...';
    this.btnCalculate.disabled = true;

    try {
      const result = await api.computeRoute(this.currentMapId, start, goal, this.selectedAlgo);
      this.lastResult = result;

      // Render 3D Route Tubes
      this.sceneManager.renderRoutes({
        gbfsPath: result.gbfs?.path,
        astarPath: result.astar?.path,
        goalNodeId: goal,
      });

      // Assign Route to Courier Robot (prefer A* optimal path)
      const robotPath = result.astar?.path || result.gbfs?.path;
      if (robotPath && robotPath.length > 1) {
        this.sceneManager.setCourierRoute(robotPath);
        this.robotTransport.style.display = 'flex';
      }

      this.displayMetrics(result);
    } catch (err) {
      alert(`Route Calculation Failed: ${err.message}`);
    } finally {
      this.btnCalculate.innerText = 'Calculate 3D Delivery Route';
      this.btnCalculate.disabled = false;
    }
  }

  displayMetrics(res) {
    this.resultsCard.style.display = 'block';

    const gbfs = res.gbfs;
    const astar = res.astar;

    if (gbfs) this.metricGbfsCost.innerText = `${gbfs.total_cost.toFixed(1)} m`;
    if (astar) this.metricAstarCost.innerText = `${astar.total_cost.toFixed(1)} m`;

    if (gbfs && astar) {
      const diff = (gbfs.total_cost - astar.total_cost).toFixed(1);
      const excess = res.comparison?.excess_cost_percent || 0;
      this.metricDiff.innerText = `${diff > 0 ? '+' : ''}${diff} m (${excess > 0 ? '+' : ''}${excess}%)`;
      this.metricExpansions.innerText = `${gbfs.expanded_nodes_count} (GBFS) vs ${astar.expanded_nodes_count} (A*)`;

      if (res.comparison?.is_gbfs_optimal) {
        this.optimalityBadge.className = 'role-tag user';
        this.optimalityBadge.innerText = 'OPTIMAL ROUTE MATCH';
      } else {
        this.optimalityBadge.className = 'role-tag admin';
        this.optimalityBadge.innerText = `SUBOPTIMAL GREEDY DETOUR (+${excess}%)`;
      }
    } else {
      const active = astar || gbfs;
      this.metricDiff.innerText = `${active.total_cost.toFixed(1)} m`;
      this.metricExpansions.innerText = `${active.expanded_nodes_count} expanded / ${active.generated_nodes_count} generated`;
    }
  }
}
