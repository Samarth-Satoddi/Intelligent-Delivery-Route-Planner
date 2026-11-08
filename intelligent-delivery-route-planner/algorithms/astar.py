"""A* Search Algorithm Implementation.

Evaluation Function:
    f(n) = g(n) + h(n)

Where:
    g(n) = Exact accumulated cost from the start node to node n.
    h(n) = Estimated cost from node n to the goal (Euclidean heuristic).
    f(n) = Estimated total cost of the cheapest path through node n.

Characteristics:
- Guaranteed to be complete and find an optimal path when h(n) is admissible.
- Optimally efficient among all informed graph-search algorithms for a given heuristic.
- Properly handles stale priority queue entries and node reopening.
"""
import heapq
import time
from typing import Dict, List, Optional, Set, Tuple
from core.graph import CampusGraph
from core.metrics import SearchResult, SearchTraceStep


def astar_search(
    graph: CampusGraph,
    start_node: str,
    goal_node: str,
) -> SearchResult:
    """Execute A* Search on the campus graph to find the least-cost path.

    Args:
        graph: CampusGraph instance.
        start_node: Identifier of the starting location.
        goal_node: Identifier of the delivery destination.

    Returns:
        SearchResult: Object containing optimal path, metrics, and step-by-step search trace.
    """
    start_time = time.perf_counter()

    # Validate node existence
    if start_node not in graph.nodes:
        return SearchResult(
            algorithm_name="A* Search",
            start_node=start_node,
            goal_node=goal_node,
            success=False,
            error_message=f"Start node '{start_node}' not found in campus map.",
        )
    if goal_node not in graph.nodes:
        return SearchResult(
            algorithm_name="A* Search",
            start_node=start_node,
            goal_node=goal_node,
            success=False,
            error_message=f"Goal destination '{goal_node}' not found in campus map.",
        )

    heuristic_calc = graph.get_heuristic_calculator()

    # Trivial case: Start is Goal
    if start_node == goal_node:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        trace_step = SearchTraceStep(
            step=1,
            node=start_node,
            node_name=graph.get_node_name(start_node),
            parent=None,
            g=0.0,
            h=0.0,
            f=0.0,
            frontier_size=0,
            action="goal_reached_at_start",
        )
        return SearchResult(
            algorithm_name="A* Search",
            start_node=start_node,
            goal_node=goal_node,
            success=True,
            path=[start_node],
            path_names=[graph.get_node_name(start_node)],
            total_cost=0.0,
            expanded_nodes_count=1,
            generated_nodes_count=1,
            execution_time_ms=elapsed_ms,
            expanded_order=[start_node],
            search_trace=[trace_step],
        )

    # Priority queue stores: (f(n), tie_breaker, node_id, g(n), parent_id)
    entry_counter = 0
    start_h = heuristic_calc.h(start_node, goal_node)
    frontier: List[Tuple[float, int, str, float, Optional[str]]] = []
    heapq.heappush(frontier, (start_h, entry_counter, start_node, 0.0, None))

    g_score: Dict[str, float] = {start_node: 0.0}
    parent_map: Dict[str, Optional[str]] = {start_node: None}
    closed_set: Set[str] = set()

    expanded_order: List[str] = []
    search_trace: List[SearchTraceStep] = []

    generated_nodes_count = 1
    expanded_nodes_count = 0
    goal_found = False

    while frontier:
        f_val, _, current, g_val, parent = heapq.heappop(frontier)

        # Skip stale entries if a cheaper path to 'current' was already processed
        if g_val > g_score.get(current, float("inf")):
            continue

        if current in closed_set:
            continue

        closed_set.add(current)
        expanded_nodes_count += 1
        expanded_order.append(current)

        current_h = heuristic_calc.h(current, goal_node)

        # Record step in trace
        trace_step = SearchTraceStep(
            step=expanded_nodes_count,
            node=current,
            node_name=graph.get_node_name(current),
            parent=parent,
            g=g_val,
            h=current_h,
            f=f_val,
            frontier_size=len(frontier),
            action="expand",
        )
        search_trace.append(trace_step)

        # Goal test on expansion guarantees optimality
        if current == goal_node:
            goal_found = True
            break

        # Explore neighbors
        for neighbor, weight in graph.get_neighbors(current):
            tentative_g = g_val + weight

            if tentative_g < g_score.get(neighbor, float("inf")):
                # Better path found to neighbor
                g_score[neighbor] = tentative_g
                parent_map[neighbor] = current

                # If neighbor was closed, reopen it to preserve optimality
                if neighbor in closed_set:
                    closed_set.remove(neighbor)

                neigh_h = heuristic_calc.h(neighbor, goal_node)
                neigh_f = tentative_g + neigh_h
                entry_counter += 1
                generated_nodes_count += 1
                heapq.heappush(
                    frontier,
                    (neigh_f, entry_counter, neighbor, tentative_g, current)
                )

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    if not goal_found:
        return SearchResult(
            algorithm_name="A* Search",
            start_node=start_node,
            goal_node=goal_node,
            success=False,
            expanded_nodes_count=expanded_nodes_count,
            generated_nodes_count=generated_nodes_count,
            execution_time_ms=elapsed_ms,
            expanded_order=expanded_order,
            search_trace=search_trace,
            error_message=f"No route found from '{start_node}' to '{goal_node}'. Destination is unreachable.",
        )

    # Reconstruct optimal path
    path: List[str] = []
    curr: Optional[str] = goal_node
    while curr is not None:
        path.append(curr)
        curr = parent_map.get(curr)
    path.reverse()

    path_names = [graph.get_node_name(nid) for nid in path]
    total_cost = graph.calculate_path_cost(path)

    return SearchResult(
        algorithm_name="A* Search",
        start_node=start_node,
        goal_node=goal_node,
        success=True,
        path=path,
        path_names=path_names,
        total_cost=total_cost,
        expanded_nodes_count=expanded_nodes_count,
        generated_nodes_count=generated_nodes_count,
        execution_time_ms=elapsed_ms,
        expanded_order=expanded_order,
        search_trace=search_trace,
    )

