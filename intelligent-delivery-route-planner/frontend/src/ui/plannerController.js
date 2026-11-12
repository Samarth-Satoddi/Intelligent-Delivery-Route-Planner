/**
 * Route Planner Controller: Manages 5-stage interactive navigation workflow:
 * Stage 1: Location Selection (Origin & Destination Highlights, Heuristic Arc)
 * Stage 2: AI Search Calculation Replay (Authentic Python Trace, 3D Node Illuminations)
 * Stage 3: Available Routes Comparison (GBFS vs A* vs Dijkstra, Yen's 5 Alternatives)
 * Stage 4: User Road Selection & Confirmation (Isolated 3D Highlight, Sequence Inspection)
 * Stage 5: Live Autonomous Vehicle Movement & Telemetry (Chase-cam, controls, arrival celebration)
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

    // Workflow state
    this.currentStage = 1;
    this.activeAlternativeIndex = 0;
    this.confirmedRoute = null;
    this.displayMode = 'all';

    // Search Trace Playback state
    this.traceAlgo = 'astar';
    this.traceSteps = [];
    this.currentTraceIdx = 0;
    this.traceTimer = null;
    this.traceSpeedMs = 300;
    this.isTracePlaying = false;

    // Vehicle Camera Follow state
    this.isCameraFollow = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Stepper
    this.stepperItems = document.querySelectorAll('.step-item');

    // Stage Panels
    this.stage1Panel = document.getElementById('stage1Panel');
    this.stage2Panel = document.getElementById('stage2Panel');
    this.stage3Panel = document.getElementById('stage3Panel');
    this.stage4Panel = document.getElementById('stage4Panel');
    this.stage5Panel = document.getElementById('stage5Panel');

    // Stage 1 Inputs
    this.districtFilter = document.getElementById('districtFilterSelect');
    this.searchInput = document.getElementById('buildingSearchInput');
    this.startSelect = document.getElementById('startSelect');
    this.goalSelect = document.getElementById('goalSelect');
    this.btnCalculate = document.getElementById('btnCalculateRoute');
    this.algoBtns = document.querySelectorAll('.algo-tab[data-algo]');

    // Stage 2 Trace Elements
    this.traceAlgoBtns = document.querySelectorAll('.algo-tab[data-trace-algo]');
    this.traceCurrentNode = document.getElementById('traceCurrentNode');
    this.traceGVal = document.getElementById('traceGVal');
    this.traceHVal = document.getElementById('traceHVal');
    this.traceFVal = document.getElementById('traceFVal');
    this.traceExpandedCount = document.getElementById('traceExpandedCount');
    this.traceFrontierCount = document.getElementById('traceFrontierCount');
    this.traceStepNum = document.getElementById('traceStepNum');
    this.traceTotalSteps = document.getElementById('traceTotalSteps');
    this.traceSpeedSelect = document.getElementById('traceSpeedSelect');
    this.btnTracePlay = document.getElementById('btnTracePlay');
    this.btnTracePause = document.getElementById('btnTracePause');
    this.btnTracePrev = document.getElementById('btnTracePrev');
    this.btnTraceNext = document.getElementById('btnTraceNext');
    this.btnTraceReset = document.getElementById('btnTraceReset');
    this.traceMiniTableBody = document.getElementById('traceMiniTableBody');
    this.btnProceedToStage3 = document.getElementById('btnProceedToStage3');

    // Stage 3 Comparison Elements
    this.metricGbfsCost = document.getElementById('metricGbfsCost');
    this.metricAstarCost = document.getElementById('metricAstarCost');
    this.metricDiff = document.getElementById('metricDiff');
    this.metricExpansions = document.getElementById('metricExpansions');
    this.optimalityBadge = document.getElementById('optimalityBadge');
    this.routeDisplayModeSelect = document.getElementById('routeDisplayModeSelect');
    this.altRoutesList = document.getElementById('alternativeRoutesList');
    this.btnBackToStage1 = document.getElementById('btnBackToStage1');

    // Stage 4 Confirmation Elements
    this.selectedRouteTitle = document.getElementById('selectedRouteTitle');
    this.selectedRouteDist = document.getElementById('selectedRouteDist');
    this.selectedRouteTime = document.getElementById('selectedRouteTime');
    this.selectedRouteLegs = document.getElementById('selectedRouteLegs');
    this.selectedRouteSequence = document.getElementById('selectedRouteSequence');
    this.btnConfirmRoute = document.getElementById('btnConfirmRoute');
    this.btnBackToStage3 = document.getElementById('btnBackToStage3');

    // Stage 5 Vehicle Controls & Telemetry
    this.btnStartDeliveryAction = document.getElementById('btnStartDeliveryAction');
    this.btnToggleCamFollow = document.getElementById('btnToggleCamFollow');
    this.speedSelect = document.getElementById('robotSpeed');
    this.robotCurrentLocation = document.getElementById('robotCurrentLocation');
    this.robotNextLocation = document.getElementById('robotNextLocation');
    this.robotRemainingDist = document.getElementById('robotRemainingDist');
    this.robotSpeedVal = document.getElementById('robotSpeedVal');
    this.progressFill = document.getElementById('robotProgressFill');
    this.progressText = document.getElementById('robotProgressText');
    this.btnRobotPlay = document.getElementById('btnRobotPlay');
    this.btnRobotPause = document.getElementById('btnRobotPause');
    this.btnRobotPrev = document.getElementById('btnRobotPrev');
    this.btnRobotNext = document.getElementById('btnRobotNext');
    this.btnRobotReset = document.getElementById('btnRobotReset');
    this.deliveryCompletedCard = document.getElementById('deliveryCompletedCard');
    this.completedSummaryText = document.getElementById('completedSummaryText');
    this.btnPlanAnotherDelivery = document.getElementById('btnPlanAnotherDelivery');
  }

  bindEvents() {
    // Stepper Item Clicks (Allow user to revisit earlier stages)
    this.stepperItems.forEach((item) => {
      item.addEventListener('click', () => {
        const targetStage = parseInt(item.dataset.stage, 10);
        if (targetStage < this.currentStage || this.lastResult) {
          this.goToStage(targetStage);
        }
      });
    });

    // Stage 1 Filtering & Selection
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

    if (this.startSelect) {
      this.startSelect.addEventListener('change', () => this.updateOriginDestinationHighlights());
    }
    if (this.goalSelect) {
      this.goalSelect.addEventListener('change', () => this.updateOriginDestinationHighlights());
    }

    this.algoBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.algoBtns.forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        this.selectedAlgo = e.target.dataset.algo;
      });
    });

    if (this.btnCalculate) {
      this.btnCalculate.addEventListener('click', () => this.calculateRoute());
    }

    // Stage 2 Trace Events
    this.traceAlgoBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.traceAlgoBtns.forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        this.traceAlgo = e.target.dataset.traceAlgo;
        this.loadSearchTrace(this.traceAlgo);
      });
    });

    if (this.btnTracePlay) {
      this.btnTracePlay.addEventListener('click', () => this.playTrace());
    }
    if (this.btnTracePause) {
      this.btnTracePause.addEventListener('click', () => this.pauseTrace());
    }
    if (this.btnTracePrev) {
      this.btnTracePrev.addEventListener('click', () => this.stepTrace(-1));
    }
    if (this.btnTraceNext) {
      this.btnTraceNext.addEventListener('click', () => this.stepTrace(1));
    }
    if (this.btnTraceReset) {
      this.btnTraceReset.addEventListener('click', () => this.resetTrace());
    }
    if (this.traceSpeedSelect) {
      this.traceSpeedSelect.addEventListener('change', (e) => {
        const factor = parseFloat(e.target.value);
        this.traceSpeedMs = Math.round(600 / factor);
        if (this.isTracePlaying) {
          this.pauseTrace();
          this.playTrace();
        }
      });
    }
    if (this.btnProceedToStage3) {
      this.btnProceedToStage3.addEventListener('click', () => this.goToStage(3));
    }

    // Stage 3 Comparison Events
    if (this.routeDisplayModeSelect) {
      this.routeDisplayModeSelect.addEventListener('change', (e) => {
        this.displayMode = e.target.value;
        this.update3DRouteVisuals();
      });
    }
    if (this.btnBackToStage1) {
      this.btnBackToStage1.addEventListener('click', () => this.goToStage(1));
    }

    // Stage 4 Confirmation Events
    if (this.btnConfirmRoute) {
      this.btnConfirmRoute.addEventListener('click', () => {
        this.confirmSelectedRoute();
      });
    }
    if (this.btnBackToStage3) {
      this.btnBackToStage3.addEventListener('click', () => this.goToStage(3));
    }

    // Stage 5 Vehicle Events
    if (this.btnStartDeliveryAction) {
      this.btnStartDeliveryAction.addEventListener('click', () => {
        this.sceneManager.courierRobot.play();
        this.btnStartDeliveryAction.style.display = 'none';
        if (this.progressText) {
          this.progressText.innerText = 'Vehicle dispatched en route to destination...';
        }
      });
    }

    if (this.btnToggleCamFollow) {
      this.btnToggleCamFollow.addEventListener('click', () => {
        this.isCameraFollow = !this.isCameraFollow;
        this.sceneManager.setCameraFollow(this.isCameraFollow);
        this.btnToggleCamFollow.innerText = this.isCameraFollow
          ? '🎥 Follow Camera: ON'
          : '🎥 Follow Camera: OFF';
        this.btnToggleCamFollow.classList.toggle('active', this.isCameraFollow);
      });
    }

    this.sceneManager.onCameraFollowDisabled = () => {
      this.isCameraFollow = false;
      if (this.btnToggleCamFollow) {
        this.btnToggleCamFollow.innerText = '🎥 Follow Camera: OFF';
        this.btnToggleCamFollow.classList.remove('active');
      }
    };

    if (this.btnRobotPlay) {
      this.btnRobotPlay.addEventListener('click', () => this.sceneManager.courierRobot.play());
    }
    if (this.btnRobotPause) {
      this.btnRobotPause.addEventListener('click', () => this.sceneManager.courierRobot.pause());
    }
    if (this.btnRobotReset) {
      this.btnRobotReset.addEventListener('click', () => {
        this.sceneManager.courierRobot.reset();
        if (this.btnStartDeliveryAction) this.btnStartDeliveryAction.style.display = 'block';
      });
    }
    if (this.btnRobotPrev) {
      this.btnRobotPrev.addEventListener('click', () => this.sceneManager.courierRobot.stepBackward());
    }
    if (this.btnRobotNext) {
      this.btnRobotNext.addEventListener('click', () => this.sceneManager.courierRobot.stepForward());
    }
    if (this.speedSelect) {
      this.speedSelect.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        this.sceneManager.courierRobot.setSpeed(val);
      });
    }

    if (this.btnPlanAnotherDelivery) {
      this.btnPlanAnotherDelivery.addEventListener('click', () => this.goToStage(1));
    }

    // Courier Robot Live Telemetry Callbacks
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
      if (this.robotRemainingDist) this.robotRemainingDist.innerText = '0 m (Arrived)';
      if (this.deliveryCompletedCard) {
        this.deliveryCompletedCard.style.display = 'block';
        if (this.completedSummaryText) {
          const goalName = this.currentGraph?.nodes?.find(n => n.id === this.goalSelect.value)?.name || 'Destination';
          const dist = this.confirmedRoute?.total_distance_m || 0;
          this.completedSummaryText.innerText = `Successfully delivered materials to ${goalName}. Total physical route distance travelled: ${dist} m.`;
        }
      }
    };

    // 3D Node Click sets destination and updates highlights
    this.sceneManager.onNodeClick = (node) => {
      if (this.currentStage === 1 && this.goalSelect) {
        this.goalSelect.value = node.id;
        this.updateOriginDestinationHighlights();
      }
    };
  }

  // --- STAGE SWITCHING STATE MACHINE ---
  goToStage(stage) {
    this.currentStage = stage;
    this.pauseTrace();

    // 1. Update Stepper Header
    this.stepperItems.forEach((item) => {
      const s = parseInt(item.dataset.stage, 10);
      item.classList.remove('active', 'completed');
      if (s === stage) {
        item.classList.add('active');
      } else if (s < stage) {
        item.classList.add('completed');
      }
    });

    // 2. Hide all panels, show active panel
    [this.stage1Panel, this.stage2Panel, this.stage3Panel, this.stage4Panel, this.stage5Panel].forEach((p) => {
      if (p) p.style.display = 'none';
    });

    if (stage === 1 && this.stage1Panel) this.stage1Panel.style.display = 'flex';
    if (stage === 2 && this.stage2Panel) this.stage2Panel.style.display = 'flex';
    if (stage === 3 && this.stage3Panel) this.stage3Panel.style.display = 'flex';
    if (stage === 4 && this.stage4Panel) this.stage4Panel.style.display = 'flex';
    if (stage === 5 && this.stage5Panel) this.stage5Panel.style.display = 'flex';

    // 3. Stage-specific 3D scene behaviors
    if (stage === 1) {
      this.sceneManager.clearSearchTrace();
      this.sceneManager.routeRenderer.clear();
      this.sceneManager.courierRobot.mesh.visible = false;
      this.updateOriginDestinationHighlights();
    } else if (stage === 2) {
      this.sceneManager.clearOriginDestinationGuide();
      this.sceneManager.routeRenderer.clear();
      this.sceneManager.courierRobot.mesh.visible = false;
      this.loadSearchTrace(this.traceAlgo);
    } else if (stage === 3) {
      this.sceneManager.clearSearchTrace();
      this.displayMode = 'all';
      if (this.routeDisplayModeSelect) this.routeDisplayModeSelect.value = 'all';
      this.update3DRouteVisuals();
      this.sceneManager.courierRobot.mesh.visible = false;
    } else if (stage === 4) {
      this.sceneManager.clearSearchTrace();
      this.displayMode = 'selected';
      if (this.routeDisplayModeSelect) this.routeDisplayModeSelect.value = 'selected';
      this.update3DRouteVisuals();
      this.updateSelectedRouteCard();
      this.sceneManager.courierRobot.mesh.visible = false;
    } else if (stage === 5) {
      this.sceneManager.clearSearchTrace();
      this.displayMode = 'selected';
      this.update3DRouteVisuals();
      if (this.confirmedRoute) {
        this.sceneManager.setCourierRoute(this.confirmedRoute.path);
        if (this.btnStartDeliveryAction) this.btnStartDeliveryAction.style.display = 'block';
        if (this.deliveryCompletedCard) this.deliveryCompletedCard.style.display = 'none';
      }
    }
  }

  // --- STAGE 1: LOAD MAP & POPULATE ---
  async loadMap(mapId) {
    this.currentMapId = mapId;
    try {
      this.currentGraph = await api.getMapData(mapId);
      this.sceneManager.loadGraph(this.currentGraph);
      this.populateNodeSelects();
      this.goToStage(1);
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
    const defaultStart = this.currentGraph.metadata?.default_start || 'central_office';
    const defaultDests = this.currentGraph.metadata?.default_destinations || ['central_library'];

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

    this.updateOriginDestinationHighlights();
  }

  updateOriginDestinationHighlights() {
    const start = this.startSelect?.value;
    const goal = this.goalSelect?.value;
    if (this.currentStage === 1 && start && goal) {
      this.sceneManager.renderOriginDestinationGuide(start, goal);
    }
  }

  // --- STAGE 2: REAL AI ROUTE CALCULATION & SEARCH TRACE ---
  async calculateRoute() {
    const start = this.startSelect.value;
    const goal = this.goalSelect.value;

    if (start === goal) {
      alert('Start and destination locations are identical! Please select different locations.');
      return;
    }

    this.btnCalculate.innerText = 'Calculating AI Routes...';
    this.btnCalculate.disabled = true;

    try {
      // Call FastAPI backend: returns GBFS, A*, Dijkstra, and Yen's 5 alternative paths
      const result = await api.computeRoute(this.currentMapId, start, goal, this.selectedAlgo, 5);
      this.lastResult = result;
      this.activeAlternativeIndex = 0;
      this.confirmedRoute = (result.alternative_routes && result.alternative_routes[0]) || {
        route_number: 1,
        path: result.astar?.path || result.gbfs?.path,
        path_names: result.astar?.path_names || result.gbfs?.path_names,
        total_distance_m: result.astar?.total_cost || result.gbfs?.total_cost,
        estimated_walking_minutes: ((result.astar?.total_cost || 0) / 1.4 / 60).toFixed(1),
        hops: (result.astar?.path?.length || 1) - 1,
        junctions_count: 0,
        districts_crossed: [],
        is_optimal: true,
      };

      // Populate Stage 3 Metrics & Cards
      this.displayMetrics(result);
      this.renderAlternativeRoutes(result.alternative_routes || []);

      // Advance directly to Stage 2: AI Search Calculation Replay
      this.goToStage(2);
    } catch (err) {
      alert(`Route Calculation Failed: ${err.message}`);
    } finally {
      this.btnCalculate.innerText = '⚡ Calculate AI Routes';
      this.btnCalculate.disabled = false;
    }
  }

  loadSearchTrace(algo) {
    if (!this.lastResult || !this.lastResult[algo] || !this.lastResult[algo].search_trace) {
      this.traceSteps = [];
      this.currentTraceIdx = 0;
      return;
    }

    this.traceSteps = this.lastResult[algo].search_trace;
    this.currentTraceIdx = 0;
    if (this.traceTotalSteps) this.traceTotalSteps.innerText = this.traceSteps.length;
    this.renderTraceStep(0);
    this.populateMiniTraceTable();
  }

  renderTraceStep(index) {
    if (!this.traceSteps || this.traceSteps.length === 0) return;
    const idx = Math.max(0, Math.min(index, this.traceSteps.length - 1));
    this.currentTraceIdx = idx;

    const step = this.traceSteps[idx];
    if (this.traceStepNum) this.traceStepNum.innerText = idx + 1;
    if (this.traceCurrentNode) this.traceCurrentNode.innerText = step['Node Name'] || step['Node ID'];
    if (this.traceGVal) this.traceGVal.innerText = step['g(n) [Cost so far]'] ?? '--';
    if (this.traceHVal) this.traceHVal.innerText = step['h(n) [Heuristic to Goal]'] ?? '--';
    if (this.traceFVal) this.traceFVal.innerText = step['f(n) [Evaluation Function]'] ?? '--';
    if (this.traceExpandedCount) this.traceExpandedCount.innerText = idx + 1;
    if (this.traceFrontierCount) this.traceFrontierCount.innerText = step['Frontier Size'] ?? 0;

    // Gather visited node IDs up to current step
    const visitedIds = [];
    for (let i = 0; i <= idx; i++) {
      const id = this.traceSteps[i]['Node ID'];
      if (!visitedIds.includes(id)) visitedIds.push(id);
    }

    // 3D Visual Illumination
    this.sceneManager.renderSearchTraceStep(step, visitedIds, [], this.traceAlgo);
    this.sceneManager.focusOnNode(step['Node ID']);

    // Highlight row in mini table
    if (this.traceMiniTableBody) {
      const rows = this.traceMiniTableBody.querySelectorAll('tr');
      rows.forEach((r, i) => {
        if (i === idx) {
          r.style.background = 'rgba(6, 182, 212, 0.25)';
          r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
          r.style.background = 'transparent';
        }
      });
    }
  }

  populateMiniTraceTable() {
    if (!this.traceMiniTableBody || !this.traceSteps) return;
    this.traceMiniTableBody.innerHTML = '';

    this.traceSteps.forEach((step, idx) => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td style="padding:3px 6px; color:var(--text-dim);">${idx + 1}</td>
        <td style="padding:3px 6px; font-weight:600; color:#fff;">${step['Node Name'] || step['Node ID']}</td>
        <td style="padding:3px 6px; text-align:right;">${step['g(n) [Cost so far]'] ?? '-'}</td>
        <td style="padding:3px 6px; text-align:right;">${step['h(n) [Heuristic to Goal]'] ?? '-'}</td>
        <td style="padding:3px 6px; text-align:right; color:var(--cyan-glow); font-weight:700;">${step['f(n) [Evaluation Function]'] ?? '-'}</td>
      `;
      tr.addEventListener('click', () => {
        this.pauseTrace();
        this.renderTraceStep(idx);
      });
      this.traceMiniTableBody.appendChild(tr);
    });
  }

  playTrace() {
    if (this.isTracePlaying) return;
    this.isTracePlaying = true;
    if (this.btnTracePlay) this.btnTracePlay.innerText = '▶ Playing';

    this.traceTimer = setInterval(() => {
      if (this.currentTraceIdx < this.traceSteps.length - 1) {
        this.renderTraceStep(this.currentTraceIdx + 1);
      } else {
        this.pauseTrace();
      }
    }, this.traceSpeedMs);
  }

  pauseTrace() {
    this.isTracePlaying = false;
    if (this.traceTimer) {
      clearInterval(this.traceTimer);
      this.traceTimer = null;
    }
    if (this.btnTracePlay) this.btnTracePlay.innerText = '▶ Play';
  }

  stepTrace(delta) {
    this.pauseTrace();
    this.renderTraceStep(this.currentTraceIdx + delta);
  }

  resetTrace() {
    this.pauseTrace();
    this.renderTraceStep(0);
  }

  // --- STAGE 3: AVAILABLE ROUTES COMPARISON ---
  displayMetrics(res) {
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
    }
  }

  renderAlternativeRoutes(routes) {
    if (!this.altRoutesList) return;
    this.altRoutesList.innerHTML = '';

    const optimalDist = routes[0]?.total_distance_m || 0;

    routes.forEach((route, idx) => {
      const card = document.createElement('div');
      card.className = `alt-route-card ${idx === this.activeAlternativeIndex ? 'active' : ''}`;
      card.dataset.index = idx;

      const isOpt = route.is_optimal;
      const titleTag = isOpt ? '⭐ Route 1 (Optimal A* / Dijkstra)' : `🔀 Route ${route.route_number} (Alternative)`;
      const deltaM = Math.max(0, Math.round((route.total_distance_m - optimalDist) * 10) / 10);
      const deltaTag = deltaM > 0 ? `+${deltaM} m` : 'Least Cost';

      card.innerHTML = `
        <div class="alt-route-header">
          <span class="alt-route-title">${titleTag}</span>
          <span class="role-tag ${isOpt ? 'user' : 'admin'}">${route.total_distance_m} m (${deltaTag})</span>
        </div>
        <div class="alt-route-metrics">
          <span>⏱️ ${route.estimated_walking_minutes} mins travel</span>
          <span>📍 ${route.hops} legs (${route.junctions_count} junctions)</span>
        </div>
        <div class="alt-route-districts" title="${route.districts_crossed.join(' ➔ ')}">
          🏛️ ${route.districts_crossed.join(' ➔ ')}
        </div>
        <div style="font-size:0.68rem; color:var(--text-dim); margin-top:4px; font-family:'JetBrains Mono',monospace; line-height:1.4;">
          🛣️ <b>Sequence:</b> ${route.path_names.join(' ➔ ')}
        </div>
      `;

      // Hover previews route in 3D
      card.addEventListener('mouseenter', () => {
        this.sceneManager.renderRoutes({
          gbfsPath: this.lastResult?.gbfs?.path,
          astarPath: this.lastResult?.astar?.path,
          dijkstraPath: this.lastResult?.dijkstra?.path,
          alternativeRoutes: routes,
          goalNodeId: this.goalSelect.value,
          activeAlternativeIndex: idx,
          displayMode: 'selected',
        });
      });

      card.addEventListener('mouseleave', () => {
        if (this.currentStage === 3) {
          this.update3DRouteVisuals();
        }
      });

      // Click selects this route and transitions to Stage 4 (User Road Selection & Confirmation)
      card.addEventListener('click', () => {
        this.activeAlternativeIndex = idx;
        this.confirmedRoute = route;
        this.goToStage(4);
      });

      this.altRoutesList.appendChild(card);
    });
  }

  // --- STAGE 4: USER ROAD SELECTION & CONFIRMATION ---
  updateSelectedRouteCard() {
    if (!this.confirmedRoute) return;
    const r = this.confirmedRoute;
    const isOpt = r.is_optimal;

    if (this.selectedRouteTitle) {
      this.selectedRouteTitle.innerText = isOpt
        ? `⭐ Route ${r.route_number || 1} (Optimal Minimum Cost)`
        : `🔀 Route ${r.route_number} (Selected Alternative Road)`;
    }
    if (this.selectedRouteDist) this.selectedRouteDist.innerText = `${r.total_distance_m} m`;
    if (this.selectedRouteTime) this.selectedRouteTime.innerText = `${r.estimated_walking_minutes} mins`;
    if (this.selectedRouteLegs) this.selectedRouteLegs.innerText = `${r.hops} legs (${r.junctions_count || 0} junctions)`;
    if (this.selectedRouteSequence) {
      this.selectedRouteSequence.innerHTML = r.path_names.join(' <span style="color:var(--cyan-glow);">➔</span> ');
    }
  }

  confirmSelectedRoute() {
    if (!this.confirmedRoute) return;
    this.goToStage(5);
  }

  // --- 3D VISUAL SYNCHRONIZATION ---
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
}
