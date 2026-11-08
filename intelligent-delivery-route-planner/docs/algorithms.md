# Search Algorithms Specification

This document details the mathematical formulation, algorithmic pseudocode, and structural implementation of the search algorithms employed in the Intelligent Delivery Route Planner.

---

## 1. Greedy Best-First Search (GBFS)

### Evaluation Function
$$f(n) = h(n)$$

GBFS expands the node that appears closest to the goal according to the heuristic estimate $h(n)$. It does not take into account the path cost $g(n)$ accumulated so far.

### Heuristic Function
The Euclidean distance function is used:
$$h(n) = \sqrt{(x_n - x_{\text{goal}})^2 + (y_n - y_{\text{goal}})^2}$$

### Pseudocode
```text
function GREEDY-BEST-FIRST-SEARCH(Graph, start, goal):
    frontier = PriorityQueue ordered by h(n)
    frontier.push(start with priority h(start))
    visited = empty set
    parent = map {start: None}
    
    while frontier is not empty:
        current = frontier.pop_min()
        if current in visited:
            continue
        visited.add(current)
        
        if current == goal:
            return RECONSTRUCT-PATH(parent, goal)
            
        for (neighbor, weight) in Graph.get_neighbors(current):
            if neighbor not in visited:
                parent[neighbor] = current
                frontier.push(neighbor with priority h(neighbor))
                
    return FAILURE (Destination Unreachable)
```

### Characteristics
- **Completeness:** Complete in finite state spaces with a visited set (graph search).
- **Optimality:** **Non-optimal**. As demonstrated by the misleading heuristic experiment, GBFS can be tricked into selecting high-cost edges if intermediate nodes have low straight-line distances to the goal.

---

## 2. A* Search Algorithm

### Evaluation Function
$$f(n) = g(n) + h(n)$$
Where:
- $g(n)$: Exact accumulated cost (walking distance) from the starting point to node $n$.
- $h(n)$: Estimated remaining cost from node $n$ to the goal (Euclidean heuristic).
- $f(n)$: Estimated total route cost through node $n$.

### Pseudocode
```text
function A-STAR-SEARCH(Graph, start, goal):
    frontier = PriorityQueue ordered by f(n)
    frontier.push(start with priority h(start), g=0)
    
    g_score = map {all nodes: infinity}
    g_score[start] = 0
    parent = map {start: None}
    closed_set = empty set
    
    while frontier is not empty:
        (f_val, current, g_val) = frontier.pop_min()
        
        if g_val > g_score[current]:
            continue  // Skip stale entry
            
        if current in closed_set:
            continue
            
        closed_set.add(current)
        
        if current == goal:
            return RECONSTRUCT-PATH(parent, goal)
            
        for (neighbor, weight) in Graph.get_neighbors(current):
            tentative_g = g_val + weight
            if tentative_g < g_score[neighbor]:
                g_score[neighbor] = tentative_g
                parent[neighbor] = current
                if neighbor in closed_set:
                    closed_set.remove(neighbor) // Node reopening
                f_neighbor = tentative_g + h(neighbor)
                frontier.push(neighbor with priority f_neighbor, g=tentative_g)
                
    return FAILURE (Destination Unreachable)
```

### Optimality Theorem
When $h(n)$ is **admissible** ($h(n) \le h^*(n)$ for all $n$) and **consistent** ($h(u) \le c(u, v) + h(v)$ for all edges), A* graph search is guaranteed to return an optimal (least-cost) path.

---

## 3. Dijkstra's Algorithm (Validation Baseline)

### Evaluation Function
$$f(n) = g(n)$$
Dijkstra's algorithm is identical to uniform-cost search ($h(n) = 0$). In this project, it is used strictly as an automated, independent verification baseline to assert that A* achieves the exact mathematical minimum route cost across all test graphs.

---

## 4. Key Implementation Details

1. **Deterministic Tie-Breaking:**
   Priority queue tuples in Python's `heapq` are structured as:
   $$(f\_val, \text{entry\_counter}, \text{node\_id}, g\_val, \text{parent\_id})$$
   The monotonically incrementing integer `entry_counter` guarantees that Python never attempts to compare graph node identifiers or data structures if priority values tie, ensuring FIFO behavior on ties and completely deterministic execution.

2. **Metrics Tracking:**
   - **Expanded Nodes:** Nodes that are removed from the priority queue and processed for goal test and successor generation.
   - **Generated Nodes:** Nodes that are created and inserted into the priority queue frontier.
   - **Search Trace:** A complete ledger of every expansion step recording $g(n)$, $h(n)$, $f(n)$, the parent pointer, and current frontier size.

