/**
 * Route Planner Controller: Manages city-scale dispatch inputs, district filtering,
 * search queries, API routing, 3D overlays, multiple alternative routes, and robot controls.
 */
import { api } from '../api/client.js';

export class PlannerController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.currentMapId = 'smart_city_map';
    this.currentGraph = null;
    this.lastResult = null;
    this.selectedAlgo = 'both';
    this.selectedDistrict = 'ALL';
    this.searchQuery = '';
    this.activeAlternativeIndex = -1;
    this.displayMode = 'all';

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.mapSelect = document.getElementById('mapSelect');
    this.districtFilter = document.getElementById('districtFilterSelect');
    this.searchInput = document.getElementById('buildingSearchInput');
    this.startSelect = document.getElementById('startSelect');
    this.goalSelect = document.getElementById('goalSelect');
    this.btnCalculate = document.getElementById('btnCalculateRoute');
    this.routeDisplayModeSelect = document.getElementById('routeDisplayModeSelect');

    // Algorithm switcher buttons
    this.algoBtns = document.querySelectorAll('.algo-tab');

    // Metrics elements
    this.resultsCard = document.getElementById('plannerMetrics');
    this.metricGbfsCost = document.getElementById('metricGbfsCost');
    this.metricAstarCost = document.getElementById('metricAstarCost');
    this.metricDiff = document.getElementById('metricDiff');
    this.metricExpansions = document.getElementById('metricExpansions');
    this.optimalityBadge = document.getElementById('optimalityBadge');

    // Alternative Routes elements
    this.altRoutesCard = document.getElementById('alternativeRoutesCard');
    this.altRoutesList = document.getElementById('alternativeRoutesList');

    // Robot transport elements
    this.robotTransport = document.getElementById('robotTransport');
    this.btnPlay = document.getElementById('btnRobotPlay');
    this.btnPause = document.getElementById('btnRobotPause');
    this.btnReset = document.getElementById('btnRobotReset');
    this.btnPrev = document.getElementById('btnRobotPrev');
    this.btnNext = document.getElementById('btnRobotNext');
    this.speedSelect = document.getElementById('robotSpeed');
    this.progressFill = document.getElementById('robotProgressFill');
    this.progressText = document.getElementById('robotProgressText');

    // Robot Telemetry HUD Elements
    this.robotCurrentLocation = document.getElementById('robotCurrentLocation');
    this.robotNextLocation = document.getElementById('robotNextLocation');
    this.robotRemainingDist = document.getElementById('robotRemainingDist');
    this.robotSpeedVal = document.getElementById('robotSpeedVal');
  }

  bindEvents() {
    if (this.mapSelect) {
      this.mapSelect.addEventListener('change', () => this.loadMap(this.mapSelect.value));
    }

    if (this.districtFilter) {
      this.districtFilter.addEventListener('change', (e) => {
        this.selectedDistrict = e.target.value;
        this.populateNodeSelects();
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.populateNodeSelects();
      });
    }

    if (this.btnCalculate) {
      this.btnCalculate.addEventListener('click', () => this.calculateRoute());
    }

    if (this.routeDisplayModeSelect) {
      this.routeDisplayModeSelect.addEventListener('change', (e) => {
        this.displayMode = e.target.value;
        this.update3DRouteVisuals();
      });
    }

    this.algoBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.algoBtns.forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        this.selectedAlgo = e.target.dataset.algo;
      });
    });

    // Robot transport controls
    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => this.sceneManager.courierRobot.play());
    }
    if (this.btnPause) {
      this.btnPause.addEventListener('click', () => this.sceneManager.courierRobot.pause());
    }
    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.sceneManager.courierRobot.reset());
    }
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => this.sceneManager.courierRobot.stepBackward());
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => this.sceneManager.courierRobot.stepForward());
    }
    if (this.speedSelect) {
      this.speedSelect.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        this.sceneManager.courierRobot.setSpeed(val);
      });
    }

    // Live Robot Telemetry callback
    this.sceneManager.courierRobot.onProgress = (info) => {
      if (this.progressFill) this.progressFill.style.width = `${info.percentage}%`;
      if (this.progressText) {
        this.progressText.innerText = `${info.percentage}% (${info.traversedDistance}m / ${info.totalDistance}m) — Leg ${info.currentSegment}/${info.totalSegments}`;
      }
      if (this.robotCurrentLocation) this.robotCurrentLocation.innerText = info.currentLocationName;
      if (this.robotNextLocation) this.robotNextLocation.innerText = info.nextLocationName;
      if (this.robotRemainingDist) this.robotRemainingDist.innerText = `${info.remainingDistance} m`;
      if (this.robotSpeedVal) this.robotSpeedVal.innerText = `${info.speedKmh} km/h`;
    };

    this.sceneManager.courierRobot.onComplete = () => {
      if (this.progressText) {
        this.progressText.innerText = '🎉 Autonomous Delivery Successfully Completed!';
      }
      if (this.robotRemainingDist) this.robotRemainingDist.innerText = '0 m (Delivered)';
    };

    // 3D Node Click sets destination and highlights
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
      if (this.resultsCard) this.resultsCard.style.display = 'none';
      if (this.altRoutesCard) this.altRoutesCard.style.display = 'none';
      if (this.robotTransport) this.robotTransport.style.display = 'none';
    } catch (err) {
      console.error('Failed to load map data:', err);
    }
  }

  populateNodeSelects() {
    if (!this.startSelect || !this.goalSelect || !this.currentGraph) return;

    const currentStart = this.startSelect.value;
    const currentGoal = this.goalSelect.value;

    this.startSelect.innerHTML = '';
    this.goalSelect.innerHTML = '';

    const nodes = this.currentGraph.nodes || [];
    const defaultStart = this.currentGraph.metadata?.default_start || nodes[0]?.id;
    const defaultDests = this.currentGraph.metadata?.default_destinations || [];

    // Filter nodes by district and search query
    const filteredNodes = nodes.filter((n) => {
      const matchDistrict =
        this.selectedDistrict === 'ALL' ||
        (n.district && n.district.toLowerCase() === this.selectedDistrict.toLowerCase());

      const matchSearch =
        !this.searchQuery ||
        n.name.toLowerCase().includes(this.searchQuery) ||
        n.id.toLowerCase().includes(this.searchQuery) ||
        (n.district && n.district.toLowerCase().includes(this.searchQuery));

      return matchDistrict && matchSearch;
    });

    const displayNodes = filteredNodes.length > 0 ? filteredNodes : nodes;

    displayNodes.forEach((n) => {
      const districtTag = n.district ? `[${n.district.replace(' District', '')}] ` : '';
      const optStart = document.createElement('option');
      optStart.value = n.id;
      optStart.innerText = `${districtTag}${n.name}`;
      if (currentStart ? n.id === currentStart : n.id === defaultStart) {
        optStart.selected = true;
      }
      this.startSelect.appendChild(optStart);

      const optGoal = document.createElement('option');
      optGoal.value = n.id;
      optGoal.innerText = `${districtTag}${n.name}`;
      if (currentGoal ? n.id === currentGoal : defaultDests.includes(n.id)) {
        optGoal.selected = true;
      }
      this.goalSelect.appendChild(optGoal);
    });

    if (!this.goalSelect.value && displayNodes.length > 1) {
      this.goalSelect.value = displayNodes[1].id;
    }
  }

  async calculateRoute() {
    const start = this.startSelect.value;
    const goal = this.goalSelect.value;

    if (start === goal) {
      alert('Start and destination locations are identical! Please select different locations.');
      return;
    }

    this.btnCalculate.innerText = 'Calculating Optimal Route...';
    this.btnCalculate.disabled = true;

    try {
      // Request route calculation and Yen's 5 alternative paths
      const result = await api.computeRoute(this.currentMapId, start, goal, this.selectedAlgo, 5);
      this.lastResult = result;
      this.activeAlternativeIndex = -1;

      // Update 3D visualization
      this.update3DRouteVisuals();

      // Default Autonomous Robot Route: prefer A* optimal path
      const robotPath = result.astar?.path || result.gbfs?.path;
      if (robotPath && robotPath.length > 1) {
        this.sceneManager.setCourierRoute(robotPath);
        if (this.robotTransport) this.robotTransport.style.display = 'flex';
      }

      this.displayMetrics(result);
      this.renderAlternativeRoutes(result.alternative_routes || []);
    } catch (err) {
      alert(`Route Calculation Failed: ${err.message}`);
    } finally {
      this.btnCalculate.innerText = '⚡ Calculate 3D Delivery Route';
      this.btnCalculate.disabled = false;
    }
  }

  update3DRouteVisuals() {
    if (!this.lastResult) return;
    const goal = this.goalSelect.value;
    this.sceneManager.renderRoutes({
      gbfsPath: this.lastResult.gbfs?.path,
      astarPath: this.lastResult.astar?.path,
      dijkstraPath: this.lastResult.dijkstra?.path,
      alternativeRoutes: this.lastResult.alternative_routes || [],
      goalNodeId: goal,
      activeAlternativeIndex: this.activeAlternativeIndex,
      displayMode: this.displayMode,
    });
  }

  displayMetrics(res) {
    if (!this.resultsCard) return;
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

  renderAlternativeRoutes(routes) {
    if (!this.altRoutesCard || !this.altRoutesList) return;

    if (!routes || routes.length === 0) {
      this.altRoutesCard.style.display = 'none';
      return;
    }

    this.altRoutesCard.style.display = 'block';
    this.altRoutesList.innerHTML = '';

    routes.forEach((route, idx) => {
      const card = document.createElement('div');
      card.className = `alt-route-card ${idx === 0 ? 'active' : ''}`;
      card.dataset.index = idx;

      const isOpt = route.is_optimal;
      const titleTag = isOpt ? '⭐ Route 1 (Optimal A* / Dijkstra)' : `🔀 Route ${route.route_number} (Alternative)`;

      card.innerHTML = `
        <div class="alt-route-header">
          <span class="alt-route-title">${titleTag}</span>
          <span class="role-tag ${isOpt ? 'user' : 'admin'}">${route.total_distance_m} m</span>
        </div>
        <div class="alt-route-metrics">
          <span>⏱️ ${route.estimated_walking_minutes} mins walking</span>
          <span>📍 ${route.hops} legs (${route.junctions_count} junctions)</span>
        </div>
        <div class="alt-route-districts" title="${route.districts_crossed.join(' ➔ ')}">
          🏛️ ${route.districts_crossed.join(' ➔ ')}
        </div>
        <div style="font-size:0.68rem; color:var(--text-dim); margin-top:4px; font-family:'JetBrains Mono',monospace; line-height:1.4;">
          🛣️ <b>Sequence:</b> ${route.path_names.join(' ➔ ')}
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.alt-route-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.activeAlternativeIndex = idx;

        // Highlight this specific route in 3D
        this.update3DRouteVisuals();

        // Direct courier robot along selected route
        this.sceneManager.setCourierRoute(route.path);
        if (this.robotTransport) this.robotTransport.style.display = 'flex';
      });

      this.altRoutesList.appendChild(card);
    });
  }
}
