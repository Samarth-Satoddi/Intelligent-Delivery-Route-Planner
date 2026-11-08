"""Unit tests for A* Search and optimality verification."""
import pytest
from pathlib import Path
from core.graph import CampusGraph
from algorithms.astar import astar_search
from algorithms.dijkstra import dijkstra_search


@pytest.fixture
def all_test_graphs():
    base_path = Path(__file__).resolve().parent.parent / "data"
    graphs = {
        "campus": CampusGraph.load_from_json(base_path / "campus_map.json"),
        "alt": CampusGraph.load_from_json(base_path / "alternative_paths_map.json"),
        "misleading": CampusGraph.load_from_json(base_path / "misleading_map.json"),
    }
    return graphs


def test_astar_finds_valid_route_to_all_destinations(all_test_graphs):
    """Verify A* finds continuous, valid paths for all destinations in the campus map."""
    graph = all_test_graphs["campus"]
    start = graph.get_start_node()
    destinations = graph.get_destinations()

    for dest in destinations:
        result = astar_search(graph, start, dest)
        assert result.success is True, f"A* failed to reach {dest}: {result.error_message}"
        assert result.path[0] == start
        assert result.path[-1] == dest
        assert graph.is_valid_path(result.path, start, dest) is True
        assert result.total_cost > 0.0


def test_astar_optimality_matches_dijkstra_on_all_maps(all_test_graphs):
    """Verify that A* produces the identical optimal cost as Dijkstra across ALL test maps."""
    for map_name, graph in all_test_graphs.items():
        start = graph.get_start_node()
        destinations = graph.get_destinations()
        for dest in destinations:
            astar_res = astar_search(graph, start, dest)
            dijkstra_res = dijkstra_search(graph, start, dest)

            assert astar_res.success == dijkstra_res.success
            if astar_res.success:
                assert abs(astar_res.total_cost - dijkstra_res.total_cost) < 1e-4, (
                    f"Optimality mismatch on {map_name} ({start} -> {dest}): "
                    f"A* cost={astar_res.total_cost}, Dijkstra cost={dijkstra_res.total_cost}"
                )


def test_astar_start_equals_goal(all_test_graphs):
    """Verify A* handles the boundary condition where start == goal."""
    graph = all_test_graphs["campus"]
    start = graph.get_start_node()
    result = astar_search(graph, start, start)
    assert result.success is True
    assert result.path == [start]
    assert result.total_cost == 0.0
    assert result.expanded_nodes_count == 1


def test_astar_unreachable_destination():
    """Verify A* handles unreachable destinations cleanly."""
    graph = CampusGraph()
    graph.add_node("A", "Node A", 0.0, 0.0)
    graph.add_node("B", "Node B", 10.0, 0.0)
    graph.add_node("Isolated", "Isolated", 100.0, 100.0)
    graph.add_edge("A", "B", 10.0, bidirectional=True)

    result = astar_search(graph, "A", "Isolated")
    assert result.success is False
    assert result.path == []
    assert "unreachable" in result.error_message.lower()


def test_repeated_execution_state_isolation(all_test_graphs):
    """Verify that executing search repeatedly does not mutate or corrupt the graph or state."""
    graph = all_test_graphs["campus"]
    start = graph.get_start_node()
    dest = "library"

    res1 = astar_search(graph, start, dest)
    res2 = astar_search(graph, start, dest)
    res3 = astar_search(graph, start, dest)

    assert res1.path == res2.path == res3.path
    assert res1.total_cost == res2.total_cost == res3.total_cost
    assert res1.expanded_nodes_count == res2.expanded_nodes_count == res3.expanded_nodes_count


def test_astar_search_trace_evaluation_function(all_test_graphs):
    """Verify that every step in A* trace satisfies f(n) == g(n) + h(n)."""
    graph = all_test_graphs["campus"]
    result = astar_search(graph, "central_office", "department_office")
    for step in result.search_trace:
        expected_f = round(step.g + step.h, 2)
        assert abs(step.f - expected_f) < 1e-2

