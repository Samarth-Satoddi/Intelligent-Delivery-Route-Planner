# Computational Complexity Analysis

This document provides a rigorous theoretical and empirical complexity analysis of Greedy Best-First Search (GBFS) and A* Search in spatial navigation.

---

## 1. Complexity Comparison Matrix

| Dimension | Greedy Best-First Search (GBFS) | A* Search (Admissible Heuristic) | Dijkstra Baseline |
| :--- | :--- | :--- | :--- |
| **Evaluation Function** | $f(n) = h(n)$ | $f(n) = g(n) + h(n)$ | $f(n) = g(n)$ |
| **General Time Complexity (Tree Search)** | $O(b^m)$ | $O(b^d)$ (with $h=0$), $O(b^\epsilon)$ with informed $h$ | $O(b^{C^*/\epsilon})$ |
| **Finite Graph Time Complexity** | $O(|V| \log |V| + |E|)$ | $O(|V| \log |V| + |E|)$ | $O(|V| \log |V| + |E|)$ |
| **General Space Complexity** | $O(b^m)$ | $O(b^d)$ | $O(b^{C^*/\epsilon})$ |
| **Finite Graph Space Complexity** | $O(|V|)$ | $O(|V|)$ | $O(|V|)$ |
| **Completeness** | Yes (in finite graph with visited set) | Yes | Yes |
| **Optimality Guarantee** | **No** (can be severely suboptimal) | **Yes** (least-cost path guaranteed) | **Yes** |

Where:
- $b$: Effective branching factor (number of branching corridors at each junction, typically $2$ to $4$ in campus graphs).
- $d$: Depth of the optimal goal state in the search space.
- $m$: Maximum depth of the state space.
- $|V|$: Total number of discrete campus locations (nodes).
- $|E|$: Total number of walkable paths (edges).
- $C^*$: Cost of the optimal path.
- $\epsilon$: Lower bound on step cost ($\min c(u, v) > 0$).

---

## 2. Theoretical Breakdown

### 2.1 Greedy Best-First Search (GBFS)
- **Time and Space:**
  In an unbounded state space without cycle detection, GBFS can get trapped in infinite loops. In a finite graph with cycle detection (our closed/visited set), each node is expanded at most once. Hence, the worst-case time complexity is bounded by $O(|V| \log |V| + |E|)$ using a binary min-heap.
- **Why GBFS Is Not Optimal:**
  GBFS is guided solely by $h(n)$. If a node $A$ lies in direct line-of-sight of the goal but is separated by a canyon, river, or construction zone requiring a 100m detour, GBFS will still eagerly choose $A$ over an alternative node $B$ whose Euclidean distance is slightly larger but connects via a 3m flat path. It prioritizes apparent local proximity over global path efficiency.

### 2.2 A* Search
- **Time Complexity and Pruning:**
  A* expands only those nodes satisfying $f(n) \le C^*$, where $C^*$ is the optimal path cost.
  - If $h(n) = 0$, A* degenerates into Dijkstra's algorithm, expanding all nodes in circular contours of radius $C^*$.
  - As $h(n)$ approaches the true minimal cost $h^*(n)$, the search envelope narrows from a sphere to a direct line towards the goal.
  - If $h(n) = h^*(n)$ (perfect heuristic), A* expands only nodes on the optimal path without any backtracking.
- **Space Complexity:**
  Because A* must keep all generated nodes in memory (in either the priority queue frontier or the closed set) to guarantee that newly discovered paths can be compared against known routes, its memory consumption is $O(|V|)$ in finite graphs and exponential $O(b^d)$ in unbounded spaces.

---

## 3. Heuristic Admissibility and Consistency Proof

### 3.1 Admissibility ($h(n) \le h^*(n)$)
A heuristic is admissible if it never overestimates the true minimal cost to the goal.
Let $n$ be an arbitrary campus node, and let $g$ be the goal destination.
Let $P^* = (n = v_0, v_1, v_2, \dots, v_k = g)$ be the true shortest walking route in the campus graph.
1. The true cost of this route is $h^*(n) = \sum_{i=0}^{k-1} c(v_i, v_{i+1})$.
2. By campus design, every edge satisfies $c(v_i, v_{i+1}) \ge \text{dist}_{\text{Euclidean}}(v_i, v_{i+1})$.
3. By the Triangle Inequality in $\mathbb{R}^2$:
   $$\sum_{i=0}^{k-1} \text{dist}_{\text{Euclidean}}(v_i, v_{i+1}) \ge \text{dist}_{\text{Euclidean}}(n, g) = h(n)$$
4. Therefore, $h(n) \le \sum c(v_i, v_{i+1}) = h^*(n)$.
Hence, the Euclidean heuristic is strictly admissible.

### 3.2 Consistency / Monotonicity ($h(u) \le c(u, v) + h(v)$)
For any edge $(u, v)$ with weight $c(u, v)$:
1. By the Euclidean Triangle Inequality on the points $u, v,$ and $g$:
   $$\text{dist}_{\text{Euclidean}}(u, g) \le \text{dist}_{\text{Euclidean}}(u, v) + \text{dist}_{\text{Euclidean}}(v, g)$$
2. Since $c(u, v) \ge \text{dist}_{\text{Euclidean}}(u, v)$:
   $$h(u) \le c(u, v) + h(v)$$
Thus, $f(n)$ is monotonically non-decreasing along every path, ensuring that when A* expands a node, it has already found the optimal path to that node.

