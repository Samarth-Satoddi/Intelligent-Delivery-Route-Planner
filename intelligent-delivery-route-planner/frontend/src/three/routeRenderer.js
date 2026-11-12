/**
 * 3D Route Renderer: Renders glowing tubular pathways for GBFS (Orange) and A* (Cyan).
 */
import * as THREE from 'three';

export class RouteRenderer {
  constructor(scene, campusBuilder) {
    this.scene = scene;
    this.campusBuilder = campusBuilder;
    this.routeGroup = new THREE.Group();
    this.scene.add(this.routeGroup);

    this.gbfsMesh = null;
    this.astarMesh = null;
    this.targetBeam = null;
    this.distanceLabels = [];
  }

  clear() {
    this.routeGroup.clear();
    this.gbfsMesh = null;
    this.astarMesh = null;
    this.targetBeam = null;
    this.distanceLabels = [];
  }

  renderRoutes({ gbfsPath = null, astarPath = null, goalNodeId = null }) {
    this.clear();

    const bothActive = gbfsPath && astarPath && gbfsPath.length > 1 && astarPath.length > 1;

    // 1. Draw GBFS Route (Orange Glowing Tube)
    if (gbfsPath && gbfsPath.length > 1) {
      const offset = bothActive ? new THREE.Vector3(-0.6, 0.4, -0.6) : new THREE.Vector3(0, 0.4, 0);
      this.gbfsMesh = this.createTubularPath(gbfsPath, 0xf97316, offset, 0.5);
      this.routeGroup.add(this.gbfsMesh);
    }

    // 2. Draw A* Route (Cyan Glowing Tube)
    if (astarPath && astarPath.length > 1) {
      const offset = bothActive ? new THREE.Vector3(0.6, 0.4, 0.6) : new THREE.Vector3(0, 0.4, 0);
      this.astarMesh = this.createTubularPath(astarPath, 0x06b6d4, offset, 0.5);
      this.routeGroup.add(this.astarMesh);
    }

    // 3. Highlight Goal Destination with Glowing 3D Beacon
    if (goalNodeId) {
      const goalPos = this.campusBuilder.getNodeWorldPos(goalNodeId);
      if (goalPos) {
        this.targetBeam = this.createTargetBeacon(goalPos);
        this.routeGroup.add(this.targetBeam);
      }
    }
  }

  createTubularPath(nodeIds, colorHex, offset, radius) {
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
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    });

    const mesh = new THREE.Mesh(tubeGeo, tubeMat);

    // Add glowing outer pulse tube
    const outerGeo = new THREE.TubeGeometry(curve, points.length * 12, radius * 1.5, 8, false);
    const outerMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.2,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    mesh.add(outerMesh);

    return mesh;
  }

  createTargetBeacon(pos) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Pulsing vertical cylinder beam
    const beamGeo = new THREE.CylinderGeometry(0.8, 2.5, 35, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 17.5;
    group.add(beam);

    // Glowing target ring
    const ringGeo = new THREE.RingGeometry(3, 4.5, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.2;
    group.add(ring);

    return group;
  }
}
