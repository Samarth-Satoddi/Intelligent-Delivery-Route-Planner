"""Unit tests for the Euclidean heuristic function and admissibility guarantees."""
import pytest
import math
from pathlib import Path
from core.graph import CampusGraph
from core.heuristic import euclidean_distance, HeuristicCalculator
from algorithms.dijkstra import dijkstra_search


@pytest.fixture
def campus_graph():
    data_path = Path(__file__).resolve().parent.parent / "data" / "campus_map.json"
    return CampusGraph.load_from_json(data_path)


def test_euclidean_distance_calculation():
    """Verify standard geometric Euclidean distance values."""
    assert euclidean_distance((0.0, 0.0), (3.0, 4.0)) == 5.0
    assert euclidean_distance((0.0, 0.0), (0.0, 0.0)) == 0.0
    assert abs(euclidean_distance((1.0, 2.0), (4.0, 6.0)) - 5.0) < 1e-6


def test_heuristic_calculator_properties(campus_graph):
    """Verify non-negativity and self-distance of 0 for all nodes."""
    h_calc = campus_graph.get_heuristic_calculator()
    for u in campus_graph.nodes:
        # Distance to self must be 0
        assert h_calc.h(u, u) == 0.0
        for v in campus_graph.nodes:
            h_val = h_calc.h(u, v)
            assert h_val >= 0.0
            # Symmetry: h(u, v) == h(v, u)
            assert abs(h_val - h_calc.h(v, u)) < 1e-6


def test_campus_graph_edge_weights_admissibility(campus_graph):
    """Verify every edge weight in the campus map is >= straight-line Euclidean distance."""
    warnings = campus_graph.validate_admissibility_warnings()
    assert len(warnings) == 0, f"Graph has edges violating Euclidean lower bound: {warnings}"


def test_heuristic_global_admissibility_against_dijkstra(campus_graph):
    """Verify that h(u, goal) <= true_minimal_distance(u, goal) for all node pairs."""
    h_calc = campus_graph.get_heuristic_calculator()
    nodes = list(campus_graph.nodes.keys())

    for u in nodes:
        for v in nodes:
            h_estimate = h_calc.h(u, v)
            dijkstra_res = dijkstra_search(campus_graph, u, v)
            assert dijkstra_res.success is True
            true_distance = dijkstra_res.total_cost

            assert h_estimate <= (true_distance + 1e-4), (
                f"Heuristic overestimation violation! h({u}, {v})={h_estimate:.2f} "
                f"> True Shortest Path={true_distance:.2f}"
            )


def test_heuristic_consistency_triangle_inequality(campus_graph):
    """Verify monotonicity / consistency: h(u, goal) <= c(u, v) + h(v, goal)."""
    h_calc = campus_graph.get_heuristic_calculator()
    destinations = campus_graph.get_destinations()

    for goal in destinations:
        for u in campus_graph.nodes:
            h_u = h_calc.h(u, goal)
            for v, weight in campus_graph.get_neighbors(u):
                h_v = h_calc.h(v, goal)
                # Triangle inequality condition for consistency
                assert h_u <= (weight + h_v + 1e-4), (
                    f"Consistency violation for goal {goal}: h({u})={h_u} > "
                    f"c({u},{v})={weight} + h({v})={h_v}"
                )

