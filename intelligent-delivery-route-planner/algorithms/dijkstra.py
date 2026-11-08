"""Dijkstra's Algorithm Implementation.

Used strictly as an independent validation baseline to verify that A* Search
reliably finds the true mathematical optimal path cost on all test graphs.

Evaluation Function:
    f(n) = g(n)  [Equivalent to A* with h(n) = 0]
"""
import heapq
import time
from typing import Dict, List, Optional, Set, Tuple
from core.graph import CampusGraph
from core.metrics import SearchResult, SearchTraceStep


def dijkstra_search(
    graph: CampusGraph,
    start_node: str,
    goal_node: str,
) -> SearchResult:
    """Execute Dijkstra's Uniform Cost Search as an optimality baseline.

    Args:
        graph: CampusGraph instance.
        start_node: Start location ID.
        goal_node: Destination ID.

    Returns:
        SearchResult: Object containing optimal path, cost, and metrics.
    """
    start_time = time.perf_counter()

    if start_node not in graph.nodes:
        return SearchResult(
            algorithm_name="Dijkstra Baseline",
            start_node=start_node,
            goal_node=goal_node,
            success=False,
            error_message=f"Start node '{start_node}' not found.",
        )
    if goal_node not in graph.nodes:
        return SearchResult(
            algorithm_name="Dijkstra Baseline",
            start_node=start_node,
            goal_node=goal_node,
            success=False,
            error_message=f"Goal node '{goal_node}' not found.",
        )

    if start_node == goal_node:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return SearchResult(
            algorithm_name="Dijkstra Baseline",
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
        )

    entry_counter = 0
    frontier: List[Tuple[float, int, str, float, Optional[str]]] = []
    heapq.heappush(frontier, (0.0, entry_counter, start_node, 0.0, None))

    dist_map: Dict[str, float] = {start_node: 0.0}
    parent_map: Dict[str, Optional[str]] = {start_node: None}
    visited: Set[str] = set()

    expanded_order: List[str] = []
    search_trace: List[SearchTraceStep] = []
    generated_nodes_count = 1
    expanded_nodes_count = 0
    goal_found = False

    while frontier:
        f_val, _, current, g_val, parent = heapq.heappop(frontier)

        if g_val > dist_map.get(current, float("inf")):
            continue

        if current in visited:
            continue

        visited.add(current)
        expanded_nodes_count += 1
        expanded_order.append(current)

        trace_step = SearchTraceStep(
            step=expanded_nodes_count,
            node=current,
            node_name=graph.get_node_name(current),
            parent=parent,
            g=g_val,
            h=0.0,
            f=g_val,
            frontier_size=len(frontier),
            action="expand",
        )
        search_trace.append(trace_step)

        if current == goal_node:
            goal_found = True
            break

        for neighbor, weight in graph.get_neighbors(current):
            new_cost = g_val + weight
            if new_cost < dist_map.get(neighbor, float("inf")):
                dist_map[neighbor] = new_cost
                parent_map[neighbor] = current
                entry_counter += 1
                generated_nodes_count += 1
                heapq.heappush(frontier, (new_cost, entry_counter, neighbor, new_cost, current))

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    if not goal_found:
        return SearchResult(
            algorithm_name="Dijkstra Baseline",
            start_node=start_node,
            goal_node=goal_node,
            success=False,
            expanded_nodes_count=expanded_nodes_count,
            generated_nodes_count=generated_nodes_count,
            execution_time_ms=elapsed_ms,
            expanded_order=expanded_order,
            search_trace=search_trace,
            error_message="Destination unreachable.",
        )

    path: List[str] = []
    curr: Optional[str] = goal_node
    while curr is not None:
        path.append(curr)
        curr = parent_map.get(curr)
    path.reverse()

    path_names = [graph.get_node_name(nid) for nid in path]
    total_cost = graph.calculate_path_cost(path)

    return SearchResult(
        algorithm_name="Dijkstra Baseline",
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

