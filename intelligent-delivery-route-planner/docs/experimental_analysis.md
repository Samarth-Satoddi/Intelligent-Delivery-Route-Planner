# Experimental Analysis and Empirical Findings

This report presents empirical findings from systematic experiments conducted on the Intelligent Delivery Route Planner across three distinct campus map topologies.

---

## 1. Experimental Benchmark Table

All data recorded from actual algorithm execution:

| Test Map | Starting Node | Goal Node | GBFS Route | GBFS Cost (m) | A* Route | A* Cost (m) | Dijkstra Cost (m) | GBFS Expansions | A* Expansions | Excess Cost (%) | Optimality Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal Campus Map** | Central Office | Accounts Section | `central_office -> admin_circle -> accounts_section` | 210.0 | `central_office -> admin_circle -> accounts_section` | 210.0 | 210.0 | 3 | 3 | 0.00% | Optimal |
| **Normal Campus Map** | Central Office | Library | `central_office -> central_plaza -> north_junction -> library` | 445.0 | `central_office -> admin_circle -> north_junction -> library` | 415.0 | 415.0 | 4 | 5 | **+7.23%** | **Suboptimal** |
| **Normal Campus Map** | Central Office | Seminar Hall | `central_office -> admin_circle -> auditorium_hub -> seminar_hall` | 355.0 | `central_office -> admin_circle -> auditorium_hub -> seminar_hall` | 355.0 | 355.0 | 4 | 4 | 0.00% | Optimal |
| **Normal Campus Map** | Central Office | Department Office | `central_office -> central_plaza -> science_arcade -> department_office` | 445.0 | `central_office -> central_plaza -> science_arcade -> department_office` | 445.0 | 445.0 | 4 | 4 | 0.00% | Optimal |
| **Normal Campus Map** | Central Office | Examination Section | `central_office -> south_roundabout -> examination_section` | 325.0 | `central_office -> south_roundabout -> examination_section` | 325.0 | 325.0 | 3 | 3 | 0.00% | Optimal |
| **Alternative Paths Map** | Central Office | Department Office | `central_office -> scenic_waypoint -> department_office` | 535.0 | `central_office -> scenic_waypoint -> department_office` | 535.0 | 535.0 | 3 | 4 | 0.00% | Optimal |
| **Alternative Paths Map** | Central Office | Library | `central_office -> scenic_waypoint -> department_office -> tech_plaza -> library` | 835.0 | `central_office -> north_walkway -> quad_gateway -> library` | 495.0 | 495.0 | 5 | 4 | **+68.69%** | **Suboptimal** |
| **Alternative Paths Map** | Central Office | Examination Section | `central_office -> south_expressway -> examination_section` | 405.0 | `central_office -> south_expressway -> examination_section` | 405.0 | 405.0 | 3 | 3 | 0.00% | Optimal |
| **Alternative Paths Map** | Central Office | Accounts Section | `central_office -> accounts_section` | 165.0 | `central_office -> accounts_section` | 165.0 | 165.0 | 2 | 2 | 0.00% | Optimal |
| **Alternative Paths Map** | Central Office | Seminar Hall | `central_office -> north_walkway -> seminar_hall` | 340.0 | `central_office -> north_walkway -> seminar_hall` | 340.0 | 340.0 | 3 | 3 | 0.00% | Optimal |
| **Misleading Heuristic Map** | Start S | Goal G | `S -> A -> G` | 101.0 | `S -> B -> G` | 5.0 | 5.0 | 3 | 4 | **+1920.00%** | **Suboptimal** |

---

## 2. In-Depth Analysis of the Misleading Heuristic Experiment

### Problem Setup
- $S = (0, 0)$, $A = (1, 0)$, $B = (0, 2)$, $G = (2, 0)$
- Edges: $(S, A) = 1.0$, $(S, B) = 2.0$, $(A, G) = 100.0$, $(B, G) = 3.0$
- Heuristic distances to $G(2, 0)$:
  - $h(S) = \sqrt{(0-2)^2 + 0} = 2.0$
  - $h(A) = \sqrt{(1-2)^2 + 0} = 1.0$
  - $h(B) = \sqrt{(0-2)^2 + (2-0)^2} = \sqrt{8} \approx 2.83$
  - $h(G) = 0.0$

### Execution Traces

#### Greedy Best-First Search Trace
1. **Step 1:** Expand $S$ ($h=2.0$). Neighbors added: $A$ ($h=1.0$), $B$ ($h=2.83$).
2. **Step 2:** Pop $A$ because $h(A) = 1.0 < h(B) = 2.83$. Neighbors added: $G$ ($h=0.0$).
3. **Step 3:** Pop $G$ because $h(G) = 0.0$. Goal reached!
4. **Result:** Route `S -> A -> G`. Total Cost = $1 + 100 = \mathbf{101.0\text{ m}}$.

#### A* Search Trace
1. **Step 1:** Expand $S$ ($f = 0 + 2.0 = 2.0$).
   - Push $A$: $g=1.0, h=1.0 \implies f=2.0$
   - Push $B$: $g=2.0, h=2.83 \implies f=4.83$
2. **Step 2:** Pop $A$ ($f=2.0$).
   - Push $G$: $g = 1.0 + 100.0 = 101.0, h=0.0 \implies f=101.0$
   - Frontier contains: $B$ ($f=4.83$) and $G$ ($f=101.0$).
3. **Step 3:** Pop $B$ ($f=4.83 < 101.0$).
   - Push $G$ via $B$: $g = 2.0 + 3.0 = 5.0, h=0.0 \implies f=5.0$
   - Frontier contains: $G$ via $B$ ($f=5.0$) and stale $G$ via $A$ ($f=101.0$).
4. **Step 4:** Pop $G$ via $B$ ($f=5.0$). Goal reached!
5. **Result:** Route `S -> B -> G`. Total Cost = $2 + 3 = \mathbf{5.0\text{ m}}$.

### Core Takeaway
GBFS was completely deceived by node $A$'s apparent geometric proximity ($h=1.0$), ignoring the massive traversal penalty along edge $(A, G)$. A* successfully recovered because its evaluation function includes $g(n)$, enabling it to backtrack to node $B$ when the path through $A$ proved cost-prohibitive.

---

## 3. General Experimental Takeaways
1. **Cost Optimality:** A* matched Dijkstra's ground truth cost across 100% of test cases. GBFS generated suboptimal paths in 3 out of 11 benchmark scenarios, with excess path costs ranging from +7.23% to +1920.0%.
2. **Exploration Efficiency:** In scenarios where the heuristic gradient points directly towards the optimal path without obstacles, GBFS expands equal or fewer nodes than A*. However, when detours or heavy-cost edges are present, GBFS can either wander along expensive paths or expand many additional nodes.
3. **Runtime:** Both algorithms execute in less than 0.1 ms for campus-scale graphs ($|V| \le 20$), proving highly suitable for real-time dispatch systems.

