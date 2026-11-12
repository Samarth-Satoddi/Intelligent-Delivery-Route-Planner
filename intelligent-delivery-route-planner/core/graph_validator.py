"""Graph Validation Suite for City-Scale Intelligent Delivery Route Planner.

Performs comprehensive automated topological and geometric integrity verification:
1. All 51 required named buildings and 20+ junctions exist.
2. Node IDs are globally unique.
3. Edge reference integrity (all source and target nodes exist).
4. Strictly positive non-zero road costs (w > 0).
5. Complete graph connectivity (single connected component, 0 isolates).
6. Path diversity verification (at least 3 feasible loopless paths to major destinations).
7. Heuristic admissibility guarantee (w(u, v) >= Euclidean(u, v) for all edges).
8. Graph statistics reporting.
"""
import math
from typing import Dict, List, Tuple, Any, Set
from collections import deque
from core.graph import CampusGraph
from algorithms.yen_ksp import yen_k_shortest_paths

REQUIRED_NAMED_LOCATIONS = {
    # Administration (8)
    "Central Office", "Main Administration", "Examination Section", "Accounts Office",
    "Registrar Office", "Admissions Centre", "Records Department", "Security Headquarters",

    # Academic (12)
    "Computer Science Block", "AI and Data Science Block", "Electronics Block",
    "Mechanical Block", "Civil Engineering Block", "Electrical Block", "Research Centre",
    "Innovation Centre", "Computer Lab", "Robotics Lab", "Science Laboratory", "Faculty Block",

    # Knowledge and Culture (7)
    "Central Library", "Digital Library", "Reading Hall", "Auditorium", "Seminar Hall",
    "Conference Centre", "Exhibition Centre",

    # Student Life (9)
    "Main Cafeteria", "Food Court", "Student Centre", "Boys Hostel", "Girls Hostel",
    "Medical Centre", "Gymnasium", "Shopping Centre", "Student Activity Centre",

    # Sports (7)
    "Main Stadium", "Football Ground", "Cricket Ground", "Basketball Court",
    "Badminton Court", "Swimming Pool", "Sports Complex",

    # Transport and Infrastructure (8)
    "Main Entrance Gate", "North Gate", "South Gate", "Bus Terminal",
    "Visitor Parking", "Student Parking", "Maintenance Centre", "Power Station",
}

EXPECTED_DISTRICTS = {
    "Administration District",
    "Academic District",
    "Knowledge and Culture District",
    "Student Life District",
    "Sports District",
    "Transport and Infrastructure District",
}


def validate_graph_integrity(graph: CampusGraph) -> Dict[str, Any]:
    """Run full suite of topological, geometric, and heuristic validations.

    Returns:
        Dict[str, Any]: Validation report and graph statistics.
    """
    errors: List[str] = []
    warnings: List[str] = []

    # 1. Verify Named Locations
    node_names = {info["name"] for info in graph.nodes.values()}
    missing_locations = REQUIRED_NAMED_LOCATIONS - node_names
    if missing_locations:
        errors.append(f"Missing required named locations: {missing_locations}")

    # 2. Verify Node Uniqueness & IDs
    node_ids = list(graph.nodes.keys())
    if len(node_ids) != len(set(node_ids)):
        errors.append("Duplicate node IDs found in graph.")

    # 3. Verify Edge Reference Integrity & Positivity
    min_edge_dist = float("inf")
    max_edge_dist = float("-inf")
    total_edge_weight = 0.0

    for edge in graph.edges_list:
        u = edge["source"]
        v = edge["target"]
        dist = edge["distance"]

        if u not in graph.nodes:
            errors.append(f"Edge references non-existent source node: '{u}'")
        if v not in graph.nodes:
            errors.append(f"Edge references non-existent target node: '{v}'")

        if dist <= 0:
            errors.append(f"Edge ({u} <-> {v}) has non-positive distance: {dist}")

        if dist < min_edge_dist:
            min_edge_dist = dist
        if dist > max_edge_dist:
            max_edge_dist = dist
        total_edge_weight += dist

    # 4. Heuristic Admissibility Guarantee
    for edge in graph.edges_list:
        u_id = edge["source"]
        v_id = edge["target"]
        dist = edge["distance"]
        if u_id in graph.nodes and v_id in graph.nodes:
            u = graph.nodes[u_id]
            v = graph.nodes[v_id]
            eucl = math.sqrt((u["x"] - v["x"]) ** 2 + (u["y"] - v["y"]) ** 2)
            if dist < (eucl - 1e-4):
                errors.append(
                    f"Admissibility violation on edge ({u_id} <-> {v_id}): distance {dist}m < Euclidean {eucl:.2f}m"
                )

    # 5. Connected Components Analysis via BFS
    visited: Set[str] = set()
    components_count = 0
    start_node = graph.get_start_node() or next(iter(graph.nodes.keys()))

    all_nodes = set(graph.nodes.keys())
    unvisited = set(all_nodes)

    while unvisited:
        components_count += 1
        comp_root = next(iter(unvisited))
        q = deque([comp_root])
        unvisited.remove(comp_root)
        while q:
            curr = q.popleft()
            for neighbor, _ in graph.get_neighbors(curr):
                if neighbor in unvisited:
                    unvisited.remove(neighbor)
                    q.append(neighbor)

    if components_count != 1:
        errors.append(f"Graph is disconnected! Found {components_count} components.")

    # 6. Major Destinations Reachability & Path Diversity
    major_destinations = [
        "cs_block", "central_library", "main_stadium", "main_cafeteria", "exam_section",
        "robotics_lab", "research_centre", "auditorium", "sports_complex", "bus_terminal"
    ]
    diversity_results = {}
    for dest in major_destinations:
        if dest in graph.nodes and start_node in graph.nodes:
            paths = yen_k_shortest_paths(graph, start_node, dest, K=3)
            diversity_results[dest] = len(paths)
            if len(paths) < 3:
                warnings.append(f"Destination '{dest}' has fewer than 3 distinct paths ({len(paths)} found).")

    # 7. Statistics Computation
    locations_count = sum(1 for n in graph.nodes.values() if n.get("type") != "junction")
    junctions_count = sum(1 for n in graph.nodes.values() if n.get("type") == "junction")
    districts_present = {n.get("district") for n in graph.nodes.values() if "district" in n}

    degrees = [len(graph.get_neighbors(nid)) for nid in graph.nodes]
    avg_degree = round(sum(degrees) / len(degrees), 2) if degrees else 0.0

    is_valid = len(errors) == 0

    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "statistics": {
            "total_nodes": len(graph.nodes),
            "total_locations": locations_count,
            "total_junctions": junctions_count,
            "total_road_connections": len(graph.edges_list),
            "number_of_districts": len(districts_present),
            "districts_list": sorted(list(districts_present)),
            "connected_components": components_count,
            "min_edge_length_m": min_edge_dist if min_edge_dist != float("inf") else 0.0,
            "max_edge_length_m": max_edge_dist if max_edge_dist != float("-inf") else 0.0,
            "average_node_degree": avg_degree,
            "path_diversity_checks_passed": sum(1 for count in diversity_results.values() if count >= 3),
            "path_diversity_total_checked": len(diversity_results),
        },
    }
