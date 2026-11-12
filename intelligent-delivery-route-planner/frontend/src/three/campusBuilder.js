/**
 * City-Scale Campus Builder: constructs dynamic road ribbons, district zones,
 * instanced foliage, street lights, infill urban blocks, water canals, and 3D buildings.
 * Accurately models a dense European-style miniature smart campus city matching aerial references.
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

    // 2. Build Landscaped Reflecting Canals & Waterways (matches aerial reference)
    this.buildWaterwaysAndCanals();

    // 3. Build 3D Road Network with Real Widths, Asphalt, Curbs, Sidewalks & Markings
    this.buildRoadNetwork(nodes, edges);

    // 4. Build Roundabout Plazas & Green Islands
    this.buildRoundabouts(nodes);

    // 5. Infill Dense Urban Blocks (Perimeter Townhouses & Courtyards in Open Space)
    this.buildInfillCityBlocks(nodes, edges);

    // 6. Build 3D Landmark Buildings & Intersections
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

    // 7. Instanced Street & Park Foliage (High performance, 1 draw call)
    this.buildInstancedTrees(nodes);

    // 8. Instanced Street Lamps along Road Arterials
    this.buildInstancedStreetLamps(nodes, edges);
  }

  buildGroundPlates(nodes) {
    // Vast city terrain base
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    ground.position.y = -0.15;
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

      const width = (maxX - minX) + 36;
      const depth = (maxZ - minZ) + 36;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const plateGeo = new THREE.PlaneGeometry(width, depth);
      plateGeo.rotateX(-Math.PI / 2);
      const plateMat = new THREE.MeshStandardMaterial({
        color: districtColors[district] || 0x111827,
        roughness: 0.88,
        metalness: 0.12,
      });
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(centerX, 0.01, centerZ);
      plate.receiveShadow = true;
      this.envGroup.add(plate);
    });

    // Subtle modern grid overlay
    const grid = new THREE.GridHelper(900, 90, 0x1e293b, 0x0f172a);
    grid.position.y = 0.02;
    this.envGroup.add(grid);
  }

  buildWaterwaysAndCanals() {
    // Elegant geometric canals and reflecting basins surrounding districts
    const canalMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      roughness: 0.15,
      metalness: 0.45,
    });

    const copingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
      metalness: 0.2,
    });

    const canals = [
      { x: -140, z: -120, w: 22, d: 85 },
      { x: 140, z: -110, w: 22, d: 90 },
      { x: -130, z: 120, w: 24, d: 80 },
      { x: 135, z: 125, w: 22, d: 75 },
      { x: -15, z: -145, w: 75, d: 18 },
      { x: 15, z: 145, w: 80, d: 18 },
    ];

    canals.forEach((c) => {
      const waterGeo = new THREE.PlaneGeometry(c.w, c.d);
      waterGeo.rotateX(-Math.PI / 2);
      const water = new THREE.Mesh(waterGeo, canalMat);
      water.position.set(c.x, 0.04, c.z);
      this.envGroup.add(water);

      // Stone Coping Border
      const curbGeo = new THREE.BoxGeometry(c.w + 1.2, 0.25, c.d + 1.2);
      const coping = new THREE.Mesh(curbGeo, copingMat);
      coping.position.set(c.x, 0.08, c.z);
      this.envGroup.add(coping);
    });
  }

  buildRoadNetwork(nodes, edges) {
    const nodeCoords = new Map();
    const nodeMap = new Map();
    nodes.forEach((n) => {
      nodeCoords.set(n.id, this.graphToWorld(n.x, n.y));
      nodeMap.set(n.id, n);
    });

    // Lighter slate asphalt matching reference image
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // slate-700 asphalt, crisp and visible
      roughness: 0.65,
      metalness: 0.15,
    });

    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.5,
    });

    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // slate-500 raised sidewalks
      roughness: 0.6,
      metalness: 0.15,
    });

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.3,
    });

    const markingYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const markingWhite = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    edges.forEach((edge) => {
      const p1 = nodeCoords.get(edge.source);
      const p2 = nodeCoords.get(edge.target);
      if (!p1 || !p2) return;

      const v1 = new THREE.Vector3(p1.x, 0.06, p1.z);
      const v2 = new THREE.Vector3(p2.x, 0.06, p2.z);

      const dir = new THREE.Vector3().subVectors(v2, v1);
      const length = dir.length();
      if (length < 0.1) return;

      const angle = Math.atan2(dir.x, dir.z);
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);

      // Width scaling according to road type
      const rtype = edge.road_type || edge.path_type || 'street';
      let rwidth = 4.2;
      if (rtype === 'boulevard') rwidth = 7.2;
      else if (rtype === 'avenue') rwidth = 5.6;
      else if (rtype === 'bridge') rwidth = 6.4;
      else if (rtype === 'walkway') rwidth = 2.6;

      const isBridge = rtype === 'bridge';

      // 1. Paved Road Asphalt Ribbon
      const roadGeo = new THREE.PlaneGeometry(rwidth, length);
      roadGeo.rotateX(-Math.PI / 2);
      const roadMesh = new THREE.Mesh(roadGeo, isBridge ? bridgeMat : roadMat);
      roadMesh.receiveShadow = true;
      roadMesh.position.copy(mid);
      roadMesh.rotation.y = angle;
      if (isBridge) roadMesh.position.y = 0.14;
      this.roadGroup.add(roadMesh);

      // 2. Lane Markings
      if (rtype === 'boulevard') {
        // Dual yellow center divider stripes
        [-0.3, 0.3].forEach((off) => {
          const divGeo = new THREE.PlaneGeometry(0.18, length * 0.94);
          divGeo.rotateX(-Math.PI / 2);
          const divMesh = new THREE.Mesh(divGeo, markingYellow);
          divMesh.position.copy(mid);
          divMesh.rotation.y = angle;
          divMesh.translateX(off);
          divMesh.position.y = 0.075;
          this.roadGroup.add(divMesh);
        });
      } else if (rtype === 'avenue') {
        // Dashed white center line along avenue
        const dashLen = 2.2;
        const gapLen = 1.8;
        const totalDashes = Math.floor(length / (dashLen + gapLen));
        for (let i = 0; i < totalDashes; i++) {
          const dashGeo = new THREE.PlaneGeometry(0.2, dashLen);
          dashGeo.rotateX(-Math.PI / 2);
          const dashMesh = new THREE.Mesh(dashGeo, markingWhite);
          const t = ((i + 0.5) * (dashLen + gapLen) - length / 2);
          const dashPos = mid.clone().add(dir.clone().normalize().multiplyScalar(t));
          dashMesh.position.set(dashPos.x, 0.075, dashPos.z);
          dashMesh.rotation.y = angle;
          this.roadGroup.add(dashMesh);
        }
      }

      // 3. Sidewalks & Curbs on both road edges
      if (rtype !== 'walkway') {
        const halfW = rwidth / 2;
        const swWidth = 0.85;
        [-1, 1].forEach((sign) => {
          // Sidewalk strip
          const swGeo = new THREE.PlaneGeometry(swWidth, length);
          swGeo.rotateX(-Math.PI / 2);
          const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
          swMesh.position.copy(mid);
          swMesh.rotation.y = angle;
          swMesh.translateX(sign * (halfW + swWidth / 2));
          swMesh.position.y = 0.08;
          swMesh.receiveShadow = true;
          this.roadGroup.add(swMesh);

          // Curb barrier
          const curbGeo = new THREE.BoxGeometry(0.18, 0.16, length);
          const curb = new THREE.Mesh(curbGeo, curbMat);
          curb.position.copy(mid);
          curb.rotation.y = angle;
          curb.translateX(sign * halfW);
          curb.position.y = 0.1;
          curb.castShadow = true;
          this.roadGroup.add(curb);
        });
      }

      // 4. Pedestrian Crosswalks (Zebra stripes) near junction endpoints
      const srcNode = nodeMap.get(edge.source);
      const tgtNode = nodeMap.get(edge.target);
      if ((rtype === 'boulevard' || rtype === 'avenue') && length > 18.0) {
        if (srcNode && srcNode.type === 'junction') {
          this.addCrosswalkMarkings(v1, dir.clone().normalize(), rwidth, angle);
        }
        if (tgtNode && tgtNode.type === 'junction') {
          this.addCrosswalkMarkings(v2, dir.clone().normalize().negate(), rwidth, angle);
        }
      }
    });
  }

  addCrosswalkMarkings(junctionPos, roadDir, rwidth, angle) {
    const crosswalkOffset = junctionPos.clone().add(roadDir.clone().multiplyScalar(3.2));
    const stripeCount = Math.floor(rwidth / 0.8);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let s = -stripeCount / 2; s <= stripeCount / 2; s++) {
      const stripeGeo = new THREE.PlaneGeometry(0.38, 1.4);
      stripeGeo.rotateX(-Math.PI / 2);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.copy(crosswalkOffset);
      stripe.rotation.y = angle;
      stripe.translateX(s * 0.7);
      stripe.position.y = 0.08;
      this.roadGroup.add(stripe);
    }
  }

  buildRoundabouts(nodes) {
    const roundabouts = nodes.filter(
      (n) => n.name && n.name.toLowerCase().includes('roundabout')
    );

    const roadRingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
      metalness: 0.15,
    });

    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x166534, // vibrant manicured grass
      roughness: 0.9,
    });

    const fountainMat = new THREE.MeshStandardMaterial({
      color: 0x0891b2,
      roughness: 0.2,
      metalness: 0.6,
    });

    roundabouts.forEach((rb) => {
      const pos = this.graphToWorld(rb.x, rb.y);

      // Outer circular road ring
      const ringGeo = new THREE.RingGeometry(8.5, 14.5, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const roadRing = new THREE.Mesh(ringGeo, roadRingMat);
      roadRing.position.set(pos.x, 0.065, pos.z);
      roadRing.receiveShadow = true;
      this.roadGroup.add(roadRing);

      // Inner landscaped green island
      const islandGeo = new THREE.CylinderGeometry(8.2, 8.4, 0.4, 36);
      const island = new THREE.Mesh(islandGeo, lawnMat);
      island.position.set(pos.x, 0.2, pos.z);
      island.receiveShadow = true;
      this.roadGroup.add(island);

      // Central Decorative Architectural Fountain
      const poolGeo = new THREE.CylinderGeometry(3.2, 3.5, 0.6, 24);
      const pool = new THREE.Mesh(poolGeo, fountainMat);
      pool.position.set(pos.x, 0.5, pos.z);
      this.roadGroup.add(pool);

      const pillarGeo = new THREE.CylinderGeometry(0.6, 0.9, 4.5, 12);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(pos.x, 2.5, pos.z);
      this.roadGroup.add(pillar);
    });
  }

  buildInfillCityBlocks(nodes, edges) {
    // Fill open parcels between roads with modular European-style perimeter blocks & townhouses
    // Solves the "large empty spaces between buildings" problem completely.
    const nodeCoords = nodes.map((n) => ({ x: n.x, y: n.y }));

    const distPointToSegment = (px, py, x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      return Math.hypot(px - projX, py - projY);
    };

    const validParcels = [];
    for (let gx = 120; gx <= 880; gx += 40) {
      for (let gy = 80; gy <= 880; gy += 40) {
        // Distance clearance from all 113 landmark buildings & junctions (>= 32m)
        let minNodeDist = Infinity;
        for (let i = 0; i < nodeCoords.length; i++) {
          const d = Math.hypot(gx - nodeCoords[i].x, gy - nodeCoords[i].y);
          if (d < minNodeDist) minNodeDist = d;
        }
        if (minNodeDist < 32.0) continue;

        // Distance clearance from all 227 road segment centerlines (>= 22m)
        let minEdgeDist = Infinity;
        for (let i = 0; i < edges.length; i++) {
          const u = nodes.find((n) => n.id === edges[i].source);
          const v = nodes.find((n) => n.id === edges[i].target);
          if (u && v) {
            const d = distPointToSegment(gx, gy, u.x, u.y, v.x, v.y);
            if (d < minEdgeDist) minEdgeDist = d;
          }
        }
        if (minEdgeDist >= 22.0) {
          validParcels.push({ x: gx, y: gy });
        }
      }
    }

    if (validParcels.length === 0) return;

    // High performance instanced city blocks
    const blockCount = validParcels.length;
    const bodyGeo = new THREE.BoxGeometry(16.0, 10.0, 14.0);
    const roofGeo = new THREE.ConeGeometry(12.5, 4.0, 4);
    roofGeo.rotateY(Math.PI / 4);

    const wallColors = [0x64748b, 0x475569, 0x78716c, 0x94a3b8, 0x52525b, 0x71717a];
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.75,
      metalness: 0.15,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // dark slate mansard roof
      roughness: 0.6,
      metalness: 0.3,
    });

    const bodyInst = new THREE.InstancedMesh(bodyGeo, wallMat, blockCount);
    const roofInst = new THREE.InstancedMesh(roofGeo, roofMat, blockCount);
    bodyInst.castShadow = true;
    bodyInst.receiveShadow = true;
    roofInst.castShadow = true;

    const dummy = new THREE.Object3D();
    const colorObj = new THREE.Color();

    validParcels.forEach((p, idx) => {
      const wp = this.graphToWorld(p.x, p.y);
      const heightScale = 0.8 + ((p.x * 3 + p.y * 7) % 7) * 0.12; // Variation 8-14m
      const wScale = 0.85 + ((p.x + p.y) % 5) * 0.08;

      // Building Body
      dummy.position.set(wp.x, (10.0 * heightScale) / 2, wp.z);
      dummy.scale.set(wScale, heightScale, wScale);
      dummy.rotation.y = (((p.x + p.y) % 4) * Math.PI) / 2;
      dummy.updateMatrix();
      bodyInst.setMatrixAt(idx, dummy.matrix);

      // Randomize subtle stone/brick facade tone
      const colHex = wallColors[idx % wallColors.length];
      colorObj.setHex(colHex);
      bodyInst.setColorAt(idx, colorObj);

      // Pitched Mansard Roof
      dummy.position.set(wp.x, 10.0 * heightScale + 2.0, wp.z);
      dummy.scale.set(wScale, 1.0, wScale);
      dummy.updateMatrix();
      roofInst.setMatrixAt(idx, dummy.matrix);
    });

    bodyInst.instanceMatrix.needsUpdate = true;
    if (bodyInst.instanceColor) bodyInst.instanceColor.needsUpdate = true;
    roofInst.instanceMatrix.needsUpdate = true;

    this.envGroup.add(bodyInst);
    this.envGroup.add(roofInst);
  }

  buildInstancedTrees(nodes) {
    const treeCount = 350;
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

    for (let i = 0; i < treeCount * 2; i++) {
      const rx = (Math.random() - 0.5) * 520;
      const rz = (Math.random() - 0.5) * 460;

      // Keep trees at comfortable distance from building centers
      let tooClose = false;
      for (const node of nodes) {
        const wp = this.graphToWorld(node.x, node.y);
        if (Math.hypot(rx - wp.x, rz - wp.z) < 12.0) {
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
    const lampCount = 140;
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
