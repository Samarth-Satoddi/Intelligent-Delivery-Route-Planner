"""Yen's K-Shortest Loopless Paths Algorithm.

Computes the K shortest loopless paths between an origin and destination node
in a weighted CampusGraph. Used for discovering legitimate alternative routes
for urban campus delivery.
"""
import copy
import heapq
from typing import Dict, List, Tuple, Optional, Any, Set
from core.graph import CampusGraph
from algorithms.dijkstra import dijkstra_search


def _dijkstra_constrained(
    graph: CampusGraph,
    start: str,
    goal: str,
    ignored_nodes: Set[str],
    ignored_edges: Set[Tuple[str, str]],
) -> Optional[Tuple[List[str], float]]:
    """Helper: Dijkstra search on graph with excluded nodes and edges."""
    if start in ignored_nodes or goal in ignored_nodes:
        return None

    # Priority queue: (cost, counter, current_node, path)
    pq: List[Tuple[float, int, str, List[str]]] = []
    counter = 0
    heapq.heappush(pq, (0.0, counter, start, [start]))
    distances: Dict[str, float] = {start: 0.0}

    while pq:
        cost, _, current, path = heapq.heappop(pq)

        if current == goal:
            return path, round(cost, 2)

        if cost > distances.get(current, float("inf")):
            continue

        for neighbor, weight in graph.get_neighbors(current):
            if neighbor in ignored_nodes:
                continue
            edge_tuple = (current, neighbor)
            if edge_tuple in ignored_edges or (neighbor, current) in ignored_edges:
                continue

            new_cost = cost + weight
            if new_cost < distances.get(neighbor, float("inf")):
                distances[neighbor] = new_cost
                counter += 1
                heapq.heappush(pq, (new_cost, counter, neighbor, path + [neighbor]))

    return None


def yen_k_shortest_paths(
    graph: CampusGraph,
    start: str,
    goal: str,
    K: int = 3,
    walking_speed_mps: float = 1.4,
) -> List[Dict[str, Any]]:
    """Compute up to K shortest loopless paths from start to goal using Yen's algorithm.

    Args:
        graph: CampusGraph instance.
        start: Starting node ID.
        goal: Destination node ID.
        K: Maximum number of distinct alternative paths to discover.
        walking_speed_mps: Walking speed in metres per second (default 1.4 m/s).

    Returns:
        List[Dict[str, Any]]: List of alternative route records.
    """
    if start not in graph.nodes or goal not in graph.nodes:
        return []
    if start == goal:
        return [{
            "route_number": 1,
            "name": "Route 1 (Immediate)",
            "path": [start],
            "path_names": [graph.get_node_name(start)],
            "total_distance_m": 0.0,
            "estimated_walking_minutes": 0.0,
            "junctions_count": 0,
            "districts_crossed": [graph.get_node_district(start)],
            "hops": 0,
        }]

    # Step 1: Find the initial shortest path A[0]
    first_res = dijkstra_search(graph, start, goal)
    if not first_res.success or not first_res.path:
        return []

    A: List[Tuple[List[str], float]] = [(first_res.path, first_res.total_cost)]
    B_candidates: List[Tuple[float, int, List[str]]] = []
    seen_candidates: Set[Tuple[str, ...]] = {tuple(first_res.path)}
    candidate_counter = 0

    # Step 2: Iteratively find subsequent shortest paths
    for k in range(1, K):
        prev_path = A[k - 1][0]

        # The spur node ranges from the first node up to the second-to-last node of the previous path
        for i in range(len(prev_path) - 1):
            spur_node = prev_path[i]
            root_path = prev_path[: i + 1]

            ignored_edges: Set[Tuple[str, str]] = set()
            for p, _ in A:
                if len(p) > i and p[: i + 1] == root_path:
                    ignored_edges.add((p[i], p[i + 1]))

            ignored_nodes: Set[str] = set(root_path[:-1])  # Exclude root nodes except spur node

            # Calculate spur path
            spur_result = _dijkstra_constrained(graph, spur_node, goal, ignored_nodes, ignored_edges)
            if spur_result is not None:
                spur_path, spur_cost = spur_result
                total_path = root_path[:-1] + spur_path
                total_path_tuple = tuple(total_path)

                if total_path_tuple not in seen_candidates:
                    seen_candidates.add(total_path_tuple)
                    try:
                        total_cost = graph.calculate_path_cost(total_path)
                        candidate_counter += 1
                        heapq.heappush(B_candidates, (total_cost, candidate_counter, total_path))
                    except ValueError:
                        pass

        if not B_candidates:
            break

        # Pop shortest candidate from B and add to A
        best_cand_cost, _, best_cand_path = heapq.heappop(B_candidates)
        A.append((best_cand_path, best_cand_cost))

    # Format route records with rich metadata
    routes: List[Dict[str, Any]] = []
    for idx, (path, cost) in enumerate(A):
        dist_m = round(cost, 2)
        walk_mins = round((dist_m / walking_speed_mps) / 60.0, 1)

        # Count junctions
        junc_count = sum(1 for nid in path if graph.get_node_type(nid) == "junction")

        # Districts crossed in sequence
        districts: List[str] = []
        for nid in path:
            d = graph.get_node_district(nid)
            if not districts or districts[-1] != d:
                districts.append(d)

        routes.append({
            "route_number": idx + 1,
            "name": f"Alternative Route {idx + 1}" if idx > 0 else "Primary Optimal Route (Reference)",
            "path": path,
            "path_names": [graph.get_node_name(nid) for nid in path],
            "total_distance_m": dist_m,
            "estimated_walking_minutes": walk_mins,
            "junctions_count": junc_count,
            "districts_crossed": districts,
            "hops": len(path) - 1,
            "is_optimal": (idx == 0),
        })

    return routes

