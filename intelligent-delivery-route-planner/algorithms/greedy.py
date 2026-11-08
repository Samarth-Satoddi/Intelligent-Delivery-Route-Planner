"""Greedy Best-First Search (GBFS) Implementation.

Evaluation Function:
    f(n) = h(n)

Characteristics:
- Purely heuristic-driven search.
- Expands the node that appears closest to the goal according to the heuristic function.
- Does not take into account the path cost accumulated so far (g(n)).
- Not guaranteed to find the optimal (least-cost) route.
"""
import heapq
import time
from typing import Dict, List, Optional, Set, Tuple
from core.graph import CampusGraph
from core.metrics import SearchResult, SearchTraceStep


def greedy_best_first_search(
    graph: CampusGraph,
    start_node: str,
    goal_node: str,
) -> SearchResult:
    """Execute Greedy Best-First Search on the campus graph.

    Args:
        graph: CampusGraph instance.
        start_node: Identifier of the starting location.
        goal_node: Identifier of the delivery destination.

    Returns:
        SearchResult: Object containing path, metrics, and step-by-step search trace.
    """
    start_time = time.perf_counter()

    # Validate node existence
    if start_node not in graph.nodes:
        return SearchResult(
            algorithm_name="Greedy Best-First Search",
            start_node=start_node,
            goal_node=goal_node,
            success=False,
            error_message=f"Start node '{start_node}' not found in campus map.",
        )
    if goal_node not in graph.nodes:
        return SearchResult(
            algorithm_name="Greedy Best-First Search",
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
            algorithm_name="Greedy Best-First Search",
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

    # Priority queue item: (h(n), tie_breaker, current_node, parent_node, g(n))
    # Note: GBFS evaluates priority based purely on h(n).
    entry_counter = 0
    start_h = heuristic_calc.h(start_node, goal_node)
    frontier: List[Tuple[float, int, str, Optional[str], float]] = []
    heapq.heappush(frontier, (start_h, entry_counter, start_node, None, 0.0))

    visited: Set[str] = set()
    parent_map: Dict[str, Optional[str]] = {}
    expanded_order: List[str] = []
    search_trace: List[SearchTraceStep] = []

    generated_nodes_count = 1
    expanded_nodes_count = 0
    goal_found = False

    while frontier:
        h_val, _, current, parent, g_val = heapq.heappop(frontier)

        if current in visited:
            continue

        visited.add(current)
        parent_map[current] = parent
        expanded_nodes_count += 1
        expanded_order.append(current)

        # Record step in trace
        trace_step = SearchTraceStep(
            step=expanded_nodes_count,
            node=current,
            node_name=graph.get_node_name(current),
            parent=parent,
            g=g_val,
            h=h_val,
            f=h_val,  # For GBFS, f(n) = h(n)
            frontier_size=len(frontier),
            action="expand",
        )
        search_trace.append(trace_step)

        # Check goal condition upon expansion
        if current == goal_node:
            goal_found = True
            break

        # Generate successors
        for neighbor, weight in graph.get_neighbors(current):
            if neighbor not in visited:
                neigh_h = heuristic_calc.h(neighbor, goal_node)
                entry_counter += 1
                generated_nodes_count += 1
                heapq.heappush(
                    frontier,
                    (neigh_h, entry_counter, neighbor, current, g_val + weight)
                )

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    if not goal_found:
        return SearchResult(
            algorithm_name="Greedy Best-First Search",
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

    # Reconstruct path from parent_map
    path: List[str] = []
    curr: Optional[str] = goal_node
    while curr is not None:
        path.append(curr)
        curr = parent_map.get(curr)
    path.reverse()

    path_names = [graph.get_node_name(nid) for nid in path]
    total_cost = graph.calculate_path_cost(path)

    return SearchResult(
        algorithm_name="Greedy Best-First Search",
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

