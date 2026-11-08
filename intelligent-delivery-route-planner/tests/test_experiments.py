"""Unit tests for experimental benchmarking and the misleading heuristic demonstration."""
import pytest
from pathlib import Path
from core.graph import CampusGraph
from algorithms.greedy import greedy_best_first_search
from algorithms.astar import astar_search
from experiments.run_experiments import compare_algorithms, run_benchmark_experiments


@pytest.fixture
def misleading_graph():
    data_path = Path(__file__).resolve().parent.parent / "data" / "misleading_map.json"
    return CampusGraph.load_from_json(data_path)


def test_misleading_heuristic_experiment_outcomes(misleading_graph):
    """Verify Section 8 requirements:

    Start S:
      - Connected to A with cost 1
      - Connected to B with cost 2
    A:
      - Connected to G with cost 100
    B:
      - Connected to G with cost 3
    S = (0, 0), A = (1, 0), B = (0, 2), G = (2, 0)

    Expected Outcomes:
      Greedy: S -> A -> G, Total cost = 101
      A*: S -> B -> G, Total cost = 5
    """
    gbfs_res = greedy_best_first_search(misleading_graph, "S", "G")
    astar_res = astar_search(misleading_graph, "S", "G")

    # 1. GBFS checks
    assert gbfs_res.success is True
    assert gbfs_res.path == ["S", "A", "G"]
    assert gbfs_res.total_cost == 101.0

    # 2. A* checks
    assert astar_res.success is True
    assert astar_res.path == ["S", "B", "G"]
    assert astar_res.total_cost == 5.0

    # 3. Excess cost demonstration
    comparison = compare_algorithms(misleading_graph, "S", "G", "Misleading Test")
    assert comparison["GBFS Cost (m)"] == 101.0
    assert comparison["A* Cost (m)"] == 5.0
    assert comparison["Excess Cost (%)"] == 1920.0
    assert "Suboptimal" in comparison["Optimality"]


def test_benchmark_experiments_dataframe_schema():
    """Verify the benchmark runner generates a DataFrame with all required reporting fields."""
    df = run_benchmark_experiments()
    assert not df.empty

    required_columns = [
        "Test Map",
        "Starting Node",
        "Goal Node",
        "GBFS Route",
        "GBFS Cost (m)",
        "A* Route",
        "A* Cost (m)",
        "Dijkstra Cost (m)",
        "GBFS Expanded Nodes",
        "A* Expanded Nodes",
        "GBFS Execution Time (ms)",
        "A* Execution Time (ms)",
        "Excess Cost (%)",
    ]

    for col in required_columns:
        assert col in df.columns, f"Missing required column: {col}"

    # Verify no row has NaN for total costs
    assert df["GBFS Cost (m)"].isna().sum() == 0
    assert df["A* Cost (m)"].isna().sum() == 0

