/**
 * Intelligent Delivery Route Planner — 3D Campus Navigation
 * Main Application Bootstrap
 */
import { SceneManager } from './three/sceneManager.js';
import { PlannerController } from './ui/plannerController.js';
import { ComparisonViewController } from './ui/comparisonView.js';
import { TraceController } from './ui/traceController.js';
import { BenchmarkController } from './ui/benchmarkController.js';
import { NavManager } from './ui/navManager.js';
import { auth } from './auth/authManager.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize 3D WebGL Canvas
  const canvasContainer = document.getElementById('three-canvas-container');
  const sceneManager = new SceneManager(canvasContainer);

  // 2. Initialize UI Controllers
  const plannerController = new PlannerController(sceneManager);
  const comparisonView = new ComparisonViewController(plannerController);
  const traceController = new TraceController(plannerController, sceneManager);
  const benchmarkController = new BenchmarkController();
  const navManager = new NavManager(sceneManager, comparisonView, traceController, benchmarkController);

  // 3. Building Inspection Tooltip on Hover
  const inspectCard = document.getElementById('buildingInspectionCard');
  const inspectName = document.getElementById('inspectName');
  const inspectType = document.getElementById('inspectType');
  const inspectDesc = document.getElementById('inspectDesc');
  const inspectCoords = document.getElementById('inspectCoords');
  const inspectHeuristic = document.getElementById('inspectHeuristic');

  sceneManager.onNodeHover = (nodeData) => {
    if (!nodeData) {
      if (inspectCard) inspectCard.style.display = 'none';
      return;
    }

    if (inspectCard) {
      inspectCard.style.display = 'block';
      inspectName.innerText = nodeData.name || nodeData.id;
      inspectType.innerText = (nodeData.type || 'NODE').toUpperCase();
      inspectDesc.innerText = nodeData.description || 'Campus building / junction';
      inspectCoords.innerText = `(${nodeData.coordinates.x}, ${nodeData.coordinates.y})`;

      // Calculate straight-line Euclidean heuristic to current goal
      const goalId = plannerController.goalSelect?.value;
      if (goalId && plannerController.currentGraph?.nodes) {
        const goalNode = plannerController.currentGraph.nodes.find((n) => n.id === goalId);
        if (goalNode) {
          const dx = nodeData.coordinates.x - goalNode.coordinates.x;
          const dy = nodeData.coordinates.y - goalNode.coordinates.y;
          const h = Math.sqrt(dx * dx + dy * dy);
          inspectHeuristic.innerText = `${h.toFixed(1)} m`;
        } else {
          inspectHeuristic.innerText = '-- m';
        }
      } else {
        inspectHeuristic.innerText = '-- m';
      }
    }
  };

  // Node Click in 3D: Select as destination and inspect
  const origClick = sceneManager.onNodeClick;
  sceneManager.onNodeClick = (nodeData) => {
    if (origClick) origClick(nodeData);
    if (plannerController.goalSelect) {
      plannerController.goalSelect.value = nodeData.id;
    }
  };

  // 4. Authentication Modal Tab Switching
  const tabLogin = document.getElementById('tabAuthLogin');
  const tabRegister = document.getElementById('tabAuthRegister');
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');
  const authModalTitle = document.getElementById('authModalTitle');
  const authAlert = document.getElementById('authAlert');

  const showAuthAlert = (msg, isError = true) => {
    if (!authAlert) return;
    authAlert.style.display = 'block';
    authAlert.style.background = isError ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)';
    authAlert.style.borderColor = isError ? '#ef4444' : '#22c55e';
    authAlert.style.color = isError ? '#fca5a5' : '#86efac';
    authAlert.innerText = msg;
  };

  const hideAuthAlert = () => {
    if (authAlert) authAlert.style.display = 'none';
  };

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'flex';
      formRegister.style.display = 'none';
      authModalTitle.innerText = 'Sign In to Campus Platform';
      hideAuthAlert();
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.style.display = 'flex';
      formLogin.style.display = 'none';
      authModalTitle.innerText = 'Create New Account';
      hideAuthAlert();
    });
  }

  // 5. Login Form Submission
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthAlert();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const rememberMe = document.getElementById('loginRememberMe')?.checked || false;

      try {
        await auth.login(email, password, rememberMe);
        document.getElementById('modalAuth')?.classList.remove('active');
        formLogin.reset();
      } catch (err) {
        showAuthAlert(err.message || 'Login failed. Please verify credentials.');
      }
    });
  }

  // 6. Registration Form Submission
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthAlert();
      const fullName = document.getElementById('regFullName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;

      try {
        await auth.register(fullName, email, password);
        document.getElementById('modalAuth')?.classList.remove('active');
        formRegister.reset();
      } catch (err) {
        showAuthAlert(err.message || 'Registration failed.');
      }
    });
  }

  // 7. Logout Button
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await auth.logout();
      document.getElementById('modalProfile')?.classList.remove('active');
    });
  }

  // 8. Forgot Password Link
  const linkForgot = document.getElementById('linkForgotPassword');
  if (linkForgot) {
    linkForgot.addEventListener('click', () => {
      showAuthAlert('Contact Campus Admin (admin@campus.edu) or run initial seed scripts to reset.', false);
    });
  }

  // 9. Initialize Session and Default Map
  await auth.initSession();
  await plannerController.loadMap('campus_map');

  console.log('Intelligent Delivery Route Planner 3D initialized successfully.');
});
