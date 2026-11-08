"""Data structures for search results, traces, and metrics."""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class SearchTraceStep:
    """Represents one step in the search trace when a node is expanded."""
    step: int
    node: str
    node_name: str
    parent: Optional[str]
    g: float
    h: float
    f: float
    frontier_size: int
    action: str = "expand"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "Step": self.step,
            "Node ID": self.node,
            "Node Name": self.node_name,
            "Parent": self.parent if self.parent is not None else "None (Start)",
            "g(n) [Cost so far]": round(self.g, 2),
            "h(n) [Heuristic to Goal]": round(self.h, 2),
            "f(n) [Evaluation Function]": round(self.f, 2),
            "Frontier Size": self.frontier_size,
            "Action": self.action,
        }


@dataclass
class SearchResult:
    """Encapsulates the complete result of a path search algorithm run."""
    algorithm_name: str
    start_node: str
    goal_node: str
    success: bool
    path: List[str] = field(default_factory=list)
    path_names: List[str] = field(default_factory=list)
    total_cost: float = 0.0
    expanded_nodes_count: int = 0
    generated_nodes_count: int = 0
    execution_time_ms: float = 0.0
    expanded_order: List[str] = field(default_factory=list)
    search_trace: List[SearchTraceStep] = field(default_factory=list)
    error_message: Optional[str] = None

    def trace_as_dicts(self) -> List[Dict[str, Any]]:
        return [step.to_dict() for step in self.search_trace]

