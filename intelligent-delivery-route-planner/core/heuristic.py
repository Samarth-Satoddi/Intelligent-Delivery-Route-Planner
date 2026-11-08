"""Euclidean Heuristic calculations and admissibility validation.

Mathematical Formulation:
Euclidean Distance:
    h(n) = sqrt((x_n - x_goal)^2 + (y_n - y_goal)^2)

Admissibility Theorem:
A heuristic h(n) is admissible if for all nodes n, h(n) <= h*(n), where h*(n)
is the true minimal cost to reach the goal from n. In 2D Euclidean space:
1. The shortest distance between any two points in R^2 is the straight-line segment.
2. In our campus graph, every edge weight w(u, v) is defined such that
   w(u, v) >= EuclideanDistance(pos(u), pos(v)).
3. By the triangle inequality of Euclidean space:
   EuclideanDistance(u, goal) <= sum_{e in path} EuclideanDistance(e) <= sum_{e in path} w(e)
Therefore, h(n) is guaranteed to never overestimate the true walking distance h*(n).
"""
import math
from typing import Dict, Tuple, List, Optional


def euclidean_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates the 2D Euclidean distance between two coordinate tuples (x, y).

    Args:
        coord1: (x1, y1) coordinates in metres.
        coord2: (x2, y2) coordinates in metres.

    Returns:
        float: Straight-line Euclidean distance in metres.
    """
    dx = float(coord1[0] - coord2[0])
    dy = float(coord1[1] - coord2[1])
    return math.hypot(dx, dy)


class HeuristicCalculator:
    """Manages heuristic calculations for graph nodes based on coordinates."""

    def __init__(self, coordinates: Dict[str, Tuple[float, float]]):
        """Initialize calculator with node coordinates.

        Args:
            coordinates: Mapping from node_id to (x, y) coordinates.
        """
        self.coordinates: Dict[str, Tuple[float, float]] = coordinates

    def h(self, current_node: str, goal_node: str) -> float:
        """Compute the Euclidean heuristic from current_node to goal_node.

        Args:
            current_node: ID of the current node.
            goal_node: ID of the goal node.

        Returns:
            float: Euclidean distance in metres.

        Raises:
            KeyError: If either node is not found in the coordinate map.
        """
        if current_node == goal_node:
            return 0.0

        if current_node not in self.coordinates:
            raise KeyError(f"Node '{current_node}' not found in coordinate map.")
        if goal_node not in self.coordinates:
            raise KeyError(f"Goal node '{goal_node}' not found in coordinate map.")

        return euclidean_distance(
            self.coordinates[current_node],
            self.coordinates[goal_node]
        )

    def get_all_heuristics_for_goal(self, goal_node: str) -> Dict[str, float]:
        """Compute heuristic values from all known nodes to the target goal node.

        Args:
            goal_node: Target goal node ID.

        Returns:
            Dict[str, float]: Node ID mapped to its heuristic distance to goal.
        """
        return {
            node_id: round(self.h(node_id, goal_node), 2)
            for node_id in self.coordinates
        }

    def verify_edge_admissibility(self, u: str, v: str, edge_weight: float) -> Tuple[bool, float, float]:
        """Verifies that an edge's weight is at least its straight-line distance.

        Args:
            u: First node ID.
            v: Second node ID.
            edge_weight: Declared graph distance along the path.

        Returns:
            Tuple[bool, float, float]: (is_valid, straight_line_dist, edge_weight)
        """
        c_u = self.coordinates[u]
        c_v = self.coordinates[v]
        straight_dist = euclidean_distance(c_u, c_v)
        is_valid = edge_weight >= (straight_dist - 1e-6)
        return is_valid, straight_dist, edge_weight

