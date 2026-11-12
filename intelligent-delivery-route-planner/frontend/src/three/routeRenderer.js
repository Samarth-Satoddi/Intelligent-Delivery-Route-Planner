/**
 * 3D Route Renderer: Renders glowing tubular pathways for GBFS, A*, Dijkstra,
 * and Yen's K-Shortest Alternative Routes with interactive route highlighting.
 */
import * as THREE from 'three';

export class RouteRenderer {
  constructor(scene, campusBuilder) {
    this.scene = scene;
    this.campusBuilder = campusBuilder;
    this.routeGroup = new THREE.Group();
    this.scene.add(this.routeGroup);

    this.activeMeshes = [];
    this.targetBeam = null;
    this.waypointMarkers = [];
  }

  clear() {
    this.routeGroup.clear();
    this.activeMeshes = [];
    this.targetBeam = null;
    this.waypointMarkers = [];
  }

  renderRoutes({
    gbfsPath = null,
    astarPath = null,
    dijkstraPath = null,
    alternativeRoutes = [],
    goalNodeId = null,
    activeAlternativeIndex = -1,
  }) {
    this.clear();

    const hasGBFS = gbfsPath && gbfsPath.length > 1;
    const hasAStar = astarPath && astarPath.length > 1;

    // 1. Draw GBFS Route (Orange Glowing Tube)
    if (hasGBFS) {
      const offset = hasAStar ? new THREE.Vector3(-0.8, 0.45, -0.8) : new THREE.Vector3(0, 0.45, 0);
      const gbfsMesh = this.createTubularPath(gbfsPath, 0xf97316, offset, 0.45, 'GBFS Path');
      this.routeGroup.add(gbfsMesh);
      this.activeMeshes.push(gbfsMesh);
    }

    // 2. Draw A* Route (Cyan Glowing Tube)
    if (hasAStar) {
      const offset = hasGBFS ? new THREE.Vector3(0.8, 0.45, 0.8) : new THREE.Vector3(0, 0.45, 0);
      const astarMesh = this.createTubularPath(astarPath, 0x06b6d4, offset, 0.5, 'A* Path');
      this.routeGroup.add(astarMesh);
      this.activeMeshes.push(astarMesh);
    }

    // 3. Draw Alternative Route if selected by user
    if (activeAlternativeIndex >= 0 && alternativeRoutes[activeAlternativeIndex]) {
      const altRoute = alternativeRoutes[activeAlternativeIndex];
      const altColors = [0x06b6d4, 0xa855f7, 0xf59e0b, 0x10b981];
      const color = altColors[activeAlternativeIndex % altColors.length];
      const altMesh = this.createTubularPath(altRoute.path, color, new THREE.Vector3(0, 0.7, 0), 0.65, `Route ${activeAlternativeIndex + 1}`);
      this.routeGroup.add(altMesh);
      this.activeMeshes.push(altMesh);
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

  createTubularPath(nodeIds, colorHex, offset, radius, label = '') {
    const points = [];
    nodeIds.forEach((id) => {
      const pos = this.campusBuilder.getNodeWorldPos(id);
      if (pos) {
        points.push(pos.clone().add(offset).add(new THREE.Vector3(0, 0.3, 0)));
      }
    });

    if (points.length < 2) return new THREE.Group();

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.15);
    const tubeGeo = new THREE.TubeGeometry(curve, points.length * 12, radius, 12, false);

    const tubeMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
    });

    const mesh = new THREE.Mesh(tubeGeo, tubeMat);

    // Outer luminous glow
    const outerGeo = new THREE.TubeGeometry(curve, points.length * 12, radius * 1.6, 8, false);
    const outerMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.22,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    mesh.add(outerMesh);

    // Waypoint sphere markers at each turn
    points.forEach((pt, i) => {
      if (i > 0 && i < points.length - 1) {
        const markerGeo = new THREE.SphereGeometry(radius * 1.3, 12, 12);
        const markerMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(pt);
        mesh.add(marker);
      }
    });

    return mesh;
  }

  createTargetBeacon(pos) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Vertical luminous laser beam
    const beamGeo = new THREE.CylinderGeometry(0.8, 2.8, 45, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 22.5;
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
