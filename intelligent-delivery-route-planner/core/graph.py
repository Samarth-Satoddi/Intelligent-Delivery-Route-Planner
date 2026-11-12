"""Graph representation and operations for the Intelligent Campus Delivery Route Planner.

Implements an adjacency-list based undirected/directed weighted graph
specifically tailored for campus navigation.
"""
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from .heuristic import HeuristicCalculator, euclidean_distance


class CampusGraph:
    """Represents the campus map as an adjacency-list weighted graph."""

    def __init__(self, metadata: Optional[Dict[str, Any]] = None):
        """Initialize an empty campus graph."""
        self.metadata: Dict[str, Any] = metadata or {
            "name": "Campus Graph",
            "unit": "metres",
            "default_start": "",
            "default_destinations": [],
        }
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.adjacency: Dict[str, List[Tuple[str, float]]] = {}
        self.edges_list: List[Dict[str, Any]] = []
        self._heuristic_calc: Optional[HeuristicCalculator] = None

    @classmethod
    def load_from_json(cls, filepath: str | Path) -> "CampusGraph":
        """Load a graph instance from a JSON file.

        Args:
            filepath: Path to the JSON file.

        Returns:
            CampusGraph: Loaded graph instance.
        """
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Campus map file not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return cls.from_dict(data)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CampusGraph":
        """Build a CampusGraph from a dictionary representation."""
        graph = cls(metadata=data.get("metadata", {}))

        # Add nodes
        for node in data.get("nodes", []):
            graph.add_node(
                node_id=node["id"],
                name=node.get("name", node["id"]),
                x=float(node["x"]),
                y=float(node["y"]),
                node_type=node.get("type", "junction"),
                description=node.get("description", ""),
                district=node.get("district", "General Campus"),
                z=float(node.get("z", 0.0)),
                building_width=float(node.get("building_width", 25.0)),
                building_depth=float(node.get("building_depth", 25.0)),
                building_height=float(node.get("building_height", 20.0)),
                navigation_category=node.get("navigation_category", node.get("type", "junction")),
            )

        # Add edges
        for edge in data.get("edges", []):
            dist = float(edge.get("distance_m", edge.get("distance", 1.0)))
            graph.add_edge(
                u=edge["source"],
                v=edge["target"],
                weight=dist,
                bidirectional=edge.get("bidirectional", True),
                path_type=edge.get("path_type", edge.get("road_type", "walkway")),
                road_type=edge.get("road_type", edge.get("path_type", "walkway")),
                road_width=float(edge.get("road_width", 8.0)),
                is_walkable=edge.get("is_walkable", True),
                road_geometry=edge.get("road_geometry"),
                district_connection=edge.get("district_connection", ""),
            )

        return graph

    def to_dict(self) -> Dict[str, Any]:
        """Convert graph into a JSON-serializable dictionary."""
        node_records = []
        for node_id, info in self.nodes.items():
            node_records.append({
                "id": node_id,
                "name": info["name"],
                "x": info["x"],
                "y": info["y"],
                "z": info.get("z", 0.0),
                "type": info["type"],
                "description": info.get("description", ""),
                "district": info.get("district", "General Campus"),
                "building_width": info.get("building_width", 25.0),
                "building_depth": info.get("building_depth", 25.0),
                "building_height": info.get("building_height", 20.0),
                "navigation_category": info.get("navigation_category", info["type"]),
            })

        return {
            "metadata": self.metadata,
            "nodes": node_records,
            "edges": self.edges_list,
        }

    def save_to_json(self, filepath: str | Path) -> None:
        """Save graph data to a JSON file."""
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)

    def add_node(
        self,
        node_id: str,
        name: str,
        x: float,
        y: float,
        node_type: str = "junction",
        description: str = "",
        district: str = "General Campus",
        z: float = 0.0,
        building_width: float = 25.0,
        building_depth: float = 25.0,
        building_height: float = 20.0,
        navigation_category: str = "",
    ) -> None:
        """Add a node representing a campus building or junction."""
        self.nodes[node_id] = {
            "id": node_id,
            "name": name,
            "x": float(x),
            "y": float(y),
            "z": float(z),
            "type": node_type,
            "description": description,
            "district": district,
            "building_width": float(building_width),
            "building_depth": float(building_depth),
            "building_height": float(building_height),
            "navigation_category": navigation_category or node_type,
        }
        if node_id not in self.adjacency:
            self.adjacency[node_id] = []
        self._heuristic_calc = None  # Invalidate cached calculator

    def add_edge(
        self,
        u: str,
        v: str,
        weight: float,
        bidirectional: bool = True,
        path_type: str = "walkway",
        road_type: str = "street",
        road_width: float = 8.0,
        is_walkable: bool = True,
        road_geometry: Optional[List[List[float]]] = None,
        district_connection: str = "",
    ) -> None:
        """Add a weighted edge between two nodes."""
        if u not in self.nodes:
            raise KeyError(f"Source node '{u}' does not exist in graph.")
        if v not in self.nodes:
            raise KeyError(f"Target node '{v}' does not exist in graph.")
        if weight <= 0:
            raise ValueError(f"Edge weight must be strictly positive, got {weight}")

        # Update adjacency list (avoiding duplicate edges)
        self.adjacency[u] = [item for item in self.adjacency[u] if item[0] != v]
        self.adjacency[u].append((v, weight))

        if bidirectional:
            self.adjacency[v] = [item for item in self.adjacency[v] if item[0] != u]
            self.adjacency[v].append((u, weight))

        if road_geometry is None:
            road_geometry = [
                [self.nodes[u]["x"], self.nodes[u]["y"]],
                [self.nodes[v]["x"], self.nodes[v]["y"]],
            ]

        self.edges_list.append({
            "source": u,
            "target": v,
            "distance": weight,
            "distance_m": weight,
            "bidirectional": bidirectional,
            "path_type": path_type,
            "road_type": road_type,
            "road_width": float(road_width),
            "is_walkable": bool(is_walkable),
            "road_geometry": road_geometry,
            "district_connection": district_connection,
        })

    def get_neighbors(self, node_id: str) -> List[Tuple[str, float]]:
        """Return list of (neighbor_id, weight) pairs for the given node."""
        return self.adjacency.get(node_id, [])

    def get_edge_cost(self, u: str, v: str) -> Optional[float]:
        """Return the transition cost from u to v, or None if unconnected."""
        for neighbor, weight in self.adjacency.get(u, []):
            if neighbor == v:
                return weight
        return None

    def get_node_coords(self, node_id: str) -> Tuple[float, float]:
        """Return (x, y) coordinates for a node in metres."""
        node = self.nodes[node_id]
        return float(node["x"]), float(node["y"])

    def get_node_name(self, node_id: str) -> str:
        """Return human-readable building/junction name."""
        return self.nodes.get(node_id, {}).get("name", node_id)

    def get_node_type(self, node_id: str) -> str:
        """Return node type ('start_office', 'destination', 'junction', etc.)."""
        return self.nodes.get(node_id, {}).get("type", "junction")

    def get_node_district(self, node_id: str) -> str:
        """Return district name for a node."""
        return self.nodes.get(node_id, {}).get("district", "General Campus")

    def get_districts(self) -> List[str]:
        """Return unique list of all districts represented in the graph."""
        if "districts" in self.metadata and self.metadata["districts"]:
            return list(self.metadata["districts"])
        districts = set()
        for info in self.nodes.values():
            if "district" in info:
                districts.add(info["district"])
        return sorted(list(districts))

    def get_start_node(self) -> str:
        """Return the default starting node ID (typically 'central_office')."""
        default_start = self.metadata.get("default_start")
        if default_start and default_start in self.nodes:
            return default_start
        for nid, info in self.nodes.items():
            if info.get("type") in ("start_office", "office"):
                return nid
        return next(iter(self.nodes.keys())) if self.nodes else ""

    def get_destinations(self) -> List[str]:
        """Return list of valid destination node IDs."""
        destinations = [
            nid for nid, info in self.nodes.items()
            if info.get("type") == "destination"
        ]
        if destinations:
            return destinations
        # Fallback to configured metadata list if present
        meta_dests = self.metadata.get("default_destinations", [])
        return [d for d in meta_dests if d in self.nodes]

    def get_heuristic_calculator(self) -> HeuristicCalculator:
        """Return a cached HeuristicCalculator instance for this graph."""
        if self._heuristic_calc is None:
            coord_map = {nid: (info["x"], info["y"]) for nid, info in self.nodes.items()}
            self._heuristic_calc = HeuristicCalculator(coord_map)
        return self._heuristic_calc

    def calculate_path_cost(self, path: List[str]) -> float:
        """Calculate total walking distance along an ordered list of nodes."""
        if not path or len(path) <= 1:
            return 0.0

        total = 0.0
        for i in range(len(path) - 1):
            cost = self.get_edge_cost(path[i], path[i + 1])
            if cost is None:
                raise ValueError(f"Disconnected path: No edge between '{path[i]}' and '{path[i+1]}'.")
            total += cost
        return round(total, 2)

    def is_valid_path(self, path: List[str], start: str, goal: str) -> bool:
        """Validate whether a path is continuous, connected, and connects start to goal."""
        if not path:
            return False
        if path[0] != start or path[-1] != goal:
            return False
        for i in range(len(path) - 1):
            if self.get_edge_cost(path[i], path[i + 1]) is None:
                return False
        return True

    def validate_admissibility_warnings(self) -> List[str]:
        """Check all edges to ensure edge_weight >= Euclidean straight-line distance."""
        warnings = []
        for edge in self.edges_list:
            u, v, dist = edge["source"], edge["target"], edge["distance"]
            if u in self.nodes and v in self.nodes:
                straight_line = euclidean_distance(
                    (self.nodes[u]["x"], self.nodes[u]["y"]),
                    (self.nodes[v]["x"], self.nodes[v]["y"])
                )
                if dist < (straight_line - 1e-4):
                    warnings.append(
                        f"Edge {u} <-> {v} distance ({dist}m) is less than straight-line Euclidean distance ({straight_line:.2f}m)!"
                    )
        return warnings

