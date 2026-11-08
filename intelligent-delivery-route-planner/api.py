"""FastAPI Backend Server for Intelligent Delivery Route Planner.

Exposes RESTful endpoints connecting the frontend web interface with the
manual search algorithms (GBFS, A*, Dijkstra) and graph models.
"""
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from core.graph import CampusGraph
from algorithms.greedy import greedy_best_first_search
from algorithms.astar import astar_search
from algorithms.dijkstra import dijkstra_search
from experiments.run_experiments import run_benchmark_experiments, compare_algorithms
from utils.export import search_results_to_dict

app = FastAPI(
    title="Intelligent Delivery Route Planner API",
    description="Backend API for Classical AI Campus Navigation (GBFS & A*)",
    version="1.0.0",
)

# Enable CORS for seamless frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = PROJECT_ROOT / "data"
MAP_REGISTRY = {
    "campus_map": {
        "id": "campus_map",
        "name": "1. Normal Demonstration Campus Map",
        "path": DATA_DIR / "campus_map.json",
        "description": "Realistic 15-node campus with academic blocks, library, administrative offices, and exam cell.",
    },
    "alternative_paths_map": {
        "id": "alternative_paths_map",
        "name": "2. Alternative & Detour Campus Map",
        "path": DATA_DIR / "alternative_paths_map.json",
        "description": "Campus layout featuring winding scenic routes and longer alternative paths.",
    },
    "misleading_map": {
        "id": "misleading_map",
        "name": "3. Misleading Heuristic Trap Map",
        "path": DATA_DIR / "misleading_map.json",
        "description": "Section 8 theoretical trap demonstrating catastrophic failure of Greedy Best-First Search.",
    },
}

# Cache loaded graphs
_graph_cache: Dict[str, CampusGraph] = {}


def get_graph(map_id: str) -> CampusGraph:
    """Retrieve or load cached CampusGraph instance."""
    if map_id not in MAP_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Map dataset '{map_id}' not found.")
    if map_id not in _graph_cache:
        file_path = MAP_REGISTRY[map_id]["path"]
        _graph_cache[map_id] = CampusGraph.load_from_json(file_path)
    return _graph_cache[map_id]


class RouteRequest(BaseModel):
    map_id: str = "campus_map"
    start_node: str
    goal_node: str
    algorithm: str = "both"  # "gbfs", "astar", "both", "dijkstra"


@app.get("/api/maps")
def list_maps() -> List[Dict[str, Any]]:
    """Return list of available campus map datasets."""
    return [
        {
            "id": m["id"],
            "name": m["name"],
            "description": m["description"],
        }
        for m in MAP_REGISTRY.values()
    ]


@app.get("/api/map/{map_id}")
def get_map_data(map_id: str) -> Dict[str, Any]:
    """Return full graph structure (nodes, edges, metadata) for rendering."""
    graph = get_graph(map_id)
    return graph.to_dict()


@app.get("/api/heuristics")
def get_heuristics(
    map_id: str = Query("campus_map"),
    goal_node: str = Query(...),
) -> Dict[str, float]:
    """Compute straight-line Euclidean heuristic h(n) from all nodes to target goal."""
    graph = get_graph(map_id)
    h_calc = graph.get_heuristic_calculator()
    return h_calc.get_all_heuristics_for_goal(goal_node)


@app.post("/api/route")
def compute_route(req: RouteRequest) -> Dict[str, Any]:
    """Compute delivery route using requested algorithm(s) and return full trace & metrics."""
    graph = get_graph(req.map_id)

    if req.start_node not in graph.nodes:
        raise HTTPException(status_code=400, detail=f"Start node '{req.start_node}' not found.")
    if req.goal_node not in graph.nodes:
        raise HTTPException(status_code=400, detail=f"Goal node '{req.goal_node}' not found.")

    response: Dict[str, Any] = {
        "map_id": req.map_id,
        "start_node": req.start_node,
        "goal_node": req.goal_node,
        "start_name": graph.get_node_name(req.start_node),
        "goal_name": graph.get_node_name(req.goal_node),
    }

    if req.algorithm in ("gbfs", "both"):
        gbfs_res = greedy_best_first_search(graph, req.start_node, req.goal_node)
        response["gbfs"] = search_results_to_dict(gbfs_res)
        response["gbfs"]["search_trace"] = gbfs_res.trace_as_dicts()

    if req.algorithm in ("astar", "both"):
        astar_res = astar_search(graph, req.start_node, req.goal_node)
        response["astar"] = search_results_to_dict(astar_res)
        response["astar"]["search_trace"] = astar_res.trace_as_dicts()

    if req.algorithm == "dijkstra":
        dijk_res = dijkstra_search(graph, req.start_node, req.goal_node)
        response["dijkstra"] = search_results_to_dict(dijk_res)
        response["dijkstra"]["search_trace"] = dijk_res.trace_as_dicts()

    # If both algorithms ran, compute comparative delta
    if "gbfs" in response and "astar" in response:
        gbfs_cost = response["gbfs"]["total_cost"]
        astar_cost = response["astar"]["total_cost"]
        cost_diff = round(gbfs_cost - astar_cost, 2)
        excess_pct = round(((cost_diff) / astar_cost * 100.0), 2) if astar_cost > 0 else 0.0

        response["comparison"] = {
            "gbfs_cost": gbfs_cost,
            "astar_cost": astar_cost,
            "cost_difference": cost_diff,
            "excess_cost_percent": excess_pct,
            "is_gbfs_optimal": excess_pct == 0.0,
            "expanded_nodes_diff": response["gbfs"]["expanded_nodes_count"] - response["astar"]["expanded_nodes_count"],
        }

    return response


@app.get("/api/benchmarks")
def get_benchmarks() -> List[Dict[str, Any]]:
    """Execute complete benchmark suite across all maps and return comparative records."""
    df = run_benchmark_experiments(DATA_DIR)
    return df.to_dict(orient="records")


# Mount static frontend files
FRONTEND_DIR = PROJECT_ROOT / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    def serve_frontend():
        """Serve SPA index.html."""
        return FileResponse(FRONTEND_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)

