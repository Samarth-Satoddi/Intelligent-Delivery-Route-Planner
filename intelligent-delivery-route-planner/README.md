# Intelligent Delivery Route Planner
### Premium 3D Campus Navigation & Informed Search Analytics (GBFS vs. A*)

An enterprise-grade, academic Artificial Intelligence application featuring a **photorealistic 3D campus simulation** (Three.js WebGL), **Argon2 + JWT authentication system**, **autonomous courier delivery robot**, and **classical informed state-space search algorithms** (Greedy Best-First Search vs. A* Search).

---

## 1. Project Overview

Campus delivery personnel frequently need to dispatch essential documents, examination materials, books, and laboratory supplies from a central dispatch hub to diverse campus facilities. Finding the shortest walking route is critical to minimizing transit fatigue, reducing delivery delays, and guaranteeing predictable logistics.

This platform implements and experimentally compares two fundamental informed graph search algorithms:
1. **Greedy Best-First Search (GBFS)**: Prioritizes node expansion purely by straight-line Euclidean proximity to the goal ($f(n) = h(n)$).
2. **A\* Search**: Balances cumulative traversed cost with remaining heuristic proximity ($f(n) = g(n) + h(n)$).

The platform proves both theoretically and empirically that selecting the node that appears closest to the goal does not guarantee the least-cost route.

---

## 2. Key Architecture & Features

### 🌐 1. Interactive 3D Campus Simulation (Three.js WebGL)
- **Procedural 3D Architecture:** Custom procedural geometry for campus landmarks—Central Office clocktower, Library rotunda and dome, Department Office solar pavilion, Examination Section vault, Accounts Section, Seminar Hall, and landscaped courtyards with trees and street lamps.
- **Walkable Road Network:** Dynamically generates road ribbons and pedestrian curbs from graph edge coordinates.
- **Dual Glowing 3D Route Tubes:**
  - **Greedy Best-First Search (GBFS):** Glowing International Orange (`#f97316`) route tube.
  - **A\* Search:** Luminous Electric Cyan (`#06b6d4`) route tube.
  - Side-by-side lateral offsets when comparing both algorithms simultaneously.
- **Cinematic Orbit Controls:** Smooth mouse rotation, panning, zoom limits, camera presets (Isometric, Top-Down, Front, Cinematic Fly-in), and click-to-focus on buildings.

### 🤖 2. Autonomous 3D Courier Robot
- Procedural multi-part rover model featuring articulated chassis, rotating all-terrain wheels, headlights, cargo hatch, and an animated lidar scanning dome.
- Smooth path traversal along route segments, angular turning at junctions, and pause-at-checkpoint behavior.
- Interactive playback HUD: **Start / Pause / Reset**, **1x / 2x / 4x Speed Multiplier**, and live distance progress indicators.

### 🔒 3. Enterprise Authentication & Security (Argon2 + JWT)
- **Password Security:** Salted and hashed using `argon2-cffi` (memory-hard Argon2id variant).
- **Dual-Token System:** Stateless in-memory JWT access tokens + stateful, rotating SHA-256 hashed refresh tokens persisted in `HttpOnly`, `SameSite=Lax` cookies.
- **Role-Based Access Control (RBAC):** Distinct roles for standard `USER` accounts and administrative `ADMIN` accounts.
- **Default Administrative Credentials:**
  - **Email:** `admin@campus.edu`
  - **Password:** `Admin@Campus2026!`
- **Audit Logging:** Every calculated route query is logged to SQLite/PostgreSQL with timestamp, algorithm choice, cost, and optimality status.

### 🔍 4. Step-by-Step Search Trace Inspector
- Step-by-step priority queue ledger detailing Step index, Node ID, Building Name, Parent, $g(n)$, $h(n)$, and $f(n)$.
- Forward / Backward interactive stepper that animates the 3D camera and illuminates the actively expanded campus node.
- One-click **Export to CSV** for academic lab submission.

### 🧪 5. Experimental Benchmark Laboratory
- Automated benchmarking suite running 11 delivery scenarios across all three campus map configurations.
- Demonstrates the **Section 8 Misleading Heuristic Trap** where Greedy Best-First Search incurs a **+1920.0% excess cost** ($101.0\text{m}$ vs $5.0\text{m}$).
- Real-time comparison table with excess percentage highlights and CSV report generation.

---

## 3. Mathematical Formulation

The campus delivery planning problem is formalized as a 6-tuple $\langle S, s_0, S_G, A, T, c \rangle$:

- **Initial State ($s_0$):** `Central Office` (Dispatch headquarters).
- **Goal State ($S_G$):** Selected delivery destination (e.g., `Department Office`, `Examination Section`, `Library`, `Accounts Section`, `Seminar Hall`).
- **State Space ($S$):** All discrete campus buildings, offices, and pathway junctions.
- **Actions ($A(s)$):** Walk from current node $s$ to any adjacent node $v \in \text{Adj}(s)$.
- **Transition Model ($T(s, a)$):** Deterministic arrival at the connected destination node.
- **Step Cost ($c(u, v)$):** Measured walking distance in metres along the pathway.
- **Path Cost ($g(p)$):** Cumulative sum of edge weights: $g(p) = \sum_{(u, v) \in p} c(u, v)$.

### Euclidean Heuristic Admissibility
The straight-line Euclidean distance heuristic is calculated as:
$$h(n) = \sqrt{(x_n - x_{\text{goal}})^2 + (y_n - y_{\text{goal}})^2}$$

**Proof of Admissibility & Consistency:**
1. In 2D Euclidean space, the shortest possible geometric path between two coordinates is a straight line.
2. In our campus dataset, every edge weight $w(u, v)$ satisfies $w(u, v) \ge \text{Euclidean}(u, v)$.
3. By the triangle inequality, for all adjacent nodes $u, v$:
   $$h(u) \le c(u, v) + h(v)$$
   $$h(n) \le h^*(n) \quad \forall n \in S$$
Therefore, $h(n)$ is strictly **admissible** and **monotonic (consistent)**, guaranteeing that A* search returns an optimal path.

---

## 4. Section 8: The Misleading Heuristic Experiment

To expose the fundamental flaw of Greedy Best-First Search, a dedicated test topology is implemented in `data/misleading_map.json`:

```
               (1)
        [S] ---------> [A]
         | (0,0)        | (1,0)
         |              |
     (2) |              | (100)
         v              v
        [B] ---------> [G] (Goal)
        (0,2)   (3)     (2,0)
```

- **Coordinates:** $S(0, 0)$, $A(1, 0)$, $B(0, 2)$, $G(2, 0)$
- **Heuristic to Goal $G$:**
  - $h(A) = \sqrt{(1-2)^2 + (0-0)^2} = 1.0\text{ m}$
  - $h(B) = \sqrt{(0-2)^2 + (2-0)^2} = \sqrt{8} \approx 2.83\text{ m}$

### Empirical Outcome
- **Greedy Best-First Search ($f = h$):**
  - Expands $A$ because $h(A) = 1.0 < h(B) = 2.83$.
  - Commits to the expensive edge $(A, G)$ of $100\text{m}$.
  - Path: `S -> A -> G`
  - Total Cost: **$101.0\text{ metres}$**
- **A\* Search ($f = g + h$):**
  - Evaluates $f(A) = 1 + 1.0 = 2.0\text{m}$, moves to $A$, discovers $f(G\text{ via }A) = 101.0\text{m}$.
  - Priority queue pops $B$ ($f(B) = 2 + 2.83 = 4.83\text{m} < 101.0\text{m}$).
  - Finds optimal edge $(B, G)$ with cost $3\text{m}$.
  - Path: `S -> B -> G`
  - Total Cost: **$5.0\text{ metres}$**
- **Excess Cost:** GBFS incurs **$+1920.0\%$ excess cost** over the optimal route.

---

## 5. Project Directory Structure

```
intelligent-delivery-route-planner/
│
├── api.py                          # Unified FastAPI Backend Server
├── app.py                          # Streamlit Dashboard (Classic Interface)
├── requirements.txt                # Python dependencies
├── pytest.ini                      # Pytest suite configuration
├── README.md                       # Master Documentation
│
├── algorithms/                     # Classical AI Search Algorithms (Pure Python)
│   ├── __init__.py
│   ├── greedy.py                   # Greedy Best-First Search (f = h)
│   ├── astar.py                    # A* Search (f = g + h, admissibility guarantees)
│   └── dijkstra.py                 # Dijkstra Algorithm for baseline ground-truth
│
├── auth/                           # Enterprise Authentication & Security
│   ├── __init__.py
│   ├── security.py                 # Argon2 hashing & JWT token encoder/decoder
│   ├── schemas.py                  # Pydantic v2 validation schemas
│   ├── dependencies.py             # FastAPI auth & RBAC route guards
│   └── routes.py                   # Auth endpoints (login, register, refresh, me)
│
├── database/                       # Database Persistence Layer
│   ├── __init__.py
│   ├── connection.py               # SQLAlchemy engine (SQLite / PostgreSQL)
│   ├── models.py                   # User, RefreshToken, and RouteHistory ORM
│   └── init_db.py                  # Database initialization & Admin seeder
│
├── core/                           # Graph & Heuristic Engine
│   ├── __init__.py
│   ├── graph.py                    # CampusGraph adjacency list representation
│   ├── heuristic.py                # Euclidean distance heuristic calculator
│   └── metrics.py                  # SearchResult & SearchTraceStep dataclasses
│
├── data/                           # Campus Map Datasets (JSON)
│   ├── campus_map.json             # 15-node primary campus layout
│   ├── alternative_paths_map.json  # Multi-path layout with bypasses
│   └── misleading_map.json         # Section 8 trap topology
│
├── experiments/                    # Automated Benchmarking Suite
│   ├── __init__.py
│   └── run_experiments.py          # Multi-destination benchmark execution
│
├── frontend/                       # Modern 3D WebGL Frontend (Three.js + Vite)
│   ├── package.json                # Three.js (^0.170.0) & Vite (^6.0.0)
│   ├── vite.config.js              # Build config & API proxying
│   ├── index.html                  # Glassmorphic UI & Canvas Shell
│   ├── dist/                       # Compiled static bundle (served by FastAPI)
│   └── src/
│       ├── main.js                 # App bootstrapper
│       ├── api/client.js           # REST API client
│       ├── auth/authManager.js     # Client session & token manager
│       ├── styles/main.css         # Midnight navy / Electric cyan theme
│       ├── three/
│       │   ├── buildingFactory.js  # Procedural 3D buildings & labels
│       │   ├── campusBuilder.js    # 3D coordinate converter & road builder
│       │   ├── routeRenderer.js    # Glowing 3D tube paths (Orange/Cyan)
│       │   ├── courierRobot.js     # 3D Delivery Rover simulation
│       │   └── sceneManager.js     # Three.js renderer, lighting, orbit controls
│       └── ui/
│           ├── plannerController.js   # Route planner dock & dispatch actions
│           ├── comparisonView.js      # Side-by-side analytical scorecard
│           ├── traceController.js     # Priority queue stepper & CSV export
│           ├── benchmarkController.js # Benchmark matrix & CSV export
│           └── navManager.js          # View switcher & modal manager
│
└── tests/                          # Automated Pytest Suite (26/26 Passing)
    ├── conftest.py
    ├── test_greedy.py
    ├── test_astar.py
    ├── test_heuristic.py
    ├── test_experiments.py
    └── test_auth.py
```

---

## 6. Installation & Execution Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ (only if modifying frontend source; production bundle is pre-built in `frontend/dist`)

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Run Automated Pytest Suite
```bash
pytest -v
```
*Expected: 26 passed tests verifying algorithms, heuristics, misleading trap, and auth.*

### Step 3: Run the Application

#### 🚀 Primary Option: 3D Campus Navigation Platform (FastAPI + Three.js)
```bash
python api.py
```
- **3D Web Application:** **`http://localhost:8000`**
- **Interactive Swagger API Docs:** **`http://localhost:8000/docs`**

#### 📊 Alternative Option: Streamlit Dashboard + Plotly Visualizer
```bash
streamlit run app.py
```
- **Streamlit Web Application:** **`http://localhost:8501`**

---

## 7. User Authentication & Default Roles

The system is seeded with an administrative account for evaluation:

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@campus.edu` | `Admin@Campus2026!` | Full access, user directory, map editing |
| **User** | Self-register via UI | Custom (8+ chars) | Route planning, 3D simulation, history |

---

## 8. Experimental Results Summary

| Test Map | Goal Destination | GBFS Route | GBFS Cost | A\* Route | A\* Cost | Optimality |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal Campus** | Accounts Section | `central_office -> admin_circle -> accounts_section` | 210.0 m | `central_office -> admin_circle -> accounts_section` | 210.0 m | Optimal |
| **Normal Campus** | Library | `central_office -> central_plaza -> north_junction -> library` | 445.0 m | `central_office -> admin_circle -> north_junction -> library` | 415.0 m | **Suboptimal (+7.2%)** |
| **Normal Campus** | Seminar Hall | `central_office -> admin_circle -> auditorium_hub -> seminar_hall` | 355.0 m | `central_office -> admin_circle -> auditorium_hub -> seminar_hall` | 355.0 m | Optimal |
| **Alternative Paths** | Library | `central_office -> scenic_waypoint -> dept_office -> tech_plaza -> library` | 835.0 m | `central_office -> north_walkway -> quad_gateway -> library` | 495.0 m | **Suboptimal (+68.7%)** |
| **Misleading Trap** | Delivery Goal G | `S -> A -> G` | 101.0 m | `S -> B -> G` | 5.0 m | **Suboptimal (+1920%)** |

---

## 9. Computational Complexity

| Algorithm | Evaluation Function | General Time | Finite Graph Time | Space Complexity | Optimality |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Greedy Best-First** | $f(n) = h(n)$ | $O(b^m)$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(b^m)$ / $O(\|V\|)$ | No |
| **A\* Search** | $f(n) = g(n) + h(n)$ | $O(b^d)$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(b^d)$ / $O(\|V\|)$ | **Yes** |
| **Dijkstra** | $f(n) = g(n)$ | $O(b^{C^*/\epsilon})$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(\|V\|)$ | **Yes** |
