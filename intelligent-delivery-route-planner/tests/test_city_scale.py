"""Automated Tests for City-Scale Graph, Yen's KSP Algorithm, and 30+ Experiments."""
import pytest
from pathlib import Path
from core.graph import CampusGraph
from core.graph_validator import validate_graph_integrity
from algorithms.yen_ksp import yen_k_shortest_paths
from algorithms.astar import astar_search
from algorithms.greedy import greedy_best_first_search
from algorithms.dijkstra import dijkstra_search
from experiments.city_experiments import run_city_benchmark_experiments

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CITY_MAP_PATH = DATA_DIR / "smart_city_map.json"


@pytest.fixture
def city_graph():
    assert CITY_MAP_PATH.exists(), "smart_city_map.json must exist in data directory"
    return CampusGraph.load_from_json(CITY_MAP_PATH)


def test_city_graph_topological_integrity(city_graph):
    """Verify that smart_city_map meets all city-scale requirements."""
    report = validate_graph_integrity(city_graph)
    assert report["is_valid"] is True, f"Validation errors: {report['errors']}"
    
    stats = report["statistics"]
    assert stats["total_locations"] == 51, f"Expected 51 named locations, got {stats['total_locations']}"
    assert stats["total_junctions"] >= 50, f"Expected at least 50 junctions, got {stats['total_junctions']}"
    assert 150 <= stats["total_road_connections"] <= 260, f"Expected 150-260 edges, got {stats['total_road_connections']}"
    assert stats["number_of_districts"] == 6, f"Expected 6 districts, got {stats['number_of_districts']}"
    assert stats["connected_components"] == 1, "Graph must have exactly 1 connected component"
    assert stats["path_diversity_checks_passed"] >= 10, "All major destinations must have at least 3 distinct paths"


def test_yen_k_shortest_paths_diversity(city_graph):
    """Test that Yen's K-Shortest Paths returns 3 distinct loopless alternative routes."""
    routes = yen_k_shortest_paths(city_graph, "central_office", "robotics_lab", K=3)
    assert len(routes) == 3, f"Expected 3 alternative routes, got {len(routes)}"

    # Ensure paths are distinct
    path_tuples = [tuple(r["path"]) for r in routes]
    assert len(set(path_tuples)) == 3, "All alternative routes must be distinct"

    # Ensure each path is valid on the graph
    for r in routes:
        assert city_graph.is_valid_path(r["path"], "central_office", "robotics_lab")
        assert r["total_distance_m"] > 0
        assert r["estimated_walking_minutes"] > 0
        assert len(r["districts_crossed"]) >= 2, "Path between Admin and Academic must cross at least 2 districts"


def test_city_benchmark_32_experiments_and_astar_optimality(city_graph):
    """Run all 32 city experiments and verify A* optimality against Dijkstra."""
    df = run_city_benchmark_experiments(CITY_MAP_PATH)
    assert len(df) == 32, f"Expected 32 experiments, got {len(df)}"

    # A* cost must match Dijkstra cost with 0.00m error for all 32 experiments
    for idx, row in df.iterrows():
        astar_cost = row["A* Cost (m)"]
        dijk_cost = row["Dijkstra Cost (m)"]
        assert abs(astar_cost - dijk_cost) < 1e-4, (
            f"Optimality mismatch in scenario '{row['Scenario']}': A*={astar_cost}, Dijkstra={dijk_cost}"
        )

    # Verify both optimal and suboptimal GBFS outcomes are demonstrated
    optimal_count = (df["Excess Cost (%)"] == 0.0).sum()
    suboptimal_count = (df["Excess Cost (%)"] > 0.0).sum()
    assert optimal_count > 0, "Suite must contain cases where GBFS is optimal"
    assert suboptimal_count > 0, "Suite must contain cases where GBFS is suboptimal"


def test_cross_district_long_distance_navigation(city_graph):
    """Verify long-distance route between opposite city gates."""
    # North Gate to South Gate spans the entire city (> 900m)
    astar_res = astar_search(city_graph, "north_gate", "south_gate")
    assert astar_res.success is True
    assert astar_res.total_cost >= 900.0, f"Expected cross-city distance >= 900m, got {astar_res.total_cost}m"
    assert len(astar_res.path) >= 8, "Expected at least 8 hops for cross-city travel"


def test_central_office_to_library_at_least_5_distinct_routes(city_graph):
    """Test requirement: Central Office to Central Library has at least 5-10 distinct feasible paths."""
    routes = yen_k_shortest_paths(city_graph, "central_office", "central_library", K=5)
    assert len(routes) >= 5, f"Expected at least 5 alternative routes, got {len(routes)}"

    path_tuples = [tuple(r["path"]) for r in routes]
    assert len(set(path_tuples)) == len(routes), "All alternative paths must be distinct"

    for r in routes:
        assert city_graph.is_valid_path(r["path"], "central_office", "central_library")
        assert r["total_distance_m"] > 0
        assert r["hops"] >= 2


def test_edge_vehicle_navigation_properties(city_graph):
    """Verify edge attributes for vehicle navigation (distance, road_type, speed_limit, vehicle_accessible)."""
    assert len(city_graph.edges_list) >= 200, f"Expected >= 200 edges, got {len(city_graph.edges_list)}"
    for edge in city_graph.edges_list:
        assert "distance_m" in edge or "distance" in edge
        assert "road_type" in edge
        assert edge.get("speed_limit_kmh", 0) > 0
        assert "vehicle_accessible" in edge
        assert edge["distance"] > 0


def test_route_api_five_stage_payload_integrity(city_graph):
    """Test data integrity required by the 5-stage interactive workflow."""
    gbfs_res = greedy_best_first_search(city_graph, "central_office", "central_library")
    astar_res = astar_search(city_graph, "central_office", "central_library")
    dijkstra_res = dijkstra_search(city_graph, "central_office", "central_library")
    alternatives = yen_k_shortest_paths(city_graph, "central_office", "central_library", K=5)

    # Stage 2: Authentic Search Traces
    assert len(astar_res.search_trace) > 0, "A* must produce search trace"
    assert len(gbfs_res.search_trace) > 0, "GBFS must produce search trace"
    for step in astar_res.search_trace:
        assert step.node is not None
        assert step.g >= 0.0
        assert step.h >= 0.0
        assert step.f >= 0.0
        assert step.action in ("expand", "goal_reached")
        assert step.frontier_size >= 0
        d = step.to_dict()
        assert "Node ID" in d and "g(n) [Cost so far]" in d

    # Stage 3: Optimality comparison & KSP alternatives
    assert astar_res.total_cost == dijkstra_res.total_cost
    assert len(alternatives) == 5, f"Expected 5 alternative routes, got {len(alternatives)}"

    # Stage 4 & 5: Road sequence and coordinates for vehicle movement
    for alt in alternatives:
        assert len(alt["path"]) >= 2
        assert alt["total_distance_m"] > 0
        for node_id in alt["path"]:
            coords = city_graph.get_node_coords(node_id)
            assert coords is not None
            assert len(coords) == 2


def test_acceptance_scenario_central_office_to_central_library(city_graph):
    """Verify exact acceptance scenario: Central Office to Central Library via Route 2."""
    alternatives = yen_k_shortest_paths(city_graph, "central_office", "central_library", K=5)
    assert len(alternatives) >= 2

    # Route 1: Shortest path (A* optimal)
    route_1 = alternatives[0]
    assert abs(route_1["total_distance_m"] - 307.5) < 1.0

    # Route 2: Alternative route via Admissions Centre and Roundabout
    route_2 = alternatives[1]
    assert route_2["path"] == [
        "central_office",
        "admissions_centre",
        "roundabout_central",
        "central_library",
    ]
    assert abs(route_2["total_distance_m"] - 317.8) < 1.0
    assert route_2["hops"] == 3


def test_suboptimal_vs_optimal_scenarios(city_graph):
    """Verify scenarios demonstrating A* optimality and GBFS suboptimality."""
    # Scenario 1: Central Office -> Computer Lab (GBFS takes greedy detour)
    gbfs_lab = greedy_best_first_search(city_graph, "central_office", "computer_lab")
    astar_lab = astar_search(city_graph, "central_office", "computer_lab")
    assert astar_lab.success and gbfs_lab.success
    assert gbfs_lab.total_cost > astar_lab.total_cost, (
        f"Expected GBFS cost ({gbfs_lab.total_cost}) > A* cost ({astar_lab.total_cost})"
    )
    excess_pct = ((gbfs_lab.total_cost - astar_lab.total_cost) / astar_lab.total_cost) * 100
    assert excess_pct > 5.0, f"Expected excess cost > 5%, got {excess_pct:.2f}%"

    # Scenario 2: Central Office -> Main Cafeteria (A* optimal)
    astar_cafe = astar_search(city_graph, "central_office", "main_cafeteria")
    dijk_cafe = dijkstra_search(city_graph, "central_office", "main_cafeteria")
    assert astar_cafe.total_cost == dijk_cafe.total_cost


