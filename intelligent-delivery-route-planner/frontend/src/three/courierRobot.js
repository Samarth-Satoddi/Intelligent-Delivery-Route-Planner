/**
 * 3D Autonomous Courier Robot: Procedural Robot Model & Path Traversal Simulation.
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
    this.pathPoints = [];
    this.pathSegments = [];
    this.totalDistance = 0;
    this.currentSeg = 0;
    this.segProgress = 0;
    this.speed = 1.0; // Multiplier
    this.baseSpeed = 0.45; // Units per frame
    this.isPlaying = false;
    this.isPaused = false;
    this.isCompleted = false;

    // Checkpoint pausing state
    this.pauseFrames = 0;
    this.maxPauseFrames = 25; // Brief stop at junctions

    // Callbacks
    this.onProgress = null;
    this.onComplete = null;
  }

  buildRobotMesh() {
    const robot = new THREE.Group();
    robot.name = 'courier_robot';

    // 1. Chassis Body
    const bodyGeo = new THREE.BoxGeometry(2.6, 1.4, 3.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    robot.add(body);

    // 2. Delivery Compartment Hatch (Orange/Cyan Accent)
    const hatchGeo = new THREE.BoxGeometry(2.2, 0.4, 2.6);
    this.hatchMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    this.hatch = new THREE.Mesh(hatchGeo, this.hatchMat);
    this.hatch.position.y = 2.0;
    robot.add(this.hatch);

    // 3. 4 Rubber Wheels
    this.wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
    });

    const wheelPositions = [
      [-1.4, 0.5, 1.1],
      [1.4, 0.5, 1.1],
      [-1.4, 0.5, -1.1],
      [1.4, 0.5, -1.1],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      robot.add(wheel);
      this.wheels.push(wheel);
    });

    // 4. Front LED Headlights
    [-0.8, 0.8].forEach((x) => {
      const lightGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const lightMesh = new THREE.Mesh(lightGeo, lightMat);
      lightMesh.position.set(x, 1.2, 1.75);
      robot.add(lightMesh);
    });

    // Spotlight projecting onto path ahead
    this.headlight = new THREE.SpotLight(0x38bdf8, 4.0, 30, Math.PI / 6, 0.4);
    this.headlight.position.set(0, 1.2, 1.7);
    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0, 15);
    robot.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;
    robot.add(this.headlight);

    // 5. Navigation Pulse Scanner on Top
    const antennaGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(0, 2.5, -0.6);
    robot.add(antenna);

    const beaconGeo = new THREE.SphereGeometry(0.25, 16, 16);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.beacon = new THREE.Mesh(beaconGeo, this.beaconMat);
    this.beacon.position.set(0, 3.1, -0.6);
    robot.add(this.beacon);

    return robot;
  }

  setRoute(nodeIds) {
    this.reset();
    this.pathPoints = [];

    nodeIds.forEach((nid) => {
      const wp = this.campusBuilder.getNodeWorldPos(nid);
      if (wp) {
        this.pathPoints.push(wp.clone().add(new THREE.Vector3(0, 0.1, 0)));
      }
    });

    if (this.pathPoints.length < 2) {
      this.mesh.visible = false;
      return;
    }

    // Precalculate segment lengths
    this.pathSegments = [];
    this.totalDistance = 0;
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i];
      const p2 = this.pathPoints[i + 1];
      const dist = p1.distanceTo(p2);
      this.pathSegments.push({ p1, p2, dist });
      this.totalDistance += dist;
    }

    // Place robot at start location
    const start = this.pathPoints[0];
    const second = this.pathPoints[1];
    this.mesh.position.copy(start);
    const initialAngle = Math.atan2(second.x - start.x, second.z - start.z);
    this.mesh.rotation.y = initialAngle;
    this.mesh.visible = true;
    this.hatch.position.y = 2.0; // Closed
  }

  play() {
    if (this.pathPoints.length < 2) return;
    this.isPlaying = true;
    this.isPaused = false;
    this.isCompleted = false;
  }

  pause() {
    this.isPaused = true;
    this.isPlaying = false;
  }

  resume() {
    if (this.pathPoints.length < 2) return;
    this.isPlaying = true;
    this.isPaused = false;
  }

  reset() {
    this.isPlaying = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.currentSeg = 0;
    this.segProgress = 0;
    this.pauseFrames = 0;
    if (this.pathPoints.length > 0) {
      this.mesh.position.copy(this.pathPoints[0]);
      if (this.pathPoints.length > 1) {
        const p1 = this.pathPoints[0];
        const p2 = this.pathPoints[1];
        this.mesh.rotation.y = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      }
      this.mesh.visible = true;
    }
    this.hatch.position.y = 2.0;
  }

  setSpeed(multiplier) {
    this.speed = Math.max(0.2, multiplier);
  }

  stepForward() {
    if (this.currentSeg < this.pathSegments.length - 1) {
      this.currentSeg++;
      this.segProgress = 0;
      this.updateRobotTransform();
    }
  }

  stepBackward() {
    if (this.currentSeg > 0) {
      this.currentSeg--;
      this.segProgress = 0;
      this.updateRobotTransform();
    }
  }

  update(delta) {
    if (!this.isPlaying || this.isPaused || this.isCompleted) return;

    // Checkpoint pausing (simulate sensor scan at junction)
    if (this.pauseFrames > 0) {
      this.pauseFrames--;
      // Pulsing beacon while paused
      this.beacon.scale.setScalar(1.0 + Math.sin(Date.now() * 0.02) * 0.3);
      return;
    }

    if (this.currentSeg >= this.pathSegments.length) {
      this.finishDelivery();
      return;
    }

    const seg = this.pathSegments[this.currentSeg];
    const stepDist = this.baseSpeed * this.speed * (delta * 60);
    this.segProgress += stepDist / seg.dist;

    // Wheel rotation
    this.wheels.forEach((w) => (w.rotation.x += stepDist * 1.5));

    if (this.segProgress >= 1.0) {
      this.currentSeg++;
      this.segProgress = 0;
      if (this.currentSeg < this.pathSegments.length) {
        this.pauseFrames = this.maxPauseFrames; // Pause at junction
      } else {
        this.finishDelivery();
        return;
      }
    }

    this.updateRobotTransform();

    // Notify progress
    if (this.onProgress) {
      let traversed = 0;
      for (let i = 0; i < this.currentSeg; i++) {
        traversed += this.pathSegments[i].dist;
      }
      if (this.currentSeg < this.pathSegments.length) {
        traversed += this.segProgress * this.pathSegments[this.currentSeg].dist;
      }
      const pct = Math.min(100, (traversed / this.totalDistance) * 100);
      this.onProgress({
        traversedDistance: Math.round(traversed * 1.8), // meters approx
        percentage: pct.toFixed(1),
        currentSegment: this.currentSeg + 1,
        totalSegments: this.pathSegments.length,
      });
    }
  }

  updateRobotTransform() {
    if (this.currentSeg >= this.pathSegments.length) return;
    const seg = this.pathSegments[this.currentSeg];
    const p1 = seg.p1;
    const p2 = seg.p2;

    // Interpolate Position
    this.mesh.position.lerpVectors(p1, p2, this.segProgress);

    // Target angle
    const targetAngle = Math.atan2(p2.x - p1.x, p2.z - p1.z);

    // Smooth angle interpolation
    let diff = targetAngle - this.mesh.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.mesh.rotation.y += diff * 0.15;
  }

  finishDelivery() {
    this.isPlaying = false;
    this.isCompleted = true;

    // Delivery completed animation: pop open hatch
    this.hatch.position.y = 2.8;
    this.beaconMat.color.setHex(0x22c55e);

    if (this.onComplete) {
      this.onComplete();
    }
  }
}
