"""Unit tests for Greedy Best-First Search (GBFS)."""
import pytest
from pathlib import Path
from core.graph import CampusGraph
from algorithms.greedy import greedy_best_first_search


@pytest.fixture
def campus_graph():
    data_path = Path(__file__).resolve().parent.parent / "data" / "campus_map.json"
    return CampusGraph.load_from_json(data_path)


@pytest.fixture
def disconnected_graph():
    graph = CampusGraph()
    graph.add_node("A", "Node A", 0.0, 0.0)
    graph.add_node("B", "Node B", 10.0, 0.0)
    graph.add_node("Isolated", "Isolated Node", 50.0, 50.0)
    graph.add_edge("A", "B", 10.0, bidirectional=True)
    return graph


def test_gbfs_finds_valid_route_to_all_destinations(campus_graph):
    """Verify GBFS finds continuous, valid paths for all 5 required campus destinations."""
    start = campus_graph.get_start_node()
    destinations = campus_graph.get_destinations()
    assert len(destinations) >= 5

    for dest in destinations:
        result = greedy_best_first_search(campus_graph, start, dest)
        assert result.success is True, f"GBFS failed to reach {dest}: {result.error_message}"
        assert result.path[0] == start
        assert result.path[-1] == dest
        assert len(result.path) >= 2
        assert campus_graph.is_valid_path(result.path, start, dest) is True
        assert result.total_cost > 0.0
        assert result.expanded_nodes_count >= 1
        assert result.generated_nodes_count >= result.expanded_nodes_count


def test_gbfs_start_equals_goal(campus_graph):
    """Verify GBFS handles the boundary condition where start == goal."""
    start = campus_graph.get_start_node()
    result = greedy_best_first_search(campus_graph, start, start)
    assert result.success is True
    assert result.path == [start]
    assert result.total_cost == 0.0
    assert result.expanded_nodes_count == 1
    assert result.generated_nodes_count == 1


def test_gbfs_unreachable_destination(disconnected_graph):
    """Verify GBFS handles unreachable destinations cleanly without errors."""
    result = greedy_best_first_search(disconnected_graph, "A", "Isolated")
    assert result.success is False
    assert result.path == []
    assert result.total_cost == 0.0
    assert "unreachable" in result.error_message.lower()


def test_gbfs_invalid_nodes(campus_graph):
    """Verify GBFS returns an error when given non-existent node IDs."""
    result = greedy_best_first_search(campus_graph, "NON_EXISTENT_START", "library")
    assert result.success is False
    assert "not found" in result.error_message

    result2 = greedy_best_first_search(campus_graph, "central_office", "NON_EXISTENT_GOAL")
    assert result2.success is False
    assert "not found" in result2.error_message


def test_gbfs_search_trace_integrity(campus_graph):
    """Verify that search trace captures step numbers, heuristics, and frontier sizes."""
    result = greedy_best_first_search(campus_graph, "central_office", "library")
    assert len(result.search_trace) == result.expanded_nodes_count
    for i, step in enumerate(result.search_trace, 1):
        assert step.step == i
        assert step.node in campus_graph.nodes
        assert step.h >= 0.0
        assert step.f == step.h  # GBFS evaluation function

