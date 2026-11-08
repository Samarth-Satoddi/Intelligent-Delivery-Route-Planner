"""Interactive Plotly-based Campus Map and Route Visualizer.

Renders:
- Base campus map with buildings, junctions, and weighted pathways.
- Highlighted routes for GBFS and A* with distinct styling.
- Node inspection tooltips with coordinates, heuristic distances, and neighbor connections.
- Comparative metric charts for route distance, expanded nodes, and runtime.
"""
from typing import Dict, List, Optional, Tuple, Any
import plotly.graph_objects as go
from core.graph import CampusGraph
from core.metrics import SearchResult


class CampusVisualizer:
    """Generates interactive Plotly figures for campus map and route analysis."""

    COLOR_BG = "#0f172a"          # Slate 900
    COLOR_CARD = "#1e293b"        # Slate 800
    COLOR_EDGE = "#475569"        # Slate 600
    COLOR_JUNCTION = "#94a3b8"    # Slate 400
    COLOR_START = "#22c55e"       # Emerald 500
    COLOR_GOAL = "#ef4444"        # Red 500
    COLOR_DEST = "#f59e0b"        # Amber 500
    COLOR_GBFS = "#f97316"        # Orange 500
    COLOR_ASTAR = "#06b6d4"       # Cyan 500
    COLOR_OVERLAP = "#8b5cf6"     # Purple 500

    def __init__(self, graph: CampusGraph):
        self.graph = graph

    def create_map_figure(
        self,
        start_node: Optional[str] = None,
        goal_node: Optional[str] = None,
        gbfs_result: Optional[SearchResult] = None,
        astar_result: Optional[SearchResult] = None,
        show_edge_labels: bool = True,
    ) -> go.Figure:
        """Construct the interactive 2D campus map with optional route overlays."""
        fig = go.Figure()
        h_calc = self.graph.get_heuristic_calculator() if goal_node else None

        # 1. Draw base edges (walking paths)
        edge_x = []
        edge_y = []
        edge_mid_x = []
        edge_mid_y = []
        edge_mid_text = []

        drawn_edges = set()
        for edge in self.graph.edges_list:
            u, v, dist = edge["source"], edge["target"], edge["distance"]
            if u not in self.graph.nodes or v not in self.graph.nodes:
                continue

            pair_key = tuple(sorted([u, v]))
            if pair_key in drawn_edges:
                continue
            drawn_edges.add(pair_key)

            x0, y0 = self.graph.get_node_coords(u)
            x1, y1 = self.graph.get_node_coords(v)

            edge_x.extend([x0, x1, None])
            edge_y.extend([y0, y1, None])

            edge_mid_x.append((x0 + x1) / 2.0)
            edge_mid_y.append((y0 + y1) / 2.0)
            edge_mid_text.append(f"{dist:.0f}m")

        # Base edges trace
        fig.add_trace(go.Scatter(
            x=edge_x,
            y=edge_y,
            mode="lines",
            line=dict(color="#334155", width=2.5),
            hoverinfo="none",
            name="Walking Paths",
            showlegend=True,
        ))

        # Edge distance labels trace (if enabled)
        if show_edge_labels and edge_mid_x:
            fig.add_trace(go.Scatter(
                x=edge_mid_x,
                y=edge_mid_y,
                mode="text",
                text=edge_mid_text,
                textfont=dict(color="#94a3b8", size=10, family="monospace"),
                hoverinfo="none",
                name="Path Distances",
                showlegend=False,
            ))

        # 2. Draw GBFS Route overlay (if provided and valid)
        if gbfs_result and gbfs_result.success and len(gbfs_result.path) > 1:
            gbfs_x, gbfs_y = [], []
            for nid in gbfs_result.path:
                x, y = self.graph.get_node_coords(nid)
                gbfs_x.append(x)
                gbfs_y.append(y)

            # If A* also exists, offset slightly for distinct visual comparison
            offset = 1.5 if (astar_result and astar_result.success) else 0.0

            fig.add_trace(go.Scatter(
                x=[x - offset for x in gbfs_x],
                y=[y - offset for y in gbfs_y],
                mode="lines+markers",
                line=dict(color=self.COLOR_GBFS, width=5, dash="solid"),
                marker=dict(size=8, color=self.COLOR_GBFS),
                name=f"GBFS Route ({gbfs_result.total_cost:.1f}m)",
                hoverinfo="text",
                hovertext=[f"GBFS Step: {self.graph.get_node_name(nid)}" for nid in gbfs_result.path],
                showlegend=True,
            ))

        # 3. Draw A* Route overlay (if provided and valid)
        if astar_result and astar_result.success and len(astar_result.path) > 1:
            astar_x, astar_y = [], []
            for nid in astar_result.path:
                x, y = self.graph.get_node_coords(nid)
                astar_x.append(x)
                astar_y.append(y)

            offset = 1.5 if (gbfs_result and gbfs_result.success) else 0.0

            fig.add_trace(go.Scatter(
                x=[x + offset for x in astar_x],
                y=[y + offset for y in astar_y],
                mode="lines+markers",
                line=dict(color=self.COLOR_ASTAR, width=5, dash="dot"),
                marker=dict(size=8, color=self.COLOR_ASTAR),
                name=f"A* Route ({astar_result.total_cost:.1f}m)",
                hoverinfo="text",
                hovertext=[f"A* Step: {self.graph.get_node_name(nid)}" for nid in astar_result.path],
                showlegend=True,
            ))

        # 4. Group and render node categories
        node_categories = {
            "start": {"x": [], "y": [], "text": [], "color": self.COLOR_START, "symbol": "star", "size": 18, "name": "Start Location"},
            "goal": {"x": [], "y": [], "text": [], "color": self.COLOR_GOAL, "symbol": "diamond", "size": 18, "name": "Target Destination"},
            "destination": {"x": [], "y": [], "text": [], "color": self.COLOR_DEST, "symbol": "square", "size": 14, "name": "Destinations"},
            "junction": {"x": [], "y": [], "text": [], "color": self.COLOR_JUNCTION, "symbol": "circle", "size": 11, "name": "Campus Junctions"},
        }

        for nid, info in self.graph.nodes.items():
            x, y = info["x"], info["y"]
            name = info["name"]
            ntype = info.get("type", "junction")
            desc = info.get("description", "")

            # Heuristic info if goal is specified
            h_text = ""
            if h_calc and goal_node:
                try:
                    h_val = h_calc.h(nid, goal_node)
                    h_text = f"<br><b>h(n) to Goal:</b> {h_val:.2f} m"
                except Exception:
                    pass

            # Neighbors info
            neighbors = self.graph.get_neighbors(nid)
            nbr_text = ", ".join([f"{self.graph.get_node_name(nbr)} ({w:.0f}m)" for nbr, w in neighbors])

            hover = (
                f"<b>{name}</b> ({nid})<br>"
                f"<b>Type:</b> {ntype.replace('_', ' ').title()}<br>"
                f"<b>Coordinates:</b> ({x:.1f}, {y:.1f}){h_text}<br>"
                f"<b>Connections ({len(neighbors)}):</b><br>{nbr_text}<br>"
                f"<i>{desc}</i>"
            )

            # Classify category
            if nid == start_node:
                cat = "start"
            elif nid == goal_node:
                cat = "goal"
            elif ntype in ("destination", "office"):
                cat = "destination"
            else:
                cat = "junction"

            node_categories[cat]["x"].append(x)
            node_categories[cat]["y"].append(y)
            node_categories[cat]["text"].append(hover)

        for cat_key, cat_data in node_categories.items():
            if cat_data["x"]:
                fig.add_trace(go.Scatter(
                    x=cat_data["x"],
                    y=cat_data["y"],
                    mode="markers+text" if cat_key in ("start", "goal", "destination") else "markers",
                    text=[self.graph.get_node_name(nid) for nid in self.graph.nodes if (
                        (cat_key == "start" and nid == start_node) or
                        (cat_key == "goal" and nid == goal_node) or
                        (cat_key == "destination" and nid != start_node and nid != goal_node and self.graph.get_node_type(nid) in ("destination", "office"))
                    )],
                    textposition="top center",
                    textfont=dict(color="#f8fafc", size=11, family="sans-serif"),
                    marker=dict(
                        size=cat_data["size"],
                        color=cat_data["color"],
                        symbol=cat_data["symbol"],
                        line=dict(color="#ffffff", width=1.5),
                    ),
                    hoverinfo="text",
                    hovertext=cat_data["text"],
                    name=cat_data["name"],
                    showlegend=True,
                ))

        # Adjust layout with modern dark aesthetics
        fig.update_layout(
            paper_bgcolor=self.COLOR_BG,
            plot_bgcolor=self.COLOR_CARD,
            margin=dict(l=20, r=20, t=40, b=20),
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1,
                font=dict(color="#e2e8f0", size=11),
                bgcolor="rgba(30, 41, 59, 0.8)",
                bordercolor="#475569",
                borderwidth=1,
            ),
            xaxis=dict(
                showgrid=True,
                gridcolor="#334155",
                zeroline=False,
                color="#94a3b8",
                title="Campus X (metres)",
            ),
            yaxis=dict(
                showgrid=True,
                gridcolor="#334155",
                zeroline=False,
                color="#94a3b8",
                title="Campus Y (metres)",
                scaleanchor="x",
                scaleratio=1,
            ),
            hovermode="closest",
        )

        return fig

    @staticmethod
    def create_comparison_charts(gbfs_res: SearchResult, astar_res: SearchResult) -> Tuple[go.Figure, go.Figure, go.Figure]:
        """Generate three interactive comparative bar charts for Cost, Expansions, and Time."""
        algorithms = ["Greedy Best-First Search", "A* Search"]
        colors = ["#f97316", "#06b6d4"]

        # 1. Total Distance Chart
        cost_fig = go.Figure(data=[
            go.Bar(
                x=algorithms,
                y=[gbfs_res.total_cost, astar_res.total_cost],
                marker_color=colors,
                text=[f"{gbfs_res.total_cost:.1f} m", f"{astar_res.total_cost:.1f} m"],
                textposition="auto",
            )
        ])
        cost_fig.update_layout(
            title=dict(text="Total Route Cost (Metres)", font=dict(color="#f8fafc", size=14)),
            paper_bgcolor="#0f172a",
            plot_bgcolor="#1e293b",
            font=dict(color="#e2e8f0"),
            margin=dict(l=20, r=20, t=40, b=20),
            yaxis=dict(gridcolor="#334155", title="Distance (m)"),
            xaxis=dict(gridcolor="#334155"),
        )

        # 2. Nodes Expanded Chart
        nodes_fig = go.Figure(data=[
            go.Bar(
                x=algorithms,
                y=[gbfs_res.expanded_nodes_count, astar_res.expanded_nodes_count],
                marker_color=colors,
                text=[f"{gbfs_res.expanded_nodes_count} nodes", f"{astar_res.expanded_nodes_count} nodes"],
                textposition="auto",
            )
        ])
        nodes_fig.update_layout(
            title=dict(text="Nodes Expanded (Exploration)", font=dict(color="#f8fafc", size=14)),
            paper_bgcolor="#0f172a",
            plot_bgcolor="#1e293b",
            font=dict(color="#e2e8f0"),
            margin=dict(l=20, r=20, t=40, b=20),
            yaxis=dict(gridcolor="#334155", title="Expanded Count"),
            xaxis=dict(gridcolor="#334155"),
        )

        # 3. Execution Time Chart
        time_fig = go.Figure(data=[
            go.Bar(
                x=algorithms,
                y=[gbfs_res.execution_time_ms, astar_res.execution_time_ms],
                marker_color=colors,
                text=[f"{gbfs_res.execution_time_ms:.3f} ms", f"{astar_res.execution_time_ms:.3f} ms"],
                textposition="auto",
            )
        ])
        time_fig.update_layout(
            title=dict(text="Execution Time (Milliseconds)", font=dict(color="#f8fafc", size=14)),
            paper_bgcolor="#0f172a",
            plot_bgcolor="#1e293b",
            font=dict(color="#e2e8f0"),
            margin=dict(l=20, r=20, t=40, b=20),
            yaxis=dict(gridcolor="#334155", title="Time (ms)"),
            xaxis=dict(gridcolor="#334155"),
        )

        return cost_fig, nodes_fig, time_fig

