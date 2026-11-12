"""FastAPI Backend Server for Intelligent Delivery Route Planner.

Exposes RESTful endpoints connecting the frontend web interface with:
- Classical AI Search Algorithms (GBFS, A*, Dijkstra)
- Adjacency List Graph Engine and Euclidean Heuristics
- Argon2 + JWT Authentication and Session Management
- Audit Trail Persistence (Route History)
- Administrative Map Management
"""
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.graph import CampusGraph
from algorithms.greedy import greedy_best_first_search
from algorithms.astar import astar_search
from algorithms.dijkstra import dijkstra_search
from experiments.run_experiments import run_benchmark_experiments, compare_algorithms
from utils.export import search_results_to_dict

from database.connection import Base, engine, get_db
from database.models import User, RouteHistory
from auth.routes import router as auth_router
from auth.dependencies import get_current_active_user, require_admin, get_optional_user

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Intelligent Delivery Route Planner API",
    description="Enterprise 3D Campus Navigation Backend with Classical AI & RBAC Auth",
    version="2.0.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Authentication Router
app.include_router(auth_router)

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


class AdminAddNodeRequest(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    x: float
    y: float
    type: str = "junction"
    description: str = ""


class AdminAddEdgeRequest(BaseModel):
    source: str
    target: str
    distance: float = Field(..., gt=0)
    bidirectional: bool = True
    path_type: str = "walkway"


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
    """Return full graph structure (nodes, edges, metadata) for 3D/2D rendering."""
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
def compute_route(
    req: RouteRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Compute delivery route using requested algorithm(s), return metrics & trace, and log history."""
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

    gbfs_res = None
    astar_res = None

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

    # Comparative analytics
    gbfs_cost = gbfs_res.total_cost if (gbfs_res and gbfs_res.success) else None
    astar_cost = astar_res.total_cost if (astar_res and astar_res.success) else None
    is_optimal = True

    if gbfs_cost is not None and astar_cost is not None:
        cost_diff = round(gbfs_cost - astar_cost, 2)
        excess_pct = round(((cost_diff) / astar_cost * 100.0), 2) if astar_cost > 0 else 0.0
        is_optimal = (cost_diff <= 1e-4)

        response["comparison"] = {
            "gbfs_cost": gbfs_cost,
            "astar_cost": astar_cost,
            "cost_difference": cost_diff,
            "excess_cost_percent": excess_pct,
            "is_gbfs_optimal": is_optimal,
            "expanded_nodes_diff": gbfs_res.expanded_nodes_count - astar_res.expanded_nodes_count,
        }

    # Persist in RouteHistory if user is logged in
    if current_user:
        history_entry = RouteHistory(
            user_id=current_user.id,
            map_id=req.map_id,
            start_node=req.start_node,
            goal_node=req.goal_node,
            algorithm=req.algorithm,
            gbfs_cost=gbfs_cost,
            astar_cost=astar_cost,
            is_optimal=is_optimal,
        )
        db.add(history_entry)
        db.commit()

    return response


@app.get("/api/benchmarks")
def get_benchmarks() -> List[Dict[str, Any]]:
    """Execute complete benchmark suite across all maps and return comparative records."""
    df = run_benchmark_experiments(DATA_DIR)
    return df.to_dict(orient="records")


# --- Administrative Endpoints (Protected by require_admin) ---

@app.post("/api/admin/maps/{map_id}/node")
def admin_add_node(
    map_id: str,
    node: AdminAddNodeRequest,
    admin_user: User = Depends(require_admin),
):
    """Admin only: Add a campus landmark or junction to an active map."""
    graph = get_graph(map_id)
    graph.add_node(
        node_id=node.id,
        name=node.name,
        x=node.x,
        y=node.y,
        node_type=node.type,
        description=node.description,
    )
    file_path = MAP_REGISTRY[map_id]["path"]
    graph.save_to_json(file_path)
    return {"message": f"Node '{node.id}' added to {map_id}.", "node": node.model_dump()}


@app.post("/api/admin/maps/{map_id}/edge")
def admin_add_edge(
    map_id: str,
    edge: AdminAddEdgeRequest,
    admin_user: User = Depends(require_admin),
):
    """Admin only: Add a walkable path connection between two campus locations."""
    graph = get_graph(map_id)
    graph.add_edge(
        u=edge.source,
        v=edge.target,
        weight=edge.distance,
        bidirectional=edge.bidirectional,
        path_type=edge.path_type,
    )
    file_path = MAP_REGISTRY[map_id]["path"]
    graph.save_to_json(file_path)
    return {"message": f"Edge {edge.source} <-> {edge.target} added to {map_id}."}


@app.get("/api/admin/users")
def admin_list_users(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin only: List registered user accounts."""
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "history_count": len(u.route_history),
        }
        for u in users
    ]


# Mount frontend static files
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
FRONTEND_SRC = PROJECT_ROOT / "frontend"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/")
    @app.get("/index.html")
    def serve_frontend_dist():
        return FileResponse(FRONTEND_DIST / "index.html")

elif FRONTEND_SRC.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_SRC)), name="static")

    @app.get("/")
    def serve_frontend_src():
        return FileResponse(FRONTEND_SRC / "index.html")
