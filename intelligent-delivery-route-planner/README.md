# Intelligent Delivery Route Planner
### City-Scale 3D Smart Campus Navigation & Informed Search Analytics (GBFS vs. A*)

An enterprise-grade, academic Artificial Intelligence application featuring a **photorealistic 3D smart campus city simulation** (Three.js WebGL), **Argon2 + JWT authentication system**, **autonomous courier delivery robot**, **Yen's K-Shortest Loopless Paths algorithm**, and **classical informed state-space search algorithms** (Greedy Best-First Search vs. A* Search).

---

## 1. Project Overview

Campus logistics personnel and autonomous rovers must navigate vast university cities to dispatch essential laboratory specimens, IT equipment, examination documents, books, and supplies from central offices to academic blocks, libraries, hostels, athletic complexes, and transit terminals. Finding the least-cost walking path is critical to avoiding transit delays and minimizing route traversal cost.

This platform implements, visualizes, and experimentally benchmarks:
1. **Greedy Best-First Search (GBFS)**: Prioritizes node expansion purely by straight-line Euclidean proximity to the goal ($f(n) = h(n)$).
2. **A\* Search**: Balances cumulative traversed cost with remaining heuristic proximity ($f(n) = g(n) + h(n)$).
3. **Dijkstra Algorithm**: Independent ground-truth baseline verifying A* mathematical optimality.
4. **Yen's K-Shortest Paths Algorithm**: Discovers up to 3 distinct feasible loopless alternative routes for path diversity and urban contingency routing.

The platform proves both theoretically and empirically across 32 city-scale scenarios that selecting the node that appears locally closest to the goal does not guarantee the least-cost route.

---

## 2. City-Scale Architecture & Topology

### 🏙️ 1. 51 Named Buildings Across 6 Districts
The smart campus city map (`data/smart_city_map.json`) features **51 uniquely identified and named locations** across 6 distinct functional zones:

1. **Administration District (8 Locations):**
   - Central Office (Logistics & Dispatch Hub), Main Administration (Secretariat), Examination Section (Vaults), Accounts Office, Registrar Office, Admissions Centre, Records Department, Security Headquarters.
2. **Academic District (12 Locations):**
   - Computer Science Block, AI and Data Science Block, Electronics Block, Mechanical Block, Civil Engineering Block, Electrical Block, Research Centre, Innovation Centre, Computer Lab, Robotics Lab, Science Laboratory, Faculty Block.
3. **Knowledge and Culture District (7 Locations):**
   - Central Library (Rotunda & Sky-Dome), Digital Library, Reading Hall, Auditorium (2500-Seat Hall), Seminar Hall, Conference Centre, Exhibition Centre.
4. **Student Life District (9 Locations):**
   - Main Cafeteria, Food Court, Student Centre, Boys Hostel, Girls Hostel, Medical Centre (24/7 Clinic), Gymnasium, Shopping Centre, Student Activity Centre.
5. **Sports District (7 Locations):**
   - Main Stadium (Olympic Arena), Football Ground, Cricket Ground, Basketball Court, Badminton Court, Swimming Pool, Sports Complex.
6. **Transport and Infrastructure District (8 Locations):**
   - Main Entrance Gate (West Gantry), North Gate, South Gate, Bus Terminal, Visitor Parking, Student Parking, Maintenance Centre, Power Station.

### 🛣️ 2. 28 Strategic Junctions & 141 Interconnected Road Connections
- **Road Types & Hierarchies:** Grand Campus Boulevards (wide with dividers), Academic Avenues (pedestrian curbs), Local Streets, River Crossing Bridges, and Roundabouts.
- **Path Diversity:** Guaranteed at least 3 distinct feasible loopless paths between Central Office and every major building.
- **Topological Integrity:** 100% connected graph (1 single connected component, 0 isolated nodes).
- **Heuristic Admissibility:** Every road distance satisfies $w(u, v) \ge \text{Euclidean}(u, v)$.

---

## 3. Key Architecture & Features

### 🌐 1. Interactive 3D City Simulation (Three.js WebGL)
- **District-Themed Procedural 3D Architecture:** Custom geometries for all 6 districts—glass towers with illuminated spires for Admin, modular solar wings for Academic, classical rotundas and fluted colonnades for Culture, warm brick and dining pavilions for Student Life, open stadiums and translucent water pools for Sports, and gate portals and transit canopies for Infrastructure.
- **Optimized Instancing:** Over 200 trees and 120 street lamps rendered using `THREE.InstancedMesh` in just 2 draw calls for 60 FPS performance on standard laptops.
- **Dual Glowing 3D Route Tubes:**
  - **GBFS:** Glowing International Orange (`#f97316`) route tube.
  - **A\*:** Luminous Electric Cyan (`#06b6d4`) route tube.
  - **Yen's Alternatives:** Distinct purple, gold, and emerald routes with active selection emphasis.
- **Cinematic Orbit Controls & District Quick Jumps:** Zoom, pan, orbit, camera presets (Isometric, Top-Down, Front, Cinematic Fly-in), and one-click camera fly-to buttons for all 6 districts.

### 🤖 2. Autonomous 3D Delivery Courier Robot
- Multi-mesh procedural delivery rover with articulated chassis, rotating wheels, twin LED headlights, cargo hatch, and an animated lidar scanning dome.
- Smooth road traversal, realistic angular turning at junctions, pause-at-checkpoint behavior, play/pause/reset controls, 1x/2x/4x speed toggle, and live progress indicators.

### 🔒 3. Enterprise Authentication & Security (Argon2 + JWT)
- **Password Security:** Memory-hard Argon2id hashing via `argon2-cffi`.
- **Dual-Token System:** Stateless in-memory JWT access tokens + stateful, rotating SHA-256 hashed refresh tokens persisted in `HttpOnly`, `SameSite=Lax` cookies.
- **Role-Based Access Control (RBAC):** `ADMIN` and `USER` roles.
- **Default Administrative Credentials:**
  - **Email:** `admin@campus.edu`
  - **Password:** `Admin@Campus2026!`
- **Audit Logging:** Every calculated route query is logged to SQLite/PostgreSQL with user attribution and optimality status.

### 🔀 4. Multiple Alternative Routes (Yen's K-Shortest Paths)
- Calculates up to 3 distinct loopless alternative routes using Yen's algorithm.
- Displays interactive cards showing Distance (m), Estimated Walking Time (mins at 1.4 m/s), Legs/Junctions count, and Districts Crossed.
- Selecting any route card highlights it in 3D and assigns it to the autonomous courier robot.

### 🧪 5. City-Scale Benchmark Laboratory (32 Experiments)
- Automated benchmarking suite running **32 systematically chosen origin-destination pairs** spanning all 6 districts and long-distance cross-city trips (> 1000m).
- Empirically measures execution time, expanded nodes, generated nodes, excess cost percentage, and verifies A* optimality against Dijkstra ground truth with 0.00m error.
- Full CSV export capability.

---

## 4. Graph Statistics Report

Automated validation via `core/graph_validator.py` confirms:

| Metric | Measured Value | Requirement | Status |
| :--- | :--- | :--- | :--- |
| **Total Named Locations** | **51** | At least 50 | ✅ PASS |
| **Total Road Junctions** | **28** | At least 20 | ✅ PASS |
| **Total Road Connections** | **141** | 120–160 | ✅ PASS |
| **Districts Represented** | **6** | Exactly 6 | ✅ PASS |
| **Connected Components** | **1** | Exactly 1 (Connected) | ✅ PASS |
| **Min / Max Edge Length** | **21.0 m / 365.0 m** | Physical Scale | ✅ PASS |
| **Average Node Degree** | **3.57** | Dense Interconnection | ✅ PASS |
| **Path Diversity (3+ Paths)** | **10 / 10 Checked** | 100% Major Destinations | ✅ PASS |
| **Heuristic Admissibility** | **100% Strict** | $w \ge \text{Euclidean}$ | ✅ PASS |

---

## 5. Mathematical Formulation & Complexity

The delivery planning problem is formalized as a 6-tuple $\langle S, s_0, S_G, A, T, c \rangle$:
- **States ($S$):** All 79 campus locations and road intersections.
- **Actions ($A(s)$):** Walk from current node $s$ to any adjacent node $v \in \text{Adj}(s)$.
- **Transition Model ($T(s, a)$):** Deterministic arrival at connected destination node.
- **Step Cost ($c(u, v)$):** Measured walking distance in metres.
- **Heuristic Function:** Straight-line Euclidean distance $h(n) = \sqrt{(x_n - x_{\text{goal}})^2 + (y_n - y_{\text{goal}})^2}$.

### Complexity Comparison
| Algorithm | Evaluation Function | Time Complexity | Space Complexity | Optimality Guarantee |
| :--- | :--- | :--- | :--- | :--- |
| **Greedy Best-First** | $f(n) = h(n)$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(\|V\|)$ | No (Greedy traps) |
| **A\* Search** | $f(n) = g(n) + h(n)$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(\|V\|)$ | **Yes (Admissible & Consistent)** |
| **Dijkstra** | $f(n) = g(n)$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(\|V\|)$ | **Yes (Ground-Truth Reference)** |
| **Yen's K-Shortest** | Spur path search | $O(K \cdot \|V\| (\|E\| + \|V\| \log \|V\|))$ | $O(K \cdot \|V\|)$ | **Yes (Loopless alternatives)** |

---

## 6. Installation & Execution Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ (only if modifying frontend source; production bundle is pre-built in `frontend/dist`)

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Run Automated Pytest Suite (30/30 Passing)
```bash
pytest -v
```

### Step 3: Run the Application

#### 🚀 Primary Option: 3D Smart Campus City (FastAPI + Three.js)
```bash
python api.py
```
- **3D Web Application:** **`http://localhost:8000`**
- **Interactive Swagger API Documentation:** **`http://localhost:8000/docs`**

#### 📊 Alternative Option: Streamlit Dashboard + Plotly Visualizer
```bash
streamlit run app.py
```
- **Streamlit Web Application:** **`http://localhost:8501`**

---

## 7. Automated Test Suite (30/30 Tests Passing)

```
tests/test_astar.py            (6 tests: optimality against Dijkstra, repeated state isolation, f=g+h)
tests/test_greedy.py           (5 tests: f=h evaluation, priority queue state, unreachable handling)
tests/test_heuristic.py        (5 tests: Euclidean distance, strict admissibility, triangle inequality)
tests/test_experiments.py      (2 tests: DataFrame schema, Section 8 trap outcomes)
tests/test_auth.py             (8 tests: Argon2 hashing, JWT rotation, revocation, Admin RBAC)
tests/test_city_scale.py       (4 tests: 51 locations, 28 junctions, Yen's KSP, 32 city experiments)
```
