"""Experimental Suite: Systematic benchmarking and comparison of GBFS vs A*.

Performs rigorous empirical evaluation across:
1. Normal Demonstration Campus Map (all 5 standard destinations).
2. Alternative and Detour Campus Map (longer paths, scenic traps).
3. Misleading Heuristic Map (Section 8 classic heuristic failure experiment).

Also includes Dijkstra's algorithm strictly as an independent ground-truth
optimality validation check.
"""
import sys
from pathlib import Path

# Ensure project root is in sys.path for direct script execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from typing import Dict, List, Optional, Any
import pandas as pd

from core.graph import CampusGraph
from algorithms.greedy import greedy_best_first_search
from algorithms.astar import astar_search
from algorithms.dijkstra import dijkstra_search


def compare_algorithms(
    graph: CampusGraph,
    start_node: str,
    goal_node: str,
    map_label: str = "Campus Map",
) -> Dict[str, Any]:
    """Execute GBFS, A*, and Dijkstra baseline on a graph query and compare metrics.

    Args:
        graph: CampusGraph instance.
        start_node: Start location ID.
        goal_node: Goal destination ID.
        map_label: Human-readable map name.

    Returns:
        Dict[str, Any]: Comparison dictionary.
    """
    gbfs_res = greedy_best_first_search(graph, start_node, goal_node)
    astar_res = astar_search(graph, start_node, goal_node)
    dijkstra_res = dijkstra_search(graph, start_node, goal_node)

    # Validate A* optimality against Dijkstra ground truth
    dijkstra_cost = dijkstra_res.total_cost if dijkstra_res.success else None
    if astar_res.success and dijkstra_res.success:
        cost_diff = abs(astar_res.total_cost - dijkstra_res.total_cost)
        if cost_diff > 1e-4:
            raise AssertionError(
                f"A* optimality verification failed for {map_label} ({start_node}->{goal_node}): "
                f"A* cost={astar_res.total_cost}, Dijkstra cost={dijkstra_res.total_cost}"
            )

    # Route representations
    gbfs_route_str = " -> ".join(gbfs_res.path) if gbfs_res.success else "NO ROUTE"
    astar_route_str = " -> ".join(astar_res.path) if astar_res.success else "NO ROUTE"

    # Calculate Excess Cost %: ((GBFS Cost - A* Cost) / A* Cost) * 100
    excess_cost_pct = 0.0
    if gbfs_res.success and astar_res.success:
        if astar_res.total_cost > 0:
            excess_cost_pct = round(
                ((gbfs_res.total_cost - astar_res.total_cost) / astar_res.total_cost) * 100.0,
                2
            )
        else:
            excess_cost_pct = 0.0

    optimality_status = "Optimal" if excess_cost_pct == 0.0 else f"Suboptimal (+{excess_cost_pct}%)"

    return {
        "Test Map": map_label,
        "Starting Node": graph.get_node_name(start_node),
        "Goal Node": graph.get_node_name(goal_node),
        "Start ID": start_node,
        "Goal ID": goal_node,
        "GBFS Route": gbfs_route_str,
        "GBFS Cost (m)": round(gbfs_res.total_cost, 2) if gbfs_res.success else None,
        "A* Route": astar_route_str,
        "A* Cost (m)": round(astar_res.total_cost, 2) if astar_res.success else None,
        "Dijkstra Cost (m)": round(dijkstra_cost, 2) if dijkstra_cost is not None else None,
        "GBFS Expanded Nodes": gbfs_res.expanded_nodes_count,
        "A* Expanded Nodes": astar_res.expanded_nodes_count,
        "GBFS Generated Nodes": gbfs_res.generated_nodes_count,
        "A* Generated Nodes": astar_res.generated_nodes_count,
        "GBFS Execution Time (ms)": round(gbfs_res.execution_time_ms, 3),
        "A* Execution Time (ms)": round(astar_res.execution_time_ms, 3),
        "Excess Cost (%)": excess_cost_pct,
        "Optimality": optimality_status,
        "GBFS Result": gbfs_res,
        "A* Result": astar_res,
    }


def run_benchmark_experiments(data_dir: Optional[Path | str] = None) -> pd.DataFrame:
    """Run full benchmark experiments across all 3 test maps and all target destinations.

    Returns:
        pd.DataFrame: Comprehensive experimental results table.
    """
    if data_dir is None:
        base_path = Path(__file__).resolve().parent.parent / "data"
    else:
        base_path = Path(data_dir)

    campus_map_path = base_path / "campus_map.json"
    alt_map_path = base_path / "alternative_paths_map.json"
    misleading_map_path = base_path / "misleading_map.json"

    records: List[Dict[str, Any]] = []

    # Map 1: Normal Campus Map (All 5 Destinations from Central Office)
    if campus_map_path.exists():
        campus_graph = CampusGraph.load_from_json(campus_map_path)
        start = campus_graph.get_start_node()
        destinations = campus_graph.get_destinations()
        for dest in destinations:
            rec = compare_algorithms(campus_graph, start, dest, map_label="1. Normal Campus Map")
            records.append(rec)

    # Map 2: Alternative and Detour Map (Multiple Scenarios)
    if alt_map_path.exists():
        alt_graph = CampusGraph.load_from_json(alt_map_path)
        start = alt_graph.get_start_node()
        for dest in alt_graph.get_destinations():
            rec = compare_algorithms(alt_graph, start, dest, map_label="2. Alternative Paths Map")
            records.append(rec)

    # Map 3: Misleading Heuristic Map (Start S -> Goal G)
    if misleading_map_path.exists():
        misleading_graph = CampusGraph.load_from_json(misleading_map_path)
        rec = compare_algorithms(misleading_graph, "S", "G", map_label="3. Misleading Heuristic Map")
        records.append(rec)

    # Format into DataFrame (excluding raw SearchResult objects from table)
    display_records = []
    for r in records:
        clean_rec = {k: v for k, v in r.items() if k not in ("GBFS Result", "A* Result", "Start ID", "Goal ID")}
        display_records.append(clean_rec)

    df = pd.DataFrame(display_records)
    return df


if __name__ == "__main__":
    print("=" * 80)
    print("RUNNING BENCHMARK EXPERIMENTS: GBFS vs A* SEARCH")
    print("=" * 80)
    results_df = run_benchmark_experiments()
    print(results_df.to_string())
    print("\nBenchmark completed successfully. All A* routes verified optimal against Dijkstra.")
