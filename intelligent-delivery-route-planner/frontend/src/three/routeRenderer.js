/**
 * 3D Route Renderer: Renders glowing tubular pathways for GBFS, A*, Dijkstra,
 * and Yen's K-Shortest Alternative Routes, directional flow chevrons,
 * origin-destination guidance arcs, and live search-trace expansion visualizer.
 */
import * as THREE from 'three';

export class RouteRenderer {
  constructor(scene, campusBuilder) {
    this.scene = scene;
    this.campusBuilder = campusBuilder;

    this.routeGroup = new THREE.Group();
    this.selectionGroup = new THREE.Group();
    this.traceGroup = new THREE.Group();

    this.scene.add(this.routeGroup);
    this.scene.add(this.selectionGroup);
    this.scene.add(this.traceGroup);

    this.activeMeshes = [];
    this.directionalArrows = [];
    this.targetBeam = null;
    this.displayMode = 'all'; // 'all' or 'selected'
  }

  clear() {
    this.routeGroup.clear();
    this.activeMeshes = [];
    this.directionalArrows = [];
    this.targetBeam = null;
  }

  clearAll() {
    this.clear();
    this.clearOriginDestinationGuide();
    this.clearSearchTrace();
  }

  setDisplayMode(mode) {
    this.displayMode = mode;
  }

  // --- STAGE 1: ORIGIN & DESTINATION 3D HIGHLIGHTS & HEURISTIC GUIDE ---
  renderOriginDestinationGuide(startNodeId, goalNodeId) {
    this.selectionGroup.clear();
    if (!startNodeId || !goalNodeId) return;

    const p1 = this.campusBuilder.getNodeWorldPos(startNodeId);
    const p2 = this.campusBuilder.getNodeWorldPos(goalNodeId);
    if (!p1 || !p2) return;

    // 1. Green Dispatch Marker Ring at Start Location
    const startRingGeo = new THREE.RingGeometry(4.0, 5.0, 32);
    startRingGeo.rotateX(-Math.PI / 2);
    const startRingMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const startRing = new THREE.Mesh(startRingGeo, startRingMat);
    startRing.position.set(p1.x, 0.08, p1.z);
    this.selectionGroup.add(startRing);

    // Start Location Vertical Beacon
    const startBeamGeo = new THREE.CylinderGeometry(0.4, 0.4, 18, 12);
    const startBeamMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.35,
    });
    const startBeam = new THREE.Mesh(startBeamGeo, startBeamMat);
    startBeam.position.set(p1.x, 9.0, p1.z);
    this.selectionGroup.add(startBeam);

    // 2. Red/Cyan Target Rings & Laser at Goal Location
    const goalRingGeo = new THREE.RingGeometry(4.2, 5.5, 32);
    goalRingGeo.rotateX(-Math.PI / 2);
    const goalRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const goalRing = new THREE.Mesh(goalRingGeo, goalRingMat);
    goalRing.position.set(p2.x, 0.08, p2.z);
    this.selectionGroup.add(goalRing);

    const goalBeamGeo = new THREE.CylinderGeometry(0.6, 2.0, 35, 16);
    const goalBeamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.4,
    });
    const goalBeam = new THREE.Mesh(goalBeamGeo, goalBeamMat);
    goalBeam.position.set(p2.x, 17.5, p2.z);
    this.selectionGroup.add(goalBeam);

    // 3. Elevated Arched Heuristic Guide Line connecting Start and Destination
    const dist = p1.distanceTo(p2);
    const archHeight = Math.min(Math.max(dist * 0.18, 12.0), 45.0);
    const midPoint = new THREE.Vector3(
      (p1.x + p2.x) / 2,
      archHeight,
      (p1.z + p2.z) / 2
    );

    const curve = new THREE.QuadraticBezierCurve3(
      p1.clone().add(new THREE.Vector3(0, 1.5, 0)),
      midPoint,
      p2.clone().add(new THREE.Vector3(0, 1.5, 0))
    );

    const guideGeo = new THREE.TubeGeometry(curve, 40, 0.22, 6, false);
    const guideMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
    });
    const guideMesh = new THREE.Mesh(guideGeo, guideMat);
    this.selectionGroup.add(guideMesh);
  }

  clearOriginDestinationGuide() {
    this.selectionGroup.clear();
  }

  // --- STAGE 2: LIVE SEARCH TRACE NODE EXPANSION VISUALIZER ---
  renderSearchTraceStep(step, visitedNodeIds = [], frontierNodeIds = [], algo = 'astar') {
    this.traceGroup.clear();
    if (!step) return;

    const mainColor = algo === 'gbfs' ? 0xf97316 : 0x06b6d4;
    const frontierColor = 0xfacc15; // Golden amber

    // 1. Highlight Currently Expanded Node with Radiant Beacon
    const currId = step['Node ID'] || step.node;
    const currPos = this.campusBuilder.getNodeWorldPos(currId);
    if (currPos) {
      const beamGeo = new THREE.CylinderGeometry(0.8, 2.2, 28, 16);
      const beamMat = new THREE.MeshBasicMaterial({
        color: mainColor,
        transparent: true,
        opacity: 0.7,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(currPos.x, 14.0, currPos.z);
      this.traceGroup.add(beam);

      const pulseRingGeo = new THREE.RingGeometry(3.5, 5.0, 32);
      pulseRingGeo.rotateX(-Math.PI / 2);
      const pulseRingMat = new THREE.MeshBasicMaterial({
        color: mainColor,
        side: THREE.DoubleSide,
      });
      const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
      pulseRing.position.set(currPos.x, 0.15, currPos.z);
      this.traceGroup.add(pulseRing);
    }

    // 2. Examined Road Connection to Parent
    const parentId = step.Parent || step.parent;
    if (parentId && parentId !== 'None' && !parentId.includes('None')) {
      const parentPos = this.campusBuilder.getNodeWorldPos(parentId);
      if (parentPos && currPos) {
        const edgePoints = [
          parentPos.clone().add(new THREE.Vector3(0, 0.35, 0)),
          currPos.clone().add(new THREE.Vector3(0, 0.35, 0)),
        ];
        const edgeCurve = new THREE.CatmullRomCurve3(edgePoints);
        const edgeGeo = new THREE.TubeGeometry(edgeCurve, 10, 0.45, 8, false);
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
        this.traceGroup.add(edgeMesh);
      }
    }

    // 3. Mark Previously Visited / Closed Nodes (Subtle rings)
    visitedNodeIds.forEach((nid) => {
      if (nid === currId) return;
      const pos = this.campusBuilder.getNodeWorldPos(nid);
      if (pos) {
        const vRingGeo = new THREE.RingGeometry(2.0, 2.8, 16);
        vRingGeo.rotateX(-Math.PI / 2);
        const vRingMat = new THREE.MeshBasicMaterial({
          color: mainColor,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        });
        const vRing = new THREE.Mesh(vRingGeo, vRingMat);
        vRing.position.set(pos.x, 0.12, pos.z);
        this.traceGroup.add(vRing);
      }
    });

    // 4. Mark Discovered Frontier Nodes (Amber dots)
    frontierNodeIds.forEach((nid) => {
      if (nid === currId || visitedNodeIds.includes(nid)) return;
      const pos = this.campusBuilder.getNodeWorldPos(nid);
      if (pos) {
        const fRingGeo = new THREE.RingGeometry(2.2, 3.2, 16);
        fRingGeo.rotateX(-Math.PI / 2);
        const fRingMat = new THREE.MeshBasicMaterial({
          color: frontierColor,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
        });
        const fRing = new THREE.Mesh(fRingGeo, fRingMat);
        fRing.position.set(pos.x, 0.14, pos.z);
        this.traceGroup.add(fRing);
      }
    });
  }

  clearSearchTrace() {
    this.traceGroup.clear();
  }

  // --- STAGES 3 & 4: 3D TUBE PATHWAYS WITH DIRECTIONAL FLOW CHEVRONS ---
  renderRoutes({
    gbfsPath = null,
    astarPath = null,
    dijkstraPath = null,
    alternativeRoutes = [],
    goalNodeId = null,
    activeAlternativeIndex = -1,
    displayMode = 'all',
  }) {
    this.clear();
    this.displayMode = displayMode;

    const hasGBFS = gbfsPath && gbfsPath.length > 1;
    const hasAStar = astarPath && astarPath.length > 1;
    const hasActiveAlt = activeAlternativeIndex >= 0 && alternativeRoutes[activeAlternativeIndex];

    const altColors = [0x06b6d4, 0xa855f7, 0xf59e0b, 0x10b981, 0xf43f5e, 0x6366f1];

    if (this.displayMode === 'selected') {
      // Show ONLY the single active / selected route
      if (hasActiveAlt) {
        const altRoute = alternativeRoutes[activeAlternativeIndex];
        const color = altColors[activeAlternativeIndex % altColors.length];
        const mesh = this.createTubularPath(altRoute.path, color, new THREE.Vector3(0, 0.5, 0), 0.68, true);
        this.routeGroup.add(mesh);
      } else if (hasAStar) {
        const mesh = this.createTubularPath(astarPath, 0x06b6d4, new THREE.Vector3(0, 0.5, 0), 0.68, true);
        this.routeGroup.add(mesh);
      } else if (hasGBFS) {
        const mesh = this.createTubularPath(gbfsPath, 0xf97316, new THREE.Vector3(0, 0.5, 0), 0.68, true);
        this.routeGroup.add(mesh);
      }
    } else {
      // Show All Compared Routes simultaneously
      // 1. Draw GBFS Route (Orange Glowing Tube)
      if (hasGBFS) {
        const offset = hasAStar ? new THREE.Vector3(-0.8, 0.45, -0.8) : new THREE.Vector3(0, 0.45, 0);
        const gbfsMesh = this.createTubularPath(gbfsPath, 0xf97316, offset, 0.46, !hasAStar && !hasActiveAlt);
        this.routeGroup.add(gbfsMesh);
        this.activeMeshes.push(gbfsMesh);
      }

      // 2. Draw A* Route (Cyan Glowing Tube - Primary Optimal Baseline)
      if (hasAStar) {
        const offset = hasGBFS ? new THREE.Vector3(0.8, 0.45, 0.8) : new THREE.Vector3(0, 0.45, 0);
        const astarMesh = this.createTubularPath(astarPath, 0x06b6d4, offset, 0.52, !hasActiveAlt);
        this.routeGroup.add(astarMesh);
        this.activeMeshes.push(astarMesh);
      }

      // 3. Draw Active Alternative Route if selected by user
      if (hasActiveAlt) {
        const altRoute = alternativeRoutes[activeAlternativeIndex];
        const color = altColors[activeAlternativeIndex % altColors.length];
        const altMesh = this.createTubularPath(altRoute.path, color, new THREE.Vector3(0, 0.78, 0), 0.65, true);
        this.routeGroup.add(altMesh);
        this.activeMeshes.push(altMesh);
      }
    }

    // 4. Destination Highlight Target Beacon
    if (goalNodeId) {
      const goalPos = this.campusBuilder.getNodeWorldPos(goalNodeId);
      if (goalPos) {
        this.targetBeam = this.createTargetBeacon(goalPos);
        this.routeGroup.add(this.targetBeam);
      }
    }
  }

  createTubularPath(nodeIds, colorHex, offset, radius, addArrows = false) {
    const group = new THREE.Group();
    const points = [];

    nodeIds.forEach((id) => {
      const pos = this.campusBuilder.getNodeWorldPos(id);
      if (pos) {
        points.push(pos.clone().add(offset).add(new THREE.Vector3(0, 0.25, 0)));
      }
    });

    if (points.length < 2) return group;

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.15);
    const tubeGeo = new THREE.TubeGeometry(curve, points.length * 14, radius, 12, false);

    const tubeMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.8,
    });

    const mesh = new THREE.Mesh(tubeGeo, tubeMat);
    group.add(mesh);

    // Luminous Halo Glow
    const outerGeo = new THREE.TubeGeometry(curve, points.length * 14, radius * 1.5, 8, false);
    const outerMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.25,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerMesh);

    // Waypoint Sphere Markers at each turn
    points.forEach((pt) => {
      const markerGeo = new THREE.SphereGeometry(radius * 1.35, 12, 12);
      const markerMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pt);
      group.add(marker);
    });

    // Directional Flow Chevrons along Route
    if (addArrows) {
      const arrowCount = Math.max(points.length * 2, 4);
      const arrowGeo = new THREE.ConeGeometry(radius * 1.3, radius * 2.2, 4);
      arrowGeo.rotateX(Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      for (let i = 1; i <= arrowCount; i++) {
        const t = i / (arrowCount + 1);
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();

        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.copy(pt).add(new THREE.Vector3(0, 0.1, 0));
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        group.add(arrow);
      }
    }

    return group;
  }

  createTargetBeacon(pos) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Vertical luminous laser beam
    const beamGeo = new THREE.CylinderGeometry(0.8, 2.8, 48, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 24.0;
    group.add(beam);

    // Target concentric landing rings
    [3.5, 5.5, 7.5].forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r, r + 0.5, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0xef4444 : 0xffffff,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.15 + idx * 0.05;
      group.add(ring);
    });

    return group;
  }
}
