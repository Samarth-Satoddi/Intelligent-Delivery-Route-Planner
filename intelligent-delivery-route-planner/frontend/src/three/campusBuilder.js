/**
 * Campus Builder: constructs roads, buildings, trees, and ground planes based on graph data.
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

    // Coordinate conversion settings
    this.scale = 0.55;
    this.centerX = 350;
    this.centerY = 280;
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

    // Calculate center offset dynamically
    if (nodes.length > 0) {
      const avgX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
      const avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
      this.centerX = avgX;
      this.centerY = avgY;
    }

    // 1. Build Ground and Plazas
    this.buildGroundPlate();

    // 2. Build Roads between Connected Nodes
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

    // 4. Scatter Campus Trees
    this.scatterTrees(nodes);
  }

  buildGroundPlate() {
    // Vast campus lawn ground plane
    const groundGeo = new THREE.PlaneGeometry(800, 800);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    ground.position.y = -0.05;
    this.envGroup.add(ground);

    // Inner paved district plate
    const districtGeo = new THREE.PlaneGeometry(420, 360);
    districtGeo.rotateX(-Math.PI / 2);
    const districtMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const district = new THREE.Mesh(districtGeo, districtMat);
    district.receiveShadow = true;
    district.position.y = 0.01;
    this.envGroup.add(district);

    // Subtle grid overlay
    const grid = new THREE.GridHelper(500, 50, 0x1e293b, 0x111827);
    grid.position.y = 0.02;
    this.envGroup.add(grid);
  }

  buildRoadNetwork(nodes, edges) {
    const nodeCoords = new Map();
    nodes.forEach((n) => {
      nodeCoords.set(n.id, this.graphToWorld(n.x, n.y));
    });

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2,
    });

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.4,
    });

    edges.forEach((edge) => {
      const p1 = nodeCoords.get(edge.source);
      const p2 = nodeCoords.get(edge.target);
      if (!p1 || !p2) return;

      const v1 = new THREE.Vector3(p1.x, 0.06, p1.z);
      const v2 = new THREE.Vector3(p2.x, 0.06, p2.z);

      const dir = new THREE.Vector3().subVectors(v2, v1);
      const length = dir.length();
      const angle = Math.atan2(dir.x, dir.z);

      // Paved Road Segment
      const roadGeo = new THREE.PlaneGeometry(4.5, length);
      roadGeo.rotateX(-Math.PI / 2);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.receiveShadow = true;

      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
      roadMesh.position.copy(mid);
      roadMesh.rotation.y = angle;
      this.roadGroup.add(roadMesh);

      // Road curbs
      [-2.4, 2.4].forEach((offset) => {
        const curbGeo = new THREE.BoxGeometry(0.3, 0.2, length);
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

  scatterTrees(nodes) {
    const treePositions = [];
    const minDistanceToBuilding = 15;

    // Generate random tree positions away from buildings
    for (let i = 0; i < 45; i++) {
      const rx = (Math.random() - 0.5) * 360;
      const rz = (Math.random() - 0.5) * 300;

      let tooClose = false;
      for (const node of nodes) {
        const wp = this.graphToWorld(node.x, node.y);
        const dist = Math.hypot(rx - wp.x, rz - wp.z);
        if (dist < minDistanceToBuilding) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        const tree = this.factory.createTree(rx, rz, 0.8 + Math.random() * 0.5);
        this.envGroup.add(tree);
      }
    }
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
