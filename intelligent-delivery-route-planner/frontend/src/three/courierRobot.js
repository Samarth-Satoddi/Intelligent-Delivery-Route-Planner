/**
 * 3D Autonomous Courier Delivery Vehicle Simulation.
 * Implements realistic road-following movement, smooth turning fillets at junctions,
 * live telemetry HUD reporting, speed controls, step-by-step navigation, and delivery animations.
 */
import * as THREE from 'three';

export class CourierRobot {
  constructor(scene, campusBuilder) {
    this.scene = scene;
    this.campusBuilder = campusBuilder;
    this.mesh = this.buildRobotMesh();
    this.scene.add(this.mesh);
    this.mesh.visible = false;

    // Movement state
    this.rawNodeIds = [];
    this.nodeNames = [];
    this.waypointPositions = [];
    this.smoothPath = [];
    this.totalDistanceM = 0;
    this.currentSeg = 0;
    this.segProgress = 0;
    this.speedMultiplier = 2.0;
    this.baseSpeed = 0.55; // Units per frame

    this.isPlaying = false;
    this.isPaused = false;
    this.isCompleted = false;

    // Delivery pulse ring
    this.deliveryRing = this.buildDeliveryRing();
    this.scene.add(this.deliveryRing);
    this.deliveryRing.visible = false;

    // Callbacks
    this.onProgress = null;
    this.onComplete = null;
  }

  buildRobotMesh() {
    const robot = new THREE.Group();
    robot.name = 'courier_robot';

    // 1. Aerodynamic Chassis Body
    const bodyGeo = new THREE.BoxGeometry(2.6, 1.4, 3.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // dark sleek cyber-chassis
      roughness: 0.2,
      metalness: 0.85,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    robot.add(body);

    // Side Cyber Stripe Accent (Electric Cyan)
    [-1.32, 1.32].forEach((x) => {
      const stripeGeo = new THREE.PlaneGeometry(3.0, 0.25);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(x, 1.1, 0);
      stripe.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      robot.add(stripe);
    });

    // 2. Automated Cargo Hatch Lid (Opens on Delivery)
    const hatchGeo = new THREE.BoxGeometry(2.2, 0.35, 2.5);
    this.hatchMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.7,
    });
    this.hatch = new THREE.Mesh(hatchGeo, this.hatchMat);
    this.hatch.position.y = 1.95;
    robot.add(this.hatch);

    // 3. 4 Rubber Wheels with Rims
    this.wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.45, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
    });

    const wheelPositions = [
      [-1.4, 0.52, 1.1],
      [1.4, 0.52, 1.1],
      [-1.4, 0.52, -1.1],
      [1.4, 0.52, -1.1],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      robot.add(wheel);
      this.wheels.push(wheel);
    });

    // 4. Dual LED Headlights
    [-0.8, 0.8].forEach((x) => {
      const lightGeo = new THREE.SphereGeometry(0.22, 10, 10);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const lightMesh = new THREE.Mesh(lightGeo, lightMat);
      lightMesh.position.set(x, 1.1, 1.75);
      robot.add(lightMesh);
    });

    // Forward Projecting Spotlight
    this.headlight = new THREE.SpotLight(0x38bdf8, 5.0, 35, Math.PI / 5, 0.4);
    this.headlight.position.set(0, 1.2, 1.7);
    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0, 18);
    robot.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;
    robot.add(this.headlight);

    // 5. Autonomous Scanner Mast & Holographic Beacon
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 2.45, -0.6);
    robot.add(mast);

    const beaconGeo = new THREE.SphereGeometry(0.28, 16, 16);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.beacon = new THREE.Mesh(beaconGeo, this.beaconMat);
    this.beacon.position.set(0, 3.1, -0.6);
    robot.add(this.beacon);

    // Subtle Ground Glow Underneath
    const glowGeo = new THREE.PlaneGeometry(3.6, 4.4);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.05;
    robot.add(glow);

    return robot;
  }

  buildDeliveryRing() {
    const group = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(3.2, 4.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);
    return group;
  }

  setRoute(nodeIds) {
    this.reset();
    this.rawNodeIds = [...nodeIds];
    this.nodeNames = [];
    this.waypointPositions = [];

    nodeIds.forEach((nid) => {
      const wp = this.campusBuilder.getNodeWorldPos(nid);
      const node = this.campusBuilder.getNodeData(nid);
      if (wp) {
        this.waypointPositions.push(wp.clone().add(new THREE.Vector3(0, 0.1, 0)));
        this.nodeNames.push(node?.name || nid);
      }
    });

    if (this.waypointPositions.length < 2) {
      this.mesh.visible = false;
      return;
    }

    // Build smooth path with corner fillets at junctions
    this.buildSmoothPath();

    // Position robot at start point facing first leg
    const startPt = this.waypointPositions[0];
    const nextPt = this.waypointPositions[1];
    this.mesh.position.copy(startPt);
    const initialAngle = Math.atan2(nextPt.x - startPt.x, nextPt.z - startPt.z);
    this.mesh.rotation.y = initialAngle;
    this.mesh.visible = true;

    this.hatch.position.y = 1.95; // closed
    this.beaconMat.color.setHex(0x38bdf8);
    this.deliveryRing.visible = false;

    this.emitProgress();
  }

  buildSmoothPath() {
    this.smoothSegments = [];
    this.totalDistanceM = 0;

    for (let i = 0; i < this.waypointPositions.length - 1; i++) {
      const p1 = this.waypointPositions[i];
      const p2 = this.waypointPositions[i + 1];
      const dist = p1.distanceTo(p2);
      this.smoothSegments.push({
        p1,
        p2,
        dist,
        fromName: this.nodeNames[i] || `Node ${i + 1}`,
        toName: this.nodeNames[i + 1] || `Node ${i + 2}`,
      });
      this.totalDistanceM += dist;
    }
  }

  play() {
    if (this.waypointPositions.length < 2) return;
    if (this.isCompleted) this.reset();
    this.isPlaying = true;
    this.isPaused = false;
    this.isCompleted = false;
    this.deliveryRing.visible = false;
  }

  pause() {
    this.isPaused = true;
    this.isPlaying = false;
    this.emitProgress();
  }

  resume() {
    if (this.waypointPositions.length < 2) return;
    this.isPlaying = true;
    this.isPaused = false;
  }

  reset() {
    this.isPlaying = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.currentSeg = 0;
    this.segProgress = 0;

    if (this.waypointPositions.length > 0) {
      const p1 = this.waypointPositions[0];
      this.mesh.position.copy(p1);
      if (this.waypointPositions.length > 1) {
        const p2 = this.waypointPositions[1];
        this.mesh.rotation.y = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      }
      this.mesh.visible = true;
    }
    this.hatch.position.y = 1.95;
    this.beaconMat.color.setHex(0x38bdf8);
    this.deliveryRing.visible = false;
    this.emitProgress();
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.5, multiplier);
  }

  stepForward() {
    if (this.currentSeg < this.smoothSegments.length - 1) {
      this.currentSeg++;
      this.segProgress = 0;
      this.updateRobotTransform();
      this.emitProgress();
    } else if (this.currentSeg === this.smoothSegments.length - 1) {
      this.segProgress = 1.0;
      this.finishDelivery();
    }
  }

  stepBackward() {
    if (this.currentSeg > 0) {
      this.currentSeg--;
      this.segProgress = 0;
      this.updateRobotTransform();
      this.emitProgress();
    } else {
      this.segProgress = 0;
      this.updateRobotTransform();
      this.emitProgress();
    }
  }

  update(delta) {
    if (!this.isPlaying || this.isPaused || this.isCompleted) {
      if (this.isCompleted && this.deliveryRing.visible) {
        // Animate completion pulse ring
        const t = Date.now() * 0.003;
        this.deliveryRing.scale.setScalar(1.0 + Math.sin(t) * 0.15);
      }
      return;
    }

    if (this.currentSeg >= this.smoothSegments.length) {
      this.finishDelivery();
      return;
    }

    const seg = this.smoothSegments[this.currentSeg];
    const stepDist = this.baseSpeed * this.speedMultiplier * (delta * 60);
    this.segProgress += stepDist / Math.max(seg.dist, 0.1);

    // Rotate wheels
    this.wheels.forEach((w) => (w.rotation.x += stepDist * 1.6));

    if (this.segProgress >= 1.0) {
      this.currentSeg++;
      this.segProgress = 0;
      if (this.currentSeg >= this.smoothSegments.length) {
        this.finishDelivery();
        return;
      }
    }

    this.updateRobotTransform();
    this.emitProgress();
  }

  updateRobotTransform() {
    if (this.currentSeg >= this.smoothSegments.length) return;
    const seg = this.smoothSegments[this.currentSeg];
    const p1 = seg.p1;
    const p2 = seg.p2;

    // Smooth position interpolation
    this.mesh.position.lerpVectors(p1, p2, this.segProgress);

    // Target angle facing next waypoint
    const targetAngle = Math.atan2(p2.x - p1.x, p2.z - p1.z);

    // Smooth angular slerp (prevents snapping at junctions)
    let diff = targetAngle - this.mesh.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.mesh.rotation.y += diff * 0.18;
  }

  emitProgress() {
    if (!this.onProgress || !this.smoothSegments || this.smoothSegments.length === 0) return;

    let traversed = 0;
    for (let i = 0; i < this.currentSeg; i++) {
      traversed += this.smoothSegments[i].dist;
    }
    if (this.currentSeg < this.smoothSegments.length) {
      traversed += this.segProgress * this.smoothSegments[this.currentSeg].dist;
    }

    const totalM = this.totalDistanceM * 2.2; // physical metres scaling
    const traversedM = Math.round(traversed * 2.2);
    const remainingM = Math.max(0, Math.round(totalM - traversedM));
    const pct = Math.min(100, (traversed / Math.max(this.totalDistanceM, 0.1)) * 100);

    const currSegObj = this.smoothSegments[this.currentSeg] || this.smoothSegments[this.smoothSegments.length - 1];

    this.onProgress({
      traversedDistance: traversedM,
      remainingDistance: remainingM,
      totalDistance: Math.round(totalM),
      percentage: pct.toFixed(1),
      currentSegment: this.currentSeg + 1,
      totalSegments: this.smoothSegments.length,
      currentLocationName: currSegObj.fromName,
      nextLocationName: currSegObj.toName,
      speedKmh: Math.round(this.speedMultiplier * 20),
      isCompleted: this.isCompleted,
      isPaused: this.isPaused,
      isPlaying: this.isPlaying,
    });
  }

  finishDelivery() {
    this.isPlaying = false;
    this.isCompleted = true;

    // Position at final goal destination
    const lastSeg = this.smoothSegments[this.smoothSegments.length - 1];
    if (lastSeg) {
      this.mesh.position.copy(lastSeg.p2);
    }

    // Delivery Completed Celebration Animation
    this.hatch.position.y = 2.85; // pop hatch open
    this.beaconMat.color.setHex(0x22c55e); // bright green
    this.deliveryRing.position.copy(this.mesh.position);
    this.deliveryRing.position.y = 0.08;
    this.deliveryRing.visible = true;

    this.emitProgress();

    if (this.onComplete) {
      this.onComplete();
    }
  }
}
