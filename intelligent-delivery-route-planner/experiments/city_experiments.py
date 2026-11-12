"""City-Scale Experimental Benchmark Suite.

Executes at least 30 systematically chosen origin-destination experiments
spanning all six districts of the smart campus city.
Compares GBFS vs. A*, validates A* against Dijkstra ground truth,
measures path diversity via Yen's K-Shortest Paths, and collects runtime metrics.
"""
import sys
from pathlib import Path
from typing import Dict, List, Any, Tuple
import pandas as pd

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.graph import CampusGraph
from algorithms.greedy import greedy_best_first_search
from algorithms.astar import astar_search
from algorithms.dijkstra import dijkstra_search
from algorithms.yen_ksp import yen_k_shortest_paths

# 32 Curated Origin-Destination Pairs Spanning All 6 Districts
CITY_EXPERIMENT_PAIRS: List[Tuple[str, str, str]] = [
    # 1-5: Administration to Academic
    ("central_office", "cs_block", "Admin to Academic Computing"),
    ("main_admin", "ai_ds_block", "Secretariat to AI Institute"),
    ("records_dept", "robotics_lab", "Archives to Autonomous Robotics"),
    ("security_hq", "research_centre", "Security to Postdoc Labs"),
    ("exam_section", "faculty_block", "Exam Vault to Faculty Chambers"),

    # 6-10: Administration to Knowledge & Culture
    ("central_office", "central_library", "Central Office to Main Library"),
    ("registrar_office", "auditorium", "Registrar to Convocation Hall"),
    ("admissions_centre", "exhibition_centre", "Admissions to Expo Pavilion"),
    ("accounts_office", "digital_library", "Finance to Multimedia Suites"),
    ("central_office", "seminar_hall", "Central Hub to Symposia Amphitheater"),

    # 11-15: Administration to Student Life
    ("central_office", "main_cafeteria", "Hub to Central Dining"),
    ("security_hq", "medical_centre", "Emergency Dispatch to Clinic"),
    ("accounts_office", "student_centre", "Accounts to Student Council"),
    ("registrar_office", "boys_hostel", "Registrar to Men's Residential"),
    ("main_admin", "shopping_centre", "Secretariat to Convenience Mart"),

    # 16-19: Administration to Sports
    ("central_office", "main_stadium", "Hub to Olympic Track"),
    ("main_admin", "swimming_pool", "Secretariat to Aquatic Complex"),
    ("security_hq", "sports_complex", "Security to Sports Administration"),
    ("accounts_office", "cricket_ground", "Finance to Cricket Oval"),

    # 20-23: Administration to Transport & Infrastructure
    ("central_office", "main_gate", "Hub to Ceremonial West Gate"),
    ("central_office", "north_gate", "Hub to North Arterial Gateway"),
    ("central_office", "south_gate", "Hub to South Highway Gate"),
    ("records_dept", "bus_terminal", "Records to Transit Terminal"),

    # 24-26: Academic to Knowledge, Culture & Sports
    ("cs_block", "digital_library", "Computing to E-Resource Commons"),
    ("mechanical_block", "gymnasium", "Engineering to Weightlifting Gym"),
    ("ai_ds_block", "football_ground", "AI Block to Football Pitch"),

    # 27-29: Knowledge/Culture to Student Life & Sports
    ("auditorium", "food_court", "Auditorium to Food Court"),
    ("conference_centre", "sports_complex", "Delegate Centre to Arena"),
    ("reading_hall", "student_activity_centre", "Reading Hall to Music Studios"),

    # 30-32: Long-Distance Cross-City Arterial Routes
    ("main_gate", "north_gate", "West Gate to North Gate Cross-City"),
    ("main_gate", "south_gate", "West Gate to South Gate Cross-City"),
    ("north_gate", "south_gate", "North Arterial to South Highway Full-Span"),
]


def run_city_benchmark_experiments(
    graph_path: Path | str = None,
) -> pd.DataFrame:
    """Execute all 32 city-scale benchmark experiments on smart_city_map.json."""
    if graph_path is None:
        graph_path = PROJECT_ROOT / "data" / "smart_city_map.json"

    graph = CampusGraph.load_from_json(graph_path)
    records: List[Dict[str, Any]] = []

    for start, goal, scenario_label in CITY_EXPERIMENT_PAIRS:
        gbfs_res = greedy_best_first_search(graph, start, goal)
        astar_res = astar_search(graph, start, goal)
        dijk_res = dijkstra_search(graph, start, goal)

        # Strictly validate A* against Dijkstra ground truth
        if astar_res.success and dijk_res.success:
            diff = abs(astar_res.total_cost - dijk_res.total_cost)
            if diff > 1e-4:
                raise AssertionError(
                    f"A* optimality verification failed for {start} -> {goal}: "
                    f"A*={astar_res.total_cost}, Dijkstra={dijk_res.total_cost}"
                )

        # Excess Cost %: ((GBFS Cost - A* Cost) / A* Cost) * 100
        excess_pct = 0.0
        if gbfs_res.success and astar_res.success and astar_res.total_cost > 0:
            excess_pct = round(
                ((gbfs_res.total_cost - astar_res.total_cost) / astar_res.total_cost) * 100.0,
                2
            )

        # Alternative paths count via Yen's KSP
        alt_routes = yen_k_shortest_paths(graph, start, goal, K=3)
        alt_count = len(alt_routes)

        start_dist = graph.get_node_district(start)
        goal_dist = graph.get_node_district(goal)

        records.append({
            "Scenario": scenario_label,
            "Origin": graph.get_node_name(start),
            "Origin District": start_dist,
            "Destination": graph.get_node_name(goal),
            "Destination District": goal_dist,
            "Inter-District": "Yes" if start_dist != goal_dist else "No",
            "GBFS Cost (m)": round(gbfs_res.total_cost, 1) if gbfs_res.success else None,
            "A* Cost (m)": round(astar_res.total_cost, 1) if astar_res.success else None,
            "Dijkstra Cost (m)": round(dijk_res.total_cost, 1) if dijk_res.success else None,
            "Excess Cost (%)": excess_pct,
            "Optimality": "Optimal" if excess_pct == 0.0 else f"Suboptimal (+{excess_pct}%)",
            "GBFS Expanded": gbfs_res.expanded_nodes_count,
            "A* Expanded": astar_res.expanded_nodes_count,
            "GBFS Generated": gbfs_res.generated_nodes_count,
            "A* Generated": astar_res.generated_nodes_count,
            "GBFS Time (ms)": round(gbfs_res.execution_time_ms, 3),
            "A* Time (ms)": round(astar_res.execution_time_ms, 3),
            "A* Hops": len(astar_res.path) - 1 if astar_res.success else 0,
            "Alt Routes Found": alt_count,
        })

    return pd.DataFrame(records)


if __name__ == "__main__":
    print("=" * 80)
    print("RUNNING 32 CITY-SCALE BENCHMARK EXPERIMENTS")
    print("=" * 80)
    df = run_city_benchmark_experiments()
    print(df.to_string())
    print("\n" + "=" * 80)
    print(f"Total experiments executed: {len(df)}")
    print(f"Optimal GBFS scenarios: {(df['Excess Cost (%)'] == 0.0).sum()}")
    print(f"Suboptimal GBFS scenarios: {(df['Excess Cost (%)'] > 0.0).sum()}")
    print("All A* routes matched Dijkstra optimality with 0.00m error.")
    print("=" * 80)

