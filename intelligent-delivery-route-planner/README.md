# Intelligent Delivery Route Planner
### AI-Based Campus Navigation Using Greedy Best-First Search and A*

An academic and production-grade Artificial Intelligence application demonstrating classical informed state-space search algorithms (Greedy Best-First Search vs. A* Search) for autonomous campus logistics and delivery routing.

---

## 1. Project Introduction

Campus delivery personnel frequently need to dispatch essential documents, examination materials, books, and laboratory supplies from a central dispatch hub to diverse campus facilities. Finding the shortest walking route is critical to minimizing fatigue, reducing transit delay, and maintaining delivery schedules.

This project implements and experimentally analyzes two seminal informed graph search algorithms:
1. **Greedy Best-First Search (GBFS)**: Prioritizes movement purely based on straight-line estimated proximity to the goal ($f(n) = h(n)$).
2. **A* Search**: Combines the actual distance traversed with the estimated remaining distance ($f(n) = g(n) + h(n)$).

The system includes an interactive **Streamlit web application**, **Plotly map visualizer**, **search trace inspector**, and an **automated benchmarking suite** demonstrating that choosing the node that appears closest to the goal does not always produce the least-cost route.

---

## 2. Project Objectives

- **Classical AI Implementation:** Manually implement GBFS and A* using Python's native `heapq` module without relying on black-box graph search libraries (e.g., NetworkX).
- **Formal State-Space Representation:** Formulate campus dispatch as an undirected, weighted graph with realistic walking distances in metres.
- **Euclidean Heuristic Admissibility:** Implement a mathematically admissible and consistent Euclidean distance heuristic.
- **Empirical Demonstration of Greedy Failure:** Construct and analyze a test topology where GBFS incurs a +1920% excess path cost compared to A*.
- **Interactive Visual Analytics:** Provide a modern web interface to visualize routes, inspect step-by-step priority queue states, and export benchmark reports to CSV.

---

## 3. Problem Formulation & State-Space Representation

The delivery planning problem is formalized as a 6-tuple $\langle S, s_0, S_G, A, T, c \rangle$:

- **Initial State ($s_0$):** `Central Office` (Dispatch headquarters).
- **Goal State ($S_G$):** Selected delivery destination (e.g., `Department Office`, `Examination Section`, `Library`, `Accounts Section`, `Seminar Hall`).
- **State Space ($S$):** All discrete campus buildings, offices, and pathway junctions.
- **Actions ($A(s)$):** Walk from current node $s$ to any adjacent node $v \in Adj(s)$.
- **Transition Model ($T(s, a)$):** Deterministic arrival at the connected destination node.
- **Step Cost ($c(u, v)$):** Measured walking distance in metres along the pathway.
- **Path Cost ($g(p)$):** Cumulative sum of edge weights: $g(p) = \sum_{(u, v) \in p} c(u, v)$.

---

## 4. Heuristic Function & Admissibility Guarantee

The straight-line Euclidean distance heuristic is calculated as:
$$h(n) = \sqrt{(x_n - x_{\text{goal}})^2 + (y_n - y_{\text{goal}})^2}$$

### Why the Heuristic is Admissible
1. In 2D Euclidean space, the shortest path between any two points is the straight line.
2. In our campus dataset, every edge weight $w(u, v)$ satisfies $w(u, v) \ge \text{Euclidean}(u, v)$.
3. By the triangle inequality, straight-line distance to the destination is always less than or equal to the true walking distance along any graph path:
   $$h(n) \le h^*(n) \quad \forall n \in S$$
Therefore, $h(n)$ is strictly **admissible** and **consistent (monotonic)**.

---

## 5. System Architecture & Project Structure

```
intelligent-delivery-route-planner/
│
├── app.py                      # Main Streamlit web application
├── requirements.txt            # Project dependencies
├── pytest.ini                  # Pytest configuration
├── README.md                   # Complete master documentation
│
├── algorithms/                 # Pure manual classical search implementations
│   ├── __init__.py
│   ├── greedy.py               # Greedy Best-First Search (f = h)
│   ├── astar.py                # A* Search (f = g + h)
│   └── dijkstra.py             # Dijkstra baseline for optimality validation
│
├── core/                       # Core graph and heuristic data models
│   ├── __init__.py
│   ├── graph.py                # CampusGraph adjacency list representation
│   ├── heuristic.py            # Euclidean heuristic calculator & proofs
│   └── metrics.py              # SearchResult and SearchTraceStep dataclasses
│
├── data/                       # Editable JSON campus map files
│   ├── campus_map.json         # Realistic 15-node demonstration campus layout
│   ├── alternative_paths_map.json # Layout with scenic detours and bypasses
│   └── misleading_map.json     # Section 8 trap map demonstrating GBFS failure
│
├── experiments/                # Automated benchmarking suite
│   ├── __init__.py
│   └── run_experiments.py      # Automated benchmark across all maps & destinations
│
├── visualization/              # Interactive Plotly visualization
│   ├── __init__.py
│   └── campus_visualizer.py    # Map overlays, styling, and comparative charts
│
├── utils/                      # Helper utilities
│   ├── __init__.py
│   └── export.py               # CSV export and data serialization
│
├── tests/                      # Automated unit test suite (pytest)
│   ├── conftest.py
│   ├── test_greedy.py
│   ├── test_astar.py
│   ├── test_heuristic.py
│   └── test_experiments.py
│
└── docs/                       # Comprehensive documentation chapters
    ├── state_space.md
    ├── algorithms.md
    ├── complexity_analysis.md
    └── experimental_analysis.md
```

---

## 6. Installation & Execution Instructions

### Prerequisites
- Python 3.11+
- Virtual environment recommended

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Run Automated Tests
```bash
pytest -v
```

### Step 3: Run Benchmark Experiments Script
```bash
python experiments/run_experiments.py
```

### Step 4: Run the Application (Dual-Frontend Support)

You can launch either (or both) frontends:

#### Option A: Interactive SPA Frontend + REST Backend API (FastAPI)
```bash
python api.py
```
- Web Application: **`http://localhost:8000`**
- Interactive Swagger API Documentation: **`http://localhost:8000/docs`**

#### Option B: Streamlit Dashboard + Plotly Visualizer
```bash
streamlit run app.py
```
- Streamlit Web App: **`http://localhost:8501`**

---

## 7. Sample Outputs & Experimental Findings

### Benchmark Results Summary

| Test Map | Goal Destination | GBFS Route | GBFS Cost | A* Route | A* Cost | Optimality |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal Campus Map** | Accounts Section | `central_office -> admin_circle -> accounts_section` | 210.0 m | `central_office -> admin_circle -> accounts_section` | 210.0 m | Optimal |
| **Normal Campus Map** | Library | `central_office -> central_plaza -> north_junction -> library` | 445.0 m | `central_office -> admin_circle -> north_junction -> library` | 415.0 m | **Suboptimal (+7.2%)** |
| **Normal Campus Map** | Seminar Hall | `central_office -> admin_circle -> auditorium_hub -> seminar_hall` | 355.0 m | `central_office -> admin_circle -> auditorium_hub -> seminar_hall` | 355.0 m | Optimal |
| **Alternative Paths Map** | Library | `central_office -> scenic_waypoint -> dept_office -> tech_plaza -> library` | 835.0 m | `central_office -> north_walkway -> quad_gateway -> library` | 495.0 m | **Suboptimal (+68.7%)** |
| **Misleading Heuristic Map**| Delivery Goal G | `S -> A -> G` | 101.0 m | `S -> B -> G` | 5.0 m | **Suboptimal (+1920%)** |

### Key Experimental Insights
1. **The Greedy Trap:** In `misleading_map.json`, GBFS takes route `S -> A -> G` (cost 101m) because $h(A) = 1.0 < h(B) = 2.83$. A* evaluates total cost $f(n) = g(n) + h(n)$, recognizing that edge $(A, G)$ costs 100m, and discovers the optimal route `S -> B -> G` (cost 5m).
2. **Optimality Baseline:** In every benchmark test case, A* achieved the exact same route cost as Dijkstra's algorithm.

---

## 8. Computational Complexity Analysis

| Algorithm | Evaluation Function | General Time | Finite Graph Time | Space Complexity | Optimality |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Greedy Best-First** | $f(n) = h(n)$ | $O(b^m)$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(b^m)$ / $O(\|V\|)$ | No |
| **A\* Search** | $f(n) = g(n) + h(n)$ | $O(b^d)$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(b^d)$ / $O(\|V\|)$ | **Yes** |
| **Dijkstra** | $f(n) = g(n)$ | $O(b^{C^*/\epsilon})$ | $O(\|V\| \log \|V\| + \|E\|)$ | $O(\|V\|)$ | **Yes** |

---

## 9. Customization: How to Use Your Own College Map

To adapt this project for your own college campus:
1. Open `data/campus_map.json`.
2. Edit or append nodes with your college's buildings and coordinates $(x, y)$ in metres:
   ```json
   {
     "id": "computer_lab",
     "name": "Advanced Computing Lab",
     "x": 300.0,
     "y": 450.0,
     "type": "destination",
     "description": "Department of Artificial Intelligence & Data Science"
   }
   ```
3. Edit or append walking pathways in the `edges` list:
   ```json
   {
     "source": "central_office",
     "target": "computer_lab",
     "distance": 140.0,
     "bidirectional": true,
     "path_type": "covered_walkway"
   }
   ```
4. **Important:** Ensure the assigned distance is greater than or equal to the straight-line Euclidean distance $\sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2}$ to preserve heuristic admissibility!

---

## 10. Limitations & Future Enhancements

### Limitations
- **2D Static Topology:** Models walkways on a 2D plane; does not model multi-story elevation changes (stairs, elevators).
- **Static Edge Costs:** Assumes constant walking resistance; does not dynamically factor in weather or pedestrian congestion.

### Future Enhancements
- **Dynamic Obstacle Routing:** Integrate dynamic edge cost updates for temporary campus walkway closures or construction.
- **Multi-Destination TSP Routing:** Extend the route planner to solve multi-stop package deliveries using Genetic Algorithms or Simulated Annealing.
- **3D Campus Modeling:** Incorporate floor levels and elevator transfer costs.
