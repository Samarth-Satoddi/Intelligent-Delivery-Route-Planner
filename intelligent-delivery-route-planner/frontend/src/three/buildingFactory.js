/**
 * Procedural 3D Building, Junction, and Environment Generator.
 * Constructs rich architectural models using pure procedural Three.js geometry.
 */
import * as THREE from 'three';

export class BuildingFactory {
  constructor() {
    this.materials = this.initMaterials();
  }

  initMaterials() {
    return {
      ground: new THREE.MeshStandardMaterial({
        color: 0x0b1120,
        roughness: 0.85,
        metalness: 0.15,
      }),
      plaza: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.7,
        metalness: 0.2,
      }),
      lawn: new THREE.MeshStandardMaterial({
        color: 0x064e3b,
        roughness: 0.9,
        metalness: 0.05,
      }),
      concrete: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
        metalness: 0.3,
      }),
      darkWall: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.5,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.25,
        roughness: 0.1,
        transmission: 0.6,
        thickness: 1.2,
      }),
      warmGlass: new THREE.MeshPhysicalMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        roughness: 0.2,
      }),
      roof: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.5,
        metalness: 0.4,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.3,
        metalness: 0.8,
      }),
      accentCyan: new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.8,
      }),
      accentOrange: new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 0.8,
      }),
      trunk: new THREE.MeshStandardMaterial({
        color: 0x3e2723,
        roughness: 0.9,
      }),
      foliageA: new THREE.MeshStandardMaterial({
        color: 0x059669,
        roughness: 0.8,
        flatShading: true,
      }),
      foliageB: new THREE.MeshStandardMaterial({
        color: 0x047857,
        roughness: 0.8,
        flatShading: true,
      }),
    };
  }

  createBuilding(node) {
    const group = new THREE.Group();
    group.name = `building_${node.id}`;
    group.userData = { nodeData: node };

    const type = node.type || 'junction';

    if (node.id === 'central_office') {
      this.buildCentralOffice(group);
    } else if (node.id === 'library') {
      this.buildLibrary(group);
    } else if (node.id === 'department_office') {
      this.buildDepartmentOffice(group);
    } else if (node.id === 'examination_section') {
      this.buildExaminationSection(group);
    } else if (node.id === 'accounts_section') {
      this.buildAccountsSection(group);
    } else if (node.id === 'seminar_hall') {
      this.buildSeminarHall(group);
    } else if (type === 'destination' || type === 'office') {
      this.buildGenericAcademicBuilding(group, node.name);
    } else {
      this.buildJunction(group, node);
    }

    // Add 3D floating title sprite
    const labelSprite = this.createFloatingLabel(node.name, type);
    labelSprite.position.set(0, this.getBuildingHeight(node.id) + 4, 0);
    group.add(labelSprite);

    // Add base selection ring
    const ringGeo = new THREE.RingGeometry(5, 6, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: type === 'start_office' ? 0x22c55e : type === 'destination' ? 0xf59e0b : 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.05;
    group.add(ringMesh);

    return group;
  }

  getBuildingHeight(id) {
    switch (id) {
      case 'central_office':
        return 22;
      case 'library':
        return 16;
      case 'department_office':
        return 15;
      case 'examination_section':
        return 13;
      case 'seminar_hall':
        return 12;
      case 'accounts_section':
        return 11;
      default:
        return 7;
    }
  }

  // 1. Central Office: Flagship Headquarters & Dispatch Hub
  buildCentralOffice(group) {
    // Podium
    const baseGeo = new THREE.BoxGeometry(22, 5, 20);
    const base = new THREE.Mesh(baseGeo, this.materials.darkWall);
    base.position.y = 2.5;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Upper Tower
    const towerGeo = new THREE.BoxGeometry(14, 12, 14);
    const tower = new THREE.Mesh(towerGeo, this.materials.concrete);
    tower.position.y = 11;
    tower.castShadow = true;
    group.add(tower);

    // Glass curtain facade
    const glassGeo = new THREE.BoxGeometry(14.2, 8, 4);
    const glass = new THREE.Mesh(glassGeo, this.materials.glass);
    glass.position.set(0, 11, 5.2);
    group.add(glass);

    // Central Clock & Antenna Spire
    const spireGeo = new THREE.CylinderGeometry(0.5, 1.2, 7, 8);
    const spire = new THREE.Mesh(spireGeo, this.materials.metal);
    spire.position.y = 20.5;
    group.add(spire);

    // Glowing red beacon on top
    const beaconGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 24.2;
    group.add(beacon);

    // Entrance Portico
    const porticoGeo = new THREE.BoxGeometry(10, 0.6, 6);
    const portico = new THREE.Mesh(porticoGeo, this.materials.roof);
    portico.position.set(0, 4.2, 11);
    group.add(portico);

    for (let x = -4; x <= 4; x += 2.6) {
      const colGeo = new THREE.CylinderGeometry(0.3, 0.3, 4, 12);
      const col = new THREE.Mesh(colGeo, this.materials.metal);
      col.position.set(x, 2, 13.5);
      col.castShadow = true;
      group.add(col);
    }
  }

  // 2. Library: Multi-tier Reading Atrium & Rotunda
  buildLibrary(group) {
    // Stepped circular base
    const rotundaGeo = new THREE.CylinderGeometry(11, 12, 7, 32);
    const rotunda = new THREE.Mesh(rotundaGeo, this.materials.darkWall);
    rotunda.position.y = 3.5;
    rotunda.castShadow = true;
    rotunda.receiveShadow = true;
    group.add(rotunda);

    // Second glass tier
    const midGeo = new THREE.CylinderGeometry(9, 9, 6, 32);
    const mid = new THREE.Mesh(midGeo, this.materials.warmGlass);
    mid.position.y = 10;
    mid.castShadow = true;
    group.add(mid);

    // Glass Dome Roof
    const domeGeo = new THREE.SphereGeometry(7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, this.materials.glass);
    dome.position.y = 13;
    group.add(dome);

    // Modern Book-Arch Columns
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const ribGeo = new THREE.BoxGeometry(0.8, 13, 1.2);
      const rib = new THREE.Mesh(ribGeo, this.materials.metal);
      rib.position.set(Math.cos(angle) * 11.2, 6.5, Math.sin(angle) * 11.2);
      rib.rotation.y = -angle;
      group.add(rib);
    }
  }

  // 3. Department Office: Sleek Modern Engineering Pavilion
  buildDepartmentOffice(group) {
    const mainGeo = new THREE.BoxGeometry(20, 10, 16);
    const main = new THREE.Mesh(mainGeo, this.materials.darkWall);
    main.position.y = 5;
    main.castShadow = true;
    main.receiveShadow = true;
    group.add(main);

    // Cantilevered Glass Wing
    const wingGeo = new THREE.BoxGeometry(16, 5, 8);
    const wing = new THREE.Mesh(wingGeo, this.materials.glass);
    wing.position.set(4, 11, 3);
    wing.castShadow = true;
    group.add(wing);

    // Rooftop Solar Array
    for (let z = -5; z <= 2; z += 3.5) {
      const panelGeo = new THREE.BoxGeometry(14, 0.2, 2.5);
      const panel = new THREE.Mesh(panelGeo, this.materials.accentCyan);
      panel.position.set(2, 14, z);
      panel.rotation.x = 0.2;
      group.add(panel);
    }
  }

  // 4. Examination Section: Secure Classical Block
  buildExaminationSection(group) {
    const coreGeo = new THREE.BoxGeometry(18, 9, 18);
    const core = new THREE.Mesh(coreGeo, this.materials.concrete);
    core.position.y = 4.5;
    core.castShadow = true;
    core.receiveShadow = true;
    group.add(core);

    // Inner courtyard void effect (recessed dark roof)
    const courtGeo = new THREE.BoxGeometry(8, 2, 8);
    const court = new THREE.Mesh(courtGeo, this.materials.roof);
    court.position.y = 9;
    group.add(court);

    // Pillared Entry
    const pedimentGeo = new THREE.ConeGeometry(5, 2, 4);
    pedimentGeo.rotateY(Math.PI / 4);
    const pediment = new THREE.Mesh(pedimentGeo, this.materials.metal);
    pediment.position.set(0, 10, 9.5);
    group.add(pediment);
  }

  // 5. Accounts Section: Financial Wing
  buildAccountsSection(group) {
    const hallGeo = new THREE.BoxGeometry(16, 7, 14);
    const hall = new THREE.Mesh(hallGeo, this.materials.darkWall);
    hall.position.y = 3.5;
    hall.castShadow = true;
    hall.receiveShadow = true;
    group.add(hall);

    // Sloped Mansard Roof
    const roofGeo = new THREE.CylinderGeometry(6, 9, 3, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, this.materials.roof);
    roof.position.y = 8.5;
    group.add(roof);

    // Gold decorative insignia
    const coinGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.position.set(0, 5, 7.2);
    group.add(coin);
  }

  // 6. Seminar Hall: Futuristic Amphitheater
  buildSeminarHall(group) {
    // Curved amphitheater wedge
    const hallGeo = new THREE.CylinderGeometry(13, 14, 8, 32, 1, false, 0, Math.PI * 1.4);
    const hall = new THREE.Mesh(hallGeo, this.materials.concrete);
    hall.position.y = 4;
    hall.rotation.y = -Math.PI * 0.7;
    hall.castShadow = true;
    hall.receiveShadow = true;
    group.add(hall);

    // Aerodynamic Sloped Roof Canopy
    const canopyGeo = new THREE.ConeGeometry(15, 4, 32);
    const canopy = new THREE.Mesh(canopyGeo, this.materials.darkWall);
    canopy.position.set(0, 9, 0);
    canopy.scale.set(1, 0.4, 1);
    group.add(canopy);

    // Glass entrance strip
    const glassGeo = new THREE.BoxGeometry(12, 4, 2);
    const glass = new THREE.Mesh(glassGeo, this.materials.glass);
    glass.position.set(0, 2, 7.5);
    group.add(glass);
  }

  // 7. Generic Academic Facility
  buildGenericAcademicBuilding(group, name) {
    const geo = new THREE.BoxGeometry(14, 8, 12);
    const mesh = new THREE.Mesh(geo, this.materials.darkWall);
    mesh.position.y = 4;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const roofGeo = new THREE.BoxGeometry(15, 1, 13);
    const roof = new THREE.Mesh(roofGeo, this.materials.roof);
    roof.position.y = 8.5;
    group.add(roof);
  }

  // 8. Junction / Plaza Hub
  buildJunction(group, node) {
    // Raised decorative circular plaza
    const discGeo = new THREE.CylinderGeometry(7, 7.5, 0.4, 32);
    const disc = new THREE.Mesh(discGeo, this.materials.plaza);
    disc.position.y = 0.2;
    disc.receiveShadow = true;
    group.add(disc);

    // Inner compass circle
    const innerGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.45, 16);
    const inner = new THREE.Mesh(innerGeo, this.materials.concrete);
    inner.position.y = 0.22;
    group.add(inner);

    // Modern Street Lamp Post
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 5, 8);
    const pole = new THREE.Mesh(poleGeo, this.materials.metal);
    pole.position.set(2.5, 2.5, 2.5);
    pole.castShadow = true;
    group.add(pole);

    const lampGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(2.5, 5, 2.5);
    group.add(lamp);

    // Point Light for subtle real lighting
    const light = new THREE.PointLight(0x38bdf8, 1.2, 20);
    light.position.set(2.5, 5, 2.5);
    group.add(light);
  }

  // Create High-DPI Floating Canvas Label
  createFloatingLabel(text, type) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect(16, 16, 480, 96, 24);
    ctx.fill();

    // Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = type === 'start_office' ? '#22c55e' : type === 'destination' ? '#f59e0b' : '#38bdf8';
    ctx.stroke();

    // Typography
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 4, 1);
    return sprite;
  }

  // Create procedural tree
  createTree(x, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.set(scale, scale, scale);

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.materials.trunk);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageGeo = new THREE.ConeGeometry(2.2, 4.5, 8);
    const foliage = new THREE.Mesh(foliageGeo, Math.random() > 0.5 ? this.materials.foliageA : this.materials.foliageB);
    foliage.position.y = 4.8;
    foliage.castShadow = true;
    group.add(foliage);

    const topGeo = new THREE.ConeGeometry(1.6, 3.2, 8);
    const top = new THREE.Mesh(topGeo, this.materials.foliageA);
    top.position.y = 6.6;
    top.castShadow = true;
    group.add(top);

    return group;
  }
}
