/**
 * 3D Route Renderer: Renders glowing tubular pathways for GBFS, A*, Dijkstra,
 * and Yen's K-Shortest Alternative Routes, directional flow chevrons, and destination beacons.
 */
import * as THREE from 'three';

export class RouteRenderer {
  constructor(scene, campusBuilder) {
    this.scene = scene;
    this.campusBuilder = campusBuilder;
    this.routeGroup = new THREE.Group();
    this.scene.add(this.routeGroup);

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

  setDisplayMode(mode) {
    this.displayMode = mode;
  }

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

    // Check if user specifically selected an alternative route
    const hasActiveAlt = activeAlternativeIndex >= 0 && alternativeRoutes[activeAlternativeIndex];

    if (this.displayMode === 'selected') {
      // Show ONLY the single active / selected route
      if (hasActiveAlt) {
        const altRoute = alternativeRoutes[activeAlternativeIndex];
        const altColors = [0x06b6d4, 0xa855f7, 0xf59e0b, 0x10b981, 0xf43f5e, 0x6366f1];
        const color = altColors[activeAlternativeIndex % altColors.length];
        const mesh = this.createTubularPath(altRoute.path, color, new THREE.Vector3(0, 0.5, 0), 0.65, true);
        this.routeGroup.add(mesh);
      } else if (hasAStar) {
        const mesh = this.createTubularPath(astarPath, 0x06b6d4, new THREE.Vector3(0, 0.5, 0), 0.65, true);
        this.routeGroup.add(mesh);
      } else if (hasGBFS) {
        const mesh = this.createTubularPath(gbfsPath, 0xf97316, new THREE.Vector3(0, 0.5, 0), 0.65, true);
        this.routeGroup.add(mesh);
      }
    } else {
      // Show All Compared Routes simultaneously with distinct visual styles
      // 1. Draw GBFS Route (Orange Glowing Tube)
      if (hasGBFS) {
        const offset = hasAStar ? new THREE.Vector3(-0.8, 0.45, -0.8) : new THREE.Vector3(0, 0.45, 0);
        const gbfsMesh = this.createTubularPath(gbfsPath, 0xf97316, offset, 0.45, !hasAStar && !hasActiveAlt);
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

      // 3. Draw Active Alternative Route if user selected one
      if (hasActiveAlt) {
        const altRoute = alternativeRoutes[activeAlternativeIndex];
        const altColors = [0x06b6d4, 0xa855f7, 0xf59e0b, 0x10b981, 0xf43f5e, 0x6366f1];
        const color = altColors[activeAlternativeIndex % altColors.length];
        const altMesh = this.createTubularPath(altRoute.path, color, new THREE.Vector3(0, 0.75, 0), 0.65, true);
        this.routeGroup.add(altMesh);
        this.activeMeshes.push(altMesh);
      }
    }

    // 4. Highlight Goal Destination with Glowing 3D Beacon
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
    points.forEach((pt, i) => {
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
      arrowGeo.rotateX(Math.PI / 2); // point along Z
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
