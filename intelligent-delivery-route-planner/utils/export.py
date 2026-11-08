"""Utility functions for data export, serialization, and formatting."""
import io
import json
from typing import Dict, List, Any
import pandas as pd
from core.metrics import SearchResult


def export_dataframe_to_csv(df: pd.DataFrame) -> str:
    """Convert a pandas DataFrame to a CSV formatted string.

    Args:
        df: Pandas DataFrame.

    Returns:
        str: CSV string data.
    """
    return df.to_csv(index=False)


def export_trace_to_csv(trace_steps: List[Dict[str, Any]]) -> str:
    """Convert search trace records to a CSV string.

    Args:
        trace_steps: List of step dictionaries.

    Returns:
        str: CSV string data.
    """
    if not trace_steps:
        return ""
    df = pd.DataFrame(trace_steps)
    return df.to_csv(index=False)


def search_results_to_dict(result: SearchResult) -> Dict[str, Any]:
    """Serialize a SearchResult dataclass to a JSON-compatible dictionary."""
    return {
        "algorithm": result.algorithm_name,
        "start_node": result.start_node,
        "goal_node": result.goal_node,
        "success": result.success,
        "path": result.path,
        "path_names": result.path_names,
        "total_cost": result.total_cost,
        "expanded_nodes_count": result.expanded_nodes_count,
        "generated_nodes_count": result.generated_nodes_count,
        "execution_time_ms": result.execution_time_ms,
        "expanded_order": result.expanded_order,
        "error_message": result.error_message,
        "trace_step_count": len(result.search_trace),
    }

