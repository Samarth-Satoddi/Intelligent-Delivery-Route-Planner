/**
 * City-Scale Procedural 3D Building, Architecture, and Environment Generator.
 * Constructs rich district-specific 3D buildings using pure Three.js procedural geometry.
 */
import * as THREE from 'three';

export class BuildingFactory {
  constructor() {
    this.materials = this.initMaterials();
  }

  initMaterials() {
    return {
      // Ground and base materials
      ground: new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9, metalness: 0.1 }),
      plaza: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.2 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 }),
      lightWall: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.2 }),
      brick: new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8, metalness: 0.1 }),
      warmStone: new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7, metalness: 0.1 }),

      // District-themed glass and accents
      adminGlass: new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.35,
        roughness: 0.1,
        transmission: 0.7,
        thickness: 1.5,
      }),
      academicGlass: new THREE.MeshPhysicalMaterial({
        color: 0x22d3ee,
        emissive: 0x0891b2,
        emissiveIntensity: 0.3,
        roughness: 0.15,
        transmission: 0.65,
      }),
      cultureGold: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.25,
        roughness: 0.25,
        metalness: 0.85,
      }),
      studentWarm: new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0xb45309,
        emissiveIntensity: 0.2,
        roughness: 0.6,
      }),
      sportsGreen: new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.9,
      }),
      sportsTrack: new THREE.MeshStandardMaterial({
        color: 0xb91c1c,
        roughness: 0.8,
      }),
      waterPool: new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.4,
        roughness: 0.05,
        transmission: 0.85,
        transparent: true,
        opacity: 0.8,
      }),
      roofDark: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 }),
      glowCyan: new THREE.MeshBasicMaterial({ color: 0x06b6d4 }),
      glowOrange: new THREE.MeshBasicMaterial({ color: 0xf97316 }),
      glowRed: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      glowGreen: new THREE.MeshBasicMaterial({ color: 0x22c55e }),

      // Foliage and trees
      trunk: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }),
      foliageGreen: new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8, flatShading: true }),
      foliageEmerald: new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.8, flatShading: true }),
    };
  }

  createBuilding(node) {
    const group = new THREE.Group();
    group.name = `building_${node.id}`;
    group.userData = { nodeData: node };

    const id = node.id;
    const district = node.district || 'General Campus';
    const type = node.type || 'junction';

    // Route to district-specific procedural generator
    if (type === 'junction') {
      this.buildJunction(group, node);
    } else if (district.includes('Administration')) {
      this.buildAdminBuilding(group, node);
    } else if (district.includes('Academic')) {
      this.buildAcademicBuilding(group, node);
    } else if (district.includes('Culture') || district.includes('Knowledge')) {
      this.buildCultureBuilding(group, node);
    } else if (district.includes('Student')) {
      this.buildStudentLifeBuilding(group, node);
    } else if (district.includes('Sports')) {
      this.buildSportsBuilding(group, node);
    } else if (district.includes('Transport')) {
      this.buildTransportBuilding(group, node);
    } else {
      this.buildGenericBuilding(group, node);
    }

    // 3D Floating Title Sprite (Show for Landmark Buildings and Roundabouts)
    const isRoundabout = (node.name || '').toLowerCase().includes('roundabout');
    if (type !== 'junction' || isRoundabout) {
      const h = isRoundabout ? 3.5 : (node.building_height || 20) * 0.45;
      const labelSprite = this.createFloatingLabel(node.name, type, district);
      labelSprite.position.set(0, h + 3.8, 0);
      group.add(labelSprite);
    }

    // Base Selection Ring (for Landmark buildings)
    if (type !== 'junction') {
      const ringRadius = Math.max((node.building_width || 25) * 0.28, 4.0);
      const ringGeo = new THREE.RingGeometry(ringRadius, ringRadius + 1.2, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringColor =
        type === 'start_office'
          ? 0x22c55e
          : type === 'destination'
          ? 0x06b6d4
          : 0x94a3b8;
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.05;
      group.add(ringMesh);
    }

    return group;
  }

  // --- 1. ADMINISTRATION DISTRICT (High-Rise Glass Towers & Spires) ---
  buildAdminBuilding(group, node) {
    const w = (node.building_width || 36) * 0.45;
    const d = (node.building_depth || 30) * 0.45;
    const h = (node.building_height || 40) * 0.45;

    // Podium Base
    const baseGeo = new THREE.BoxGeometry(w * 1.15, h * 0.25, d * 1.15);
    const base = new THREE.Mesh(baseGeo, this.materials.darkSteel);
    base.position.y = (h * 0.25) / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Main Tower with Glass Inset
    const towerGeo = new THREE.BoxGeometry(w * 0.9, h * 0.75, d * 0.9);
    const tower = new THREE.Mesh(towerGeo, this.materials.concrete);
    tower.position.y = h * 0.25 + (h * 0.75) / 2;
    tower.castShadow = true;
    group.add(tower);

    // Glass Facade Curtain
    const glassGeo = new THREE.BoxGeometry(w * 0.92, h * 0.65, d * 0.4);
    const glass = new THREE.Mesh(glassGeo, this.materials.adminGlass);
    glass.position.set(0, h * 0.25 + (h * 0.75) / 2, d * 0.28);
    group.add(glass);

    // Architectural Roof Elements (Spire for Central Office, Heli-pad for Security HQ)
    if (node.id === 'central_office') {
      const spireGeo = new THREE.CylinderGeometry(0.2, 0.8, 6.0, 8);
      const spire = new THREE.Mesh(spireGeo, this.materials.metal);
      spire.position.y = h + 3.0;
      group.add(spire);

      const beaconGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const beacon = new THREE.Mesh(beaconGeo, this.materials.glowRed);
      beacon.position.y = h + 6.2;
      group.add(beacon);
    } else if (node.id === 'security_hq') {
      const radarGeo = new THREE.CylinderGeometry(2.0, 0.5, 1.5, 16);
      const radar = new THREE.Mesh(radarGeo, this.materials.metal);
      radar.position.set(0, h + 1.0, 0);
      group.add(radar);
    }
  }

  // --- 2. ACADEMIC DISTRICT (Modern Engineering Wings, Solar Roofs, Louvers) ---
  buildAcademicBuilding(group, node) {
    const w = (node.building_width || 40) * 0.45;
    const d = (node.building_depth || 34) * 0.45;
    const h = (node.building_height || 36) * 0.45;

    // Dual-Wing Academic Block
    const wingGeo = new THREE.BoxGeometry(w, h, d);
    const wing = new THREE.Mesh(wingGeo, this.materials.lightWall);
    wing.position.y = h / 2;
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);

    // Academic Cyan Glass Ribbons
    const ribbonGeo = new THREE.BoxGeometry(w * 1.02, h * 0.35, d * 0.8);
    const ribbon = new THREE.Mesh(ribbonGeo, this.materials.academicGlass);
    ribbon.position.y = h * 0.55;
    group.add(ribbon);

    // Rooftop Solar Array
    const solarGeo = new THREE.BoxGeometry(w * 0.75, 0.4, d * 0.65);
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.9 });
    const solar = new THREE.Mesh(solarGeo, solarMat);
    solar.position.set(0, h + 0.25, 0);
    group.add(solar);

    // Entrance Portico
    const porticoGeo = new THREE.BoxGeometry(w * 0.45, 0.5, 4.0);
    const portico = new THREE.Mesh(porticoGeo, this.materials.roofDark);
    portico.position.set(0, 2.5, d / 2 + 1.8);
    group.add(portico);
  }

  // --- 3. KNOWLEDGE & CULTURE DISTRICT (Rotundas, Domes, Pillars, Amphitheaters) ---
  buildCultureBuilding(group, node) {
    const w = (node.building_width || 48) * 0.45;
    const d = (node.building_depth || 40) * 0.45;
    const h = (node.building_height || 36) * 0.45;

    if (node.id === 'central_library') {
      // Cylindrical Multi-Level Rotunda
      const rotundaGeo = new THREE.CylinderGeometry(w * 0.55, w * 0.6, h * 0.75, 32);
      const rotunda = new THREE.Mesh(rotundaGeo, this.materials.concrete);
      rotunda.position.y = (h * 0.75) / 2;
      rotunda.castShadow = true;
      group.add(rotunda);

      // Glass Sky-Dome on Top
      const domeGeo = new THREE.SphereGeometry(w * 0.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const dome = new THREE.Mesh(domeGeo, this.materials.adminGlass);
      dome.position.y = h * 0.75;
      group.add(dome);

      // Classical Entrance Colonnade
      for (let angle = -Math.PI / 4; angle <= Math.PI / 4; angle += Math.PI / 8) {
        const cx = Math.sin(angle) * (w * 0.65);
        const cz = Math.cos(angle) * (w * 0.65);
        const colGeo = new THREE.CylinderGeometry(0.35, 0.35, h * 0.5, 12);
        const col = new THREE.Mesh(colGeo, this.materials.warmStone);
        col.position.set(cx, (h * 0.5) / 2, cz);
        group.add(col);
      }
    } else if (node.id === 'auditorium') {
      // Fan-shaped Grand Amphitheater
      const audiGeo = new THREE.CylinderGeometry(w * 0.6, w * 0.7, h, 24, 1, false, 0, Math.PI * 1.4);
      const audi = new THREE.Mesh(audiGeo, this.materials.brick);
      audi.position.y = h / 2;
      audi.rotation.y = -Math.PI * 0.7;
      audi.castShadow = true;
      group.add(audi);

      // Sweeping Curved Roof
      const roofGeo = new THREE.ConeGeometry(w * 0.75, 4.0, 24);
      const roof = new THREE.Mesh(roofGeo, this.materials.cultureGold);
      roof.position.y = h + 2.0;
      group.add(roof);
    } else {
      // Monumental Pavilion
      const pavGeo = new THREE.BoxGeometry(w, h * 0.8, d);
      const pav = new THREE.Mesh(pavGeo, this.materials.warmStone);
      pav.position.y = (h * 0.8) / 2;
      pav.castShadow = true;
      group.add(pav);

      // Golden Cornice
      const corniceGeo = new THREE.BoxGeometry(w * 1.08, 1.2, d * 1.08);
      const cornice = new THREE.Mesh(corniceGeo, this.materials.cultureGold);
      cornice.position.y = h * 0.8 + 0.6;
      group.add(cornice);
    }
  }

  // --- 4. STUDENT LIFE DISTRICT (Vibrant Pavilions, Hostels, Dining Terraces) ---
  buildStudentLifeBuilding(group, node) {
    const w = (node.building_width || 38) * 0.45;
    const d = (node.building_depth || 30) * 0.45;
    const h = (node.building_height || 26) * 0.45;

    // Main Residential / Community Block
    const blockGeo = new THREE.BoxGeometry(w, h, d);
    const block = new THREE.Mesh(blockGeo, this.materials.brick);
    block.position.y = h / 2;
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);

    // Warm Glazed Dining or Balcony Ribbon
    const glazeGeo = new THREE.BoxGeometry(w * 1.02, h * 0.4, d * 0.7);
    const glaze = new THREE.Mesh(glazeGeo, this.materials.studentWarm);
    glaze.position.y = h * 0.6;
    group.add(glaze);

    // Medical Centre Red Cross emblem
    if (node.id === 'medical_centre') {
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.0, 0.2), this.materials.glowRed);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.8, 0.2), this.materials.glowRed);
      crossV.position.set(0, h * 0.7, d / 2 + 0.15);
      crossH.position.set(0, h * 0.7, d / 2 + 0.15);
      group.add(crossV);
      group.add(crossH);
    }
  }

  // --- 5. SPORTS DISTRICT (Stadiums, Pitches, Swimming Pools, Courts) ---
  buildSportsBuilding(group, node) {
    const w = (node.building_width || 60) * 0.45;
    const d = (node.building_depth || 45) * 0.45;
    const h = (node.building_height || 20) * 0.45;

    if (node.id === 'main_stadium') {
      // Grand Olympic Stadium Bowl
      const bowlGeo = new THREE.CylinderGeometry(w * 0.55, w * 0.45, h, 32, 1, true);
      const bowl = new THREE.Mesh(bowlGeo, this.materials.concrete);
      bowl.position.y = h / 2;
      bowl.castShadow = true;
      group.add(bowl);

      // Red Running Track Base
      const trackGeo = new THREE.CylinderGeometry(w * 0.42, w * 0.42, 0.3, 32);
      const track = new THREE.Mesh(trackGeo, this.materials.sportsTrack);
      track.position.y = 0.2;
      group.add(track);

      // Green Turf Field Inside
      const fieldGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.3, 0.4, 32);
      const field = new THREE.Mesh(fieldGeo, this.materials.sportsGreen);
      field.position.y = 0.25;
      group.add(field);
    } else if (node.id === 'swimming_pool') {
      // Swimming Pavilion
      const deckGeo = new THREE.BoxGeometry(w, 1.2, d);
      const deck = new THREE.Mesh(deckGeo, this.materials.plaza);
      deck.position.y = 0.6;
      group.add(deck);

      // Blue Pool Water
      const poolGeo = new THREE.BoxGeometry(w * 0.8, 0.5, d * 0.7);
      const pool = new THREE.Mesh(poolGeo, this.materials.waterPool);
      pool.position.y = 1.0;
      group.add(pool);
    } else if (node.id === 'football_ground' || node.id === 'cricket_ground') {
      // Flat Natural Turf Pitch with Perimeter Boundary
      const turfGeo = new THREE.BoxGeometry(w, 0.3, d);
      const turf = new THREE.Mesh(turfGeo, this.materials.sportsGreen);
      turf.position.y = 0.15;
      turf.receiveShadow = true;
      group.add(turf);
    } else {
      // Multi-Sport Court / Gym Arena
      const arenaGeo = new THREE.BoxGeometry(w, h, d);
      const arena = new THREE.Mesh(arenaGeo, this.materials.concrete);
      arena.position.y = h / 2;
      arena.castShadow = true;
      group.add(arena);
    }
  }

  // --- 6. TRANSPORT & INFRASTRUCTURE (Gate Portals, Bus Bays, Parking Decks) ---
  buildTransportBuilding(group, node) {
    const w = (node.building_width || 36) * 0.45;
    const d = (node.building_depth || 26) * 0.45;
    const h = (node.building_height || 18) * 0.45;

    if (node.id.includes('gate')) {
      // Monumental Portal Arch
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(3.0, h, 3.0), this.materials.darkSteel);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, h, 3.0), this.materials.darkSteel);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 2.5, 3.5), this.materials.roofDark);
      p1.position.set(-w / 2 + 1.5, h / 2, 0);
      p2.position.set(w / 2 - 1.5, h / 2, 0);
      beam.position.set(0, h - 1.0, 0);
      group.add(p1);
      group.add(p2);
      group.add(beam);
    } else if (node.id === 'bus_terminal') {
      // Curved Tensile Terminal Canopy
      const canopyGeo = new THREE.CylinderGeometry(w * 0.55, w * 0.55, 0.4, 24, 1, false, 0, Math.PI);
      const canopy = new THREE.Mesh(canopyGeo, this.materials.metal);
      canopy.position.set(0, h, 0);
      canopy.rotation.z = Math.PI / 2;
      group.add(canopy);

      const platGeo = new THREE.BoxGeometry(w, 0.6, d);
      const plat = new THREE.Mesh(platGeo, this.materials.plaza);
      plat.position.y = 0.3;
      group.add(plat);
    } else {
      // Structured Parking Deck / Substation
      const deckGeo = new THREE.BoxGeometry(w, h, d);
      const deck = new THREE.Mesh(deckGeo, this.materials.darkSteel);
      deck.position.y = h / 2;
      deck.castShadow = true;
      group.add(deck);
    }
  }

  // --- 7. TRAFFIC JUNCTIONS & ROUNDABOUTS ---
  buildJunction(group, node) {
    const isRoundabout = node.name.toLowerCase().includes('roundabout') || node.name.toLowerCase().includes('circle');

    if (isRoundabout) {
      // Central Circular Traffic Island
      const islandGeo = new THREE.CylinderGeometry(5.0, 5.5, 0.6, 32);
      const island = new THREE.Mesh(islandGeo, this.materials.plaza);
      island.position.y = 0.3;
      island.receiveShadow = true;
      group.add(island);

      // Central Decorative Obelisk / Fountain Pillar
      const pillarGeo = new THREE.CylinderGeometry(0.8, 1.2, 5.0, 8);
      const pillar = new THREE.Mesh(pillarGeo, this.materials.metal);
      pillar.position.y = 3.0;
      group.add(pillar);

      // Glowing Beacon Ring
      const ringGeo = new THREE.TorusGeometry(3.5, 0.2, 8, 32);
      ringGeo.rotateX(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, this.materials.glowCyan);
      ring.position.y = 0.65;
      group.add(ring);
    } else {
      // Standard Intersection Plinth
      const plinthGeo = new THREE.CylinderGeometry(2.5, 3.0, 0.3, 16);
      const plinth = new THREE.Mesh(plinthGeo, this.materials.plaza);
      plinth.position.y = 0.15;
      group.add(plinth);
    }
  }

  buildGenericBuilding(group, node) {
    const w = (node.building_width || 25) * 0.45;
    const d = (node.building_depth || 25) * 0.45;
    const h = (node.building_height || 20) * 0.45;

    const bldgGeo = new THREE.BoxGeometry(w, h, d);
    const bldg = new THREE.Mesh(bldgGeo, this.materials.concrete);
    bldg.position.y = h / 2;
    bldg.castShadow = true;
    bldg.receiveShadow = true;
    group.add(bldg);
  }

  // 3D Floating Canvas Label Sprite
  createFloatingLabel(name, type, district = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Gradient Pill Background
    const grad = ctx.createLinearGradient(0, 0, 384, 96);
    if (type === 'start_office') {
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
      grad.addColorStop(1, 'rgba(5, 150, 105, 0.9)');
    } else if (type === 'destination') {
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
      grad.addColorStop(1, 'rgba(30, 41, 59, 0.92)');
    } else {
      grad.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
      grad.addColorStop(1, 'rgba(51, 65, 85, 0.85)');
    }

    ctx.fillStyle = grad;
    this.roundRect(ctx, 4, 4, 376, 88, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = type === 'start_office' ? '#34d399' : '#06b6d4';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Text Name
    ctx.font = 'bold 26px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 192, 40);

    // District Subtext
    if (district) {
      ctx.font = '500 16px "Inter", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(district.toUpperCase(), 192, 68);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 4, 1);
    return sprite;
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
