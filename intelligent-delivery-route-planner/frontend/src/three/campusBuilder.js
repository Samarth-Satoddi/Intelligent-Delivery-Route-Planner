/**
 * City-Scale Campus Builder: constructs dynamic road ribbons, district zones,
 * instanced foliage, street lights, and 3D buildings.
 */
import * as THREE from 'three';
import { BuildingFactory } from './buildingFactory.js';

export class CampusBuilder {
  constructor(scene) {
    this.scene = scene;
    this.factory = new BuildingFactory();
    this.nodeMap = new Map();
    this.roadGroup = new THREE.Group();
    this.buildingGroup = new THREE.Group();
    this.envGroup = new THREE.Group();

    this.scene.add(this.roadGroup);
    this.scene.add(this.buildingGroup);
    this.scene.add(this.envGroup);

    // Coordinate conversion defaults
    this.scale = 0.38;
    this.centerX = 550;
    this.centerY = 440;
  }

  clear() {
    this.roadGroup.clear();
    this.buildingGroup.clear();
    this.envGroup.clear();
    this.nodeMap.clear();
  }

  graphToWorld(x, y) {
    return {
      x: (x - this.centerX) * this.scale,
      y: 0,
      z: (this.centerY - y) * this.scale,
    };
  }

  buildCampus(graphData) {
    this.clear();

    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];

    // Calculate dynamic center and scale from graph bounds
    if (nodes.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach((n) => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      });

      this.centerX = (minX + maxX) / 2;
      this.centerY = (minY + maxY) / 2;

      const spanX = maxX - minX;
      const spanY = maxY - minY;
      const maxSpan = Math.max(spanX, spanY, 300);

      // Fit city scale smoothly into 3D view
      if (maxSpan > 600) {
        this.scale = 420.0 / maxSpan; // City scale (~0.38)
      } else {
        this.scale = 0.55; // Classic campus scale
      }
    }

    // 1. Build Base Ground Plate & Zoned District Plates
    this.buildGroundPlates(nodes);

    // 2. Build 3D Road Network with Real Widths & Types
    this.buildRoadNetwork(nodes, edges);

    // 3. Build 3D Buildings & Junctions
    nodes.forEach((node) => {
      const pos = this.graphToWorld(node.x, node.y);
      const bldgMesh = this.factory.createBuilding(node);
      bldgMesh.position.set(pos.x, 0, pos.z);
      this.buildingGroup.add(bldgMesh);
      this.nodeMap.set(node.id, {
        node,
        worldPos: new THREE.Vector3(pos.x, 0, pos.z),
        group: bldgMesh,
      });
    });

    // 4. Instanced Foliage & Trees (High performance, 1 draw call)
    this.buildInstancedTrees(nodes);

    // 5. Instanced Street Lamps along Road Arterials
    this.buildInstancedStreetLamps(nodes, edges);
  }

  buildGroundPlates(nodes) {
    // Vast city terrain base
    const groundGeo = new THREE.PlaneGeometry(1400, 1400);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    ground.position.y = -0.1;
    this.envGroup.add(ground);

    // District color tint ground polygons
    const districtColors = {
      'Administration District': 0x0f172a,
      'Academic District': 0x0e2a38,
      'Knowledge and Culture District': 0x171836,
      'Student Life District': 0x241b18,
      'Sports District': 0x0e261d,
      'Transport and Infrastructure District': 0x1c1917,
    };

    // Calculate district bounding polygons
    const districtNodes = {};
    nodes.forEach((n) => {
      const d = n.district || 'General Campus';
      if (!districtNodes[d]) districtNodes[d] = [];
      districtNodes[d].push(this.graphToWorld(n.x, n.y));
    });

    Object.entries(districtNodes).forEach(([district, pts]) => {
      if (pts.length < 3) return;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      pts.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      });

      const width = (maxX - minX) + 30;
      const depth = (maxZ - minZ) + 30;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const plateGeo = new THREE.PlaneGeometry(width, depth);
      plateGeo.rotateX(-Math.PI / 2);
      const plateMat = new THREE.MeshStandardMaterial({
        color: districtColors[district] || 0x111827,
        roughness: 0.85,
        metalness: 0.15,
      });
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(centerX, 0.02, centerZ);
      plate.receiveShadow = true;
      this.envGroup.add(plate);
    });

    // Subtle modern grid overlay
    const grid = new THREE.GridHelper(900, 90, 0x1e293b, 0x0f172a);
    grid.position.y = 0.03;
    this.envGroup.add(grid);
  }

  buildRoadNetwork(nodes, edges) {
    const nodeCoords = new Map();
    nodes.forEach((n) => {
      nodeCoords.set(n.id, this.graphToWorld(n.x, n.y));
    });

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.25,
    });

    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.6,
    });

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.3,
    });

    const dividerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    edges.forEach((edge) => {
      const p1 = nodeCoords.get(edge.source);
      const p2 = nodeCoords.get(edge.target);
      if (!p1 || !p2) return;

      const v1 = new THREE.Vector3(p1.x, 0.06, p1.z);
      const v2 = new THREE.Vector3(p2.x, 0.06, p2.z);

      const dir = new THREE.Vector3().subVectors(v2, v1);
      const length = dir.length();
      const angle = Math.atan2(dir.x, dir.z);
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

      // Width scaling according to road type
      const rtype = edge.road_type || edge.path_type || 'street';
      let rwidth = 3.8;
      if (rtype === 'boulevard') rwidth = 6.8;
      else if (rtype === 'avenue') rwidth = 5.2;
      else if (rtype === 'bridge') rwidth = 6.0;
      else if (rtype === 'walkway') rwidth = 2.4;

      // Paved Road Ribbon
      const roadGeo = new THREE.PlaneGeometry(rwidth, length);
      roadGeo.rotateX(-Math.PI / 2);
      const isBridge = rtype === 'bridge';
      const roadMesh = new THREE.Mesh(roadGeo, isBridge ? bridgeMat : roadMat);
      roadMesh.receiveShadow = true;
      roadMesh.position.copy(mid);
      roadMesh.rotation.y = angle;
      if (isBridge) roadMesh.position.y = 0.12;
      this.roadGroup.add(roadMesh);

      // Central divider marking for wide Boulevards
      if (rtype === 'boulevard') {
        const divGeo = new THREE.PlaneGeometry(0.25, length * 0.95);
        divGeo.rotateX(-Math.PI / 2);
        const divMesh = new THREE.Mesh(divGeo, dividerMat);
        divMesh.position.copy(mid);
        divMesh.position.y = 0.07;
        divMesh.rotation.y = angle;
        this.roadGroup.add(divMesh);
      }

      // Curbs on road edges
      const halfW = rwidth / 2;
      [-halfW, halfW].forEach((offset) => {
        const curbGeo = new THREE.BoxGeometry(0.25, 0.2, length);
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.copy(mid);
        curb.rotation.y = angle;
        curb.translateX(offset);
        curb.position.y = 0.1;
        curb.castShadow = true;
        this.roadGroup.add(curb);
      });
    });
  }

  buildInstancedTrees(nodes) {
    const treeCount = 200;
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.5, 6);
    const foliageGeo = new THREE.DodecahedronGeometry(1.6, 1);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.8,
      flatShading: true,
    });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
    trunkInst.castShadow = true;
    foliageInst.castShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < treeCount; i++) {
      const rx = (Math.random() - 0.5) * 500;
      const rz = (Math.random() - 0.5) * 440;

      // Keep trees at comfortable distance from building centers
      let tooClose = false;
      for (const node of nodes) {
        const wp = this.graphToWorld(node.x, node.y);
        if (Math.hypot(rx - wp.x, rz - wp.z) < 14.0) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose && idx < treeCount) {
        const scale = 0.8 + Math.random() * 0.5;

        dummy.position.set(rx, 1.25 * scale, rz);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(rx, (2.5 + 1.2) * scale, rz);
        dummy.updateMatrix();
        foliageInst.setMatrixAt(idx, dummy.matrix);

        idx++;
      }
    }

    trunkInst.count = idx;
    foliageInst.count = idx;
    trunkInst.instanceMatrix.needsUpdate = true;
    foliageInst.instanceMatrix.needsUpdate = true;

    this.envGroup.add(trunkInst);
    this.envGroup.add(foliageInst);
  }

  buildInstancedStreetLamps(nodes, edges) {
    const lampCount = 120;
    const postGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.0, 6);
    const headGeo = new THREE.SphereGeometry(0.35, 8, 8);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const postInst = new THREE.InstancedMesh(postGeo, postMat, lampCount);
    const headInst = new THREE.InstancedMesh(headGeo, headMat, lampCount);
    postInst.castShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;

    const sampleEdges = edges.filter((e, i) => i % 2 === 0).slice(0, lampCount);
    sampleEdges.forEach((edge) => {
      const n1 = this.nodeMap.get(edge.source);
      const n2 = this.nodeMap.get(edge.target);
      if (!n1 || !n2 || idx >= lampCount) return;

      const mid = new THREE.Vector3().addVectors(n1.worldPos, n2.worldPos).multiplyScalar(0.5);
      const offset = new THREE.Vector3(2.4, 0, 0);

      dummy.position.set(mid.x + offset.x, 2.0, mid.z + offset.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(mid.x + offset.x, 4.1, mid.z + offset.z);
      dummy.updateMatrix();
      headInst.setMatrixAt(idx, dummy.matrix);

      idx++;
    });

    postInst.count = idx;
    headInst.count = idx;
    postInst.instanceMatrix.needsUpdate = true;
    headInst.instanceMatrix.needsUpdate = true;

    this.envGroup.add(postInst);
    this.envGroup.add(headInst);
  }

  getNodeWorldPos(nodeId) {
    const entry = this.nodeMap.get(nodeId);
    return entry ? entry.worldPos.clone() : null;
  }

  getNodeData(nodeId) {
    const entry = this.nodeMap.get(nodeId);
    return entry ? entry.node : null;
  }
}
