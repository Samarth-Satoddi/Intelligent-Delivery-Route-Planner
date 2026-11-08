# State-Space Representation

## 1. Problem Formulation

In classical Artificial Intelligence search, path planning through a spatial environment is formulated as a state-space search problem over an undirected, weighted graph $G = (V, E)$, where $V$ represents physical campus locations (buildings, departments, and junctions) and $E$ represents walkable paths.

### Formal Tuple Definition
The delivery routing problem is defined by the 6-tuple:
$$\mathcal{P} = \langle S, s_0, S_G, A, T, c \rangle$$

1. **State Space ($S$):**
   The set of all valid physical locations within the college campus.
   $$S = \{v \in V \mid v \text{ is a campus facility, office, or junction}\}$$
   Examples: `central_office`, `admin_circle`, `library`, `accounts_section`, `seminar_hall`, `department_office`, `examination_section`.

2. **Initial State ($s_0 \in S$):**
   The starting location of the delivery agent:
   $$s_0 = \text{Central Office}$$

3. **Goal State ($S_G \subseteq S$):**
   The designated target delivery destination for the current dispatch task:
   $$S_G = \{ \text{Selected Campus Destination} \}$$
   Supported primary college destinations:
   - Department Office
   - Examination Section
   - Library
   - Accounts Section
   - Seminar Hall

4. **Action Space ($A(s)$):**
   The set of allowable actions available at state $s$. An action corresponds to walking from location $s$ along an established corridor or path to an directly connected neighbor:
   $$A(s) = \{ \text{MoveTo}(v) \mid (s, v) \in E \}$$
   Moving between unconnected nodes without an edge is strictly invalid.

5. **Transition Model ($T: S \times A \to S$):**
   Determines the resulting state when action $\text{MoveTo}(v)$ is executed at state $s$:
   $$T(s, \text{MoveTo}(v)) = v$$

6. **Step Cost Function ($c(s, a, s')$):**
   The non-negative transition cost representing the actual physical walking distance in metres:
   $$c(s, \text{MoveTo}(v), v) = \text{weight}(s, v) \in \mathbb{R}^+$$

7. **Path Cost ($g(p)$):**
   For an ordered route $p = (s_0, s_1, s_2, \dots, s_k)$, the total path cost is the additive sum of transition costs:
   $$g(p) = \sum_{i=0}^{k-1} c(s_i, \text{MoveTo}(s_{i+1}), s_{i+1})$$

---

## 2. Graph Representation

The campus layout is modeled using an **Adjacency List** representation:
- Each node stores its Cartesian spatial coordinates $(x, y)$ in metres.
- Each adjacency entry stores the neighbor identifier and the measured walkway distance.
- Walkways are bidirectional (undirected), representing two-way pedestrian movement.

### Admissibility Invariant
To ensure the Euclidean heuristic function $h(n)$ is mathematically admissible, every edge $(u, v) \in E$ satisfies:
$$\text{weight}(u, v) \ge \sqrt{(x_u - x_v)^2 + (y_u - y_v)^2}$$
This guarantees that straight-line distance is always a lower bound on walking distance.

