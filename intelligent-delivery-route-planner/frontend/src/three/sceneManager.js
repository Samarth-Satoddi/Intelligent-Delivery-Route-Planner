/**
 * 3D Scene Manager: Orchestrates Three.js rendering, lighting, camera controls, raycasting, and sub-systems.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CampusBuilder } from './campusBuilder.js';
import { RouteRenderer } from './routeRenderer.js';
import { CourierRobot } from './courierRobot.js';

export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.width = canvasContainer.clientWidth || window.innerWidth;
    this.height = canvasContainer.clientHeight || window.innerHeight;

    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d16);
    this.scene.fog = new THREE.FogExp2(0x090d16, 0.0028);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 2. Camera & Controls
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 2000);
    this.camera.position.set(160, 220, 260);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't clip below ground
    this.controls.minDistance = 20;
    this.controls.maxDistance = 650;
    this.controls.target.set(0, 0, 0);

    // 3. Sub-systems
    this.setupLighting();
    this.campusBuilder = new CampusBuilder(this.scene);
    this.routeRenderer = new RouteRenderer(this.scene, this.campusBuilder);
    this.courierRobot = new CourierRobot(this.scene, this.campusBuilder);

    // 4. Raycasting & Selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredBuilding = null;
    this.onNodeClick = null;
    this.onNodeHover = null;

    // 5. Camera Animation State
    this.targetCamPos = null;
    this.targetLookAt = null;

    // Listeners
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    // Animation Loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // Initial cinematic fly-in
    this.cinematicFlyIn();
  }

  setupLighting() {
    // Ambient Sky Light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.6);
    hemiLight.position.set(0, 100, 0);
    this.scene.add(hemiLight);

    // Directional Sunlight with Shadows
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(120, 200, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 600;
    const d = 220;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Secondary fill light
    const fillLight = new THREE.DirectionalLight(0x06b6d4, 0.4);
    fillLight.position.set(-150, 80, -120);
    this.scene.add(fillLight);
  }

  loadGraph(graphData) {
    this.campusBuilder.buildCampus(graphData);
    this.routeRenderer.clear();
    this.courierRobot.reset();
  }

  renderRoutes(options) {
    this.routeRenderer.renderRoutes(options);
  }

  setCourierRoute(nodeIds) {
    this.courierRobot.setRoute(nodeIds);
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.campusBuilder.buildingGroup.children, true);

    if (intersects.length > 0) {
      let bldg = intersects[0].object;
      while (bldg && !bldg.userData?.nodeData && bldg.parent) {
        bldg = bldg.parent;
      }
      if (bldg && bldg.userData?.nodeData) {
        if (this.hoveredBuilding !== bldg) {
          this.hoveredBuilding = bldg;
          this.renderer.domElement.style.cursor = 'pointer';
          if (this.onNodeHover) {
            this.onNodeHover(bldg.userData.nodeData, event);
          }
        }
        return;
      }
    }

    if (this.hoveredBuilding) {
      this.hoveredBuilding = null;
      this.renderer.domElement.style.cursor = 'default';
      if (this.onNodeHover) this.onNodeHover(null, event);
    }
  }

  onClick(event) {
    if (!this.hoveredBuilding) return;
    const node = this.hoveredBuilding.userData?.nodeData;
    if (node && this.onNodeClick) {
      this.onNodeClick(node);
      this.focusOnNode(node.id);
    }
  }

  focusOnNode(nodeId) {
    const wp = this.campusBuilder.getNodeWorldPos(nodeId);
    if (!wp) return;
    this.targetLookAt = wp.clone();
    this.targetCamPos = wp.clone().add(new THREE.Vector3(50, 65, 80));
  }

  focusOnDistrict(districtName) {
    let count = 0;
    const center = new THREE.Vector3(0, 0, 0);
    this.campusBuilder.nodeMap.forEach((entry) => {
      if (entry.node?.district === districtName) {
        center.add(entry.worldPos);
        count++;
      }
    });
    if (count === 0) return;
    center.divideScalar(count);
    this.targetLookAt = center.clone();
    this.targetCamPos = center.clone().add(new THREE.Vector3(80, 110, 120));
  }

  setCameraPreset(type) {
    switch (type) {
      case 'isometric':
        this.targetCamPos = new THREE.Vector3(160, 220, 260);
        this.targetLookAt = new THREE.Vector3(0, 0, 0);
        break;
      case 'topdown':
        this.targetCamPos = new THREE.Vector3(0, 360, 0.1);
        this.targetLookAt = new THREE.Vector3(0, 0, 0);
        break;
      case 'front':
        this.targetCamPos = new THREE.Vector3(0, 80, 260);
        this.targetLookAt = new THREE.Vector3(0, 0, 0);
        break;
      case 'reset':
        this.cinematicFlyIn();
        break;
    }
  }

  cinematicFlyIn() {
    this.camera.position.set(300, 420, 400);
    this.controls.target.set(0, 0, 0);
    this.targetCamPos = new THREE.Vector3(160, 220, 260);
    this.targetLookAt = new THREE.Vector3(0, 0, 0);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    // Smooth Camera Interpolation
    if (this.targetCamPos) {
      this.camera.position.lerp(this.targetCamPos, 0.05);
      if (this.camera.position.distanceTo(this.targetCamPos) < 0.5) {
        this.targetCamPos = null;
      }
    }
    if (this.targetLookAt) {
      this.controls.target.lerp(this.targetLookAt, 0.05);
      if (this.controls.target.distanceTo(this.targetLookAt) < 0.2) {
        this.targetLookAt = null;
      }
    }

    this.controls.update();
    this.courierRobot.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}
