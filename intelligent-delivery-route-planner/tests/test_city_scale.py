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
    assert stats["total_junctions"] >= 20, f"Expected at least 20 junctions, got {stats['total_junctions']}"
    assert 120 <= stats["total_road_connections"] <= 160, f"Expected 120-160 edges, got {stats['total_road_connections']}"
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
    # North Gate to South Gate spans the entire city (> 1000m)
    astar_res = astar_search(city_graph, "north_gate", "south_gate")
    assert astar_res.success is True
    assert astar_res.total_cost > 1000.0, f"Expected cross-city distance > 1000m, got {astar_res.total_cost}m"
    assert len(astar_res.path) >= 8, "Expected at least 8 hops for cross-city travel"
