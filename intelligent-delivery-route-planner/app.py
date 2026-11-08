"""INTELLIGENT DELIVERY ROUTE PLANNER
AI-Based Campus Navigation Using Greedy Best-First Search and A*

A complete, production-grade Streamlit application for classical AI path planning,
experimental benchmarking, and algorithmic comparison.
"""
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from core.graph import CampusGraph
from algorithms.greedy import greedy_best_first_search
from algorithms.astar import astar_search
from algorithms.dijkstra import dijkstra_search
from visualization.campus_visualizer import CampusVisualizer
from experiments.run_experiments import run_benchmark_experiments, compare_algorithms
from utils.export import export_dataframe_to_csv, export_trace_to_csv

# Page configuration
st.set_page_config(
    page_title="Intelligent Delivery Route Planner",
    page_icon="🚚",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling (CSS)
st.markdown("""
<style>
    /* Metric cards styling */
    .metric-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .metric-card-title {
        color: #94a3b8;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
    }
    .metric-card-value {
        color: #f8fafc;
        font-size: 1.6rem;
        font-weight: 700;
    }
    .metric-card-sub {
        color: #64748b;
        font-size: 0.8rem;
        margin-top: 4px;
    }

    /* Algorithm badges */
    .badge-gbfs {
        background: rgba(249, 115, 22, 0.15);
        border: 1px solid #f97316;
        color: #f97316;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        display: inline-block;
    }
    .badge-astar {
        background: rgba(6, 182, 212, 0.15);
        border: 1px solid #06b6d4;
        color: #06b6d4;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        display: inline-block;
    }
    .badge-optimal {
        background: rgba(34, 197, 94, 0.15);
        border: 1px solid #22c55e;
        color: #22c55e;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        display: inline-block;
    }
    .badge-suboptimal {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid #ef4444;
        color: #ef4444;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        display: inline-block;
    }

    /* Callout notice boxes */
    .info-callout {
        background: #0f172a;
        border-left: 4px solid #38bdf8;
        padding: 12px 16px;
        border-radius: 4px 8px 8px 4px;
        margin: 12px 0;
        color: #e2e8f0;
    }
</style>
""", unsafe_allow_html=True)


# Data paths
DATA_DIR = PROJECT_ROOT / "data"
MAP_FILES = {
    "1. Normal Campus Map": DATA_DIR / "campus_map.json",
    "2. Alternative & Detour Map": DATA_DIR / "alternative_paths_map.json",
    "3. Misleading Heuristic Trap Map": DATA_DIR / "misleading_map.json",
}


@st.cache_data
def load_graph_cached(filepath: str) -> CampusGraph:
    """Load and cache graph object."""
    return CampusGraph.load_from_json(filepath)


# Initialize Session State
if "selected_map_name" not in st.session_state:
    st.session_state["selected_map_name"] = "1. Normal Campus Map"
if "gbfs_res" not in st.session_state:
    st.session_state["gbfs_res"] = None
if "astar_res" not in st.session_state:
    st.session_state["astar_res"] = None
if "last_query" not in st.session_state:
    st.session_state["last_query"] = (None, None)
if "benchmark_df" not in st.session_state:
    st.session_state["benchmark_df"] = None


# Sidebar Navigation & Controls
st.sidebar.image("https://img.icons8.com/isometric/100/delivery-settings.png", width=64)
st.sidebar.title("Campus Delivery AI")
st.sidebar.caption("Intelligent Route Planning System")

st.sidebar.markdown("---")
nav_choice = st.sidebar.radio(
    "Navigation Menu",
    [
        "1. Dashboard",
        "2. Campus Map",
        "3. Route Planner",
        "4. Algorithm Comparison",
        "5. Search Trace",
        "6. Experimental Results",
        "7. About & Complexity",
    ],
    index=0,
)

st.sidebar.markdown("---")
st.sidebar.subheader("Active Campus Map")
selected_map = st.sidebar.selectbox(
    "Select Graph Dataset",
    list(MAP_FILES.keys()),
    index=list(MAP_FILES.keys()).index(st.session_state["selected_map_name"]),
)

if selected_map != st.session_state["selected_map_name"]:
    st.session_state["selected_map_name"] = selected_map
    st.session_state["gbfs_res"] = None
    st.session_state["astar_res"] = None
    st.session_state["last_query"] = (None, None)

# Load the selected graph
graph_path = MAP_FILES[st.session_state["selected_map_name"]]
current_graph = load_graph_cached(str(graph_path))
visualizer = CampusVisualizer(current_graph)

st.sidebar.caption(f"**Loaded:** {current_graph.metadata.get('name', 'Campus Map')}")
st.sidebar.caption(f"**Nodes:** {len(current_graph.nodes)} | **Paths:** {len(current_graph.edges_list)}")

st.sidebar.markdown("---")
show_edge_labels = st.sidebar.checkbox("Show Edge Distances on Map", value=True)


# Header
col_head1, col_head2 = st.columns([4, 1])
with col_head1:
    st.title("INTELLIGENT DELIVERY ROUTE PLANNER")
    st.caption("AI-Based Campus Navigation Using Greedy Best-First Search and A* Search")
with col_head2:
    st.markdown("""
    <div style="text-align: right; padding-top: 10px;">
        <span class="badge-gbfs">GBFS: f(n)=h(n)</span><br>
        <span class="badge-astar" style="margin-top:6px;">A*: f(n)=g(n)+h(n)</span>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")


# ==============================================================================
# VIEW 1: DASHBOARD
# ==============================================================================
if nav_choice == "1. Dashboard":
    st.subheader("System Overview & Campus Logistics Dashboard")

    st.markdown("""
    Welcome to the **Intelligent Delivery Route Planner**. This autonomous dispatch system
    computes walking routes for delivery personnel starting from the **Central Office** to key campus
    wings, faculty offices, auditoriums, and examination centers.
    """)

    # Top metric cards
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-card-title">Campus Locations</div>
            <div class="metric-card-value">{len(current_graph.nodes)}</div>
            <div class="metric-card-sub">Buildings & Junctions</div>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-card-title">Interconnected Paths</div>
            <div class="metric-card-value">{len(current_graph.edges_list)}</div>
            <div class="metric-card-sub">Bidirectional Walkways</div>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-card-title">Target Destinations</div>
            <div class="metric-card-value">{len(current_graph.get_destinations())}</div>
            <div class="metric-card-sub">Offices, Labs, Libraries</div>
        </div>
        """, unsafe_allow_html=True)
    with col4:
        default_start_id = current_graph.get_start_node()
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-card-title">Primary Dispatch Hub</div>
            <div class="metric-card-value">{current_graph.get_node_name(default_start_id)}</div>
            <div class="metric-card-sub">Node ID: {default_start_id}</div>
        </div>
        """, unsafe_allow_html=True)

    # Core algorithms overview
    st.markdown("### Algorithmic Foundations")
    col_a1, col_a2 = st.columns(2)

    with col_a1:
        st.markdown("""
        <div class="metric-card" style="border-top: 3px solid #f97316;">
            <div style="font-size: 1.1rem; font-weight: 700; color: #f97316;">1. Greedy Best-First Search (GBFS)</div>
            <div style="margin: 8px 0; color: #cbd5e1; font-family: monospace;"><b>Evaluation Function:</b> f(n) = h(n)</div>
            <p style="color: #94a3b8; font-size: 0.9rem;">
                GBFS prioritizes nodes solely on their estimated remaining straight-line distance to the target.
                While rapid in benign topologies, it completely ignores the cumulative path cost <code>g(n)</code>
                incurred so far, leaving it vulnerable to detours and dead ends.
            </p>
            <ul style="color: #cbd5e1; font-size: 0.85rem;">
                <li><b>Priority queue:</b> Smallest Euclidean heuristic value</li>
                <li><b>Optimality:</b> NOT guaranteed (can be severely suboptimal)</li>
                <li><b>Primary advantage:</b> Often expands fewer nodes in direct open corridors</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

    with col_a2:
        st.markdown("""
        <div class="metric-card" style="border-top: 3px solid #06b6d4;">
            <div style="font-size: 1.1rem; font-weight: 700; color: #06b6d4;">2. A* Search Algorithm</div>
            <div style="margin: 8px 0; color: #cbd5e1; font-family: monospace;"><b>Evaluation Function:</b> f(n) = g(n) + h(n)</div>
            <p style="color: #94a3b8; font-size: 0.9rem;">
                A* balances exact distance traveled <code>g(n)</code> with estimated remaining distance <code>h(n)</code>.
                With an admissible and consistent Euclidean heuristic, A* is mathematically guaranteed to find the
                minimal-cost (shortest walking distance) route.
            </p>
            <ul style="color: #cbd5e1; font-size: 0.85rem;">
                <li><b>Priority queue:</b> Smallest total estimated route cost</li>
                <li><b>Optimality:</b> Guaranteed optimal with admissible heuristic</li>
                <li><b>Pruning:</b> Re-evaluates paths when lower-cost routes emerge</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

    # Campus map overview preview
    st.markdown("### Interactive Campus Map Overview")
    fig = visualizer.create_map_figure(
        start_node=current_graph.get_start_node(),
        show_edge_labels=show_edge_labels,
    )
    st.plotly_chart(fig, use_container_width=True)


# ==============================================================================
# VIEW 2: CAMPUS MAP
# ==============================================================================
elif nav_choice == "2. Campus Map":
    st.subheader("Interactive Campus Graph Inspector")
    st.markdown("""
    Explore campus buildings, connecting pedestrian corridors, and junctions.
    Hover over any node to view its coordinates, connected paths, and Euclidean heuristic values.
    """)

    col_ctrl1, col_ctrl2 = st.columns(2)
    with col_ctrl1:
        inspected_goal = st.selectbox(
            "Inspect Heuristic Distances h(n) to Destination:",
            list(current_graph.nodes.keys()),
            index=list(current_graph.nodes.keys()).index(current_graph.get_destinations()[0]) if current_graph.get_destinations() else 0,
            format_func=lambda nid: f"{current_graph.get_node_name(nid)} ({nid})"
        )
    with col_ctrl2:
        inspected_start = st.selectbox(
            "Focus Starting Point:",
            list(current_graph.nodes.keys()),
            index=list(current_graph.nodes.keys()).index(current_graph.get_start_node()),
            format_func=lambda nid: f"{current_graph.get_node_name(nid)} ({nid})"
        )

    fig = visualizer.create_map_figure(
        start_node=inspected_start,
        goal_node=inspected_goal,
        show_edge_labels=show_edge_labels,
    )
    st.plotly_chart(fig, use_container_width=True)

    # Heuristic and connectivity table
    st.markdown("### Location Directory & Precomputed Heuristic Values")
    h_calc = current_graph.get_heuristic_calculator()
    node_rows = []
    for nid, info in current_graph.nodes.items():
        h_val = h_calc.h(nid, inspected_goal)
        nbrs = current_graph.get_neighbors(nid)
        node_rows.append({
            "Node ID": nid,
            "Name": info["name"],
            "Type": info.get("type", "").replace("_", " ").title(),
            "X (m)": info["x"],
            "Y (m)": info["y"],
            f"h(n) to '{current_graph.get_node_name(inspected_goal)}' (m)": round(h_val, 2),
            "Connected Paths": len(nbrs),
            "Description": info.get("description", ""),
        })

    node_df = pd.DataFrame(node_rows)
    st.dataframe(node_df, use_container_width=True)


# ==============================================================================
# VIEW 3: ROUTE PLANNER
# ==============================================================================
elif nav_choice == "3. Route Planner":
    st.subheader("Campus Delivery Route Planning & Execution")

    col_in1, col_in2 = st.columns(2)
    node_keys = list(current_graph.nodes.keys())
    default_start = current_graph.get_start_node()
    dest_keys = current_graph.get_destinations()
    default_goal = dest_keys[0] if dest_keys else node_keys[-1]

    with col_in1:
        start_select = st.selectbox(
            "Starting Location (Dispatch Hub):",
            node_keys,
            index=node_keys.index(default_start) if default_start in node_keys else 0,
            format_func=lambda nid: f"{current_graph.get_node_name(nid)} [{nid}]"
        )
    with col_in2:
        goal_select = st.selectbox(
            "Target Delivery Destination:",
            node_keys,
            index=node_keys.index(default_goal) if default_goal in node_keys else (len(node_keys) - 1),
            format_func=lambda nid: f"{current_graph.get_node_name(nid)} [{nid}]"
        )

    # Execution Buttons
    col_btn1, col_btn2, col_btn3 = st.columns(3)
    with col_btn1:
        run_gbfs_btn = st.button("🚀 Run Greedy Best-First Search", use_container_width=True)
    with col_btn2:
        run_astar_btn = st.button("⭐ Run A* Search (Optimal)", use_container_width=True)
    with col_btn3:
        run_both_btn = st.button("⚖️ Run Both Algorithms", use_container_width=True)

    if run_gbfs_btn:
        st.session_state["gbfs_res"] = greedy_best_first_search(current_graph, start_select, goal_select)
        st.session_state["astar_res"] = None
        st.session_state["last_query"] = (start_select, goal_select)
    elif run_astar_btn:
        st.session_state["astar_res"] = astar_search(current_graph, start_select, goal_select)
        st.session_state["gbfs_res"] = None
        st.session_state["last_query"] = (start_select, goal_select)
    elif run_both_btn:
        st.session_state["gbfs_res"] = greedy_best_first_search(current_graph, start_select, goal_select)
        st.session_state["astar_res"] = astar_search(current_graph, start_select, goal_select)
        st.session_state["last_query"] = (start_select, goal_select)

    # If results exist in session state for current map
    gbfs_res = st.session_state["gbfs_res"]
    astar_res = st.session_state["astar_res"]

    # Display Route Map
    map_fig = visualizer.create_map_figure(
        start_node=start_select,
        goal_node=goal_select,
        gbfs_result=gbfs_res,
        astar_result=astar_res,
        show_edge_labels=show_edge_labels,
    )
    st.plotly_chart(map_fig, use_container_width=True)

    # Results Scorecard
    if gbfs_res or astar_res:
        st.markdown("### Execution Results Summary")
        col_res1, col_res2 = st.columns(2)

        with col_res1:
            if gbfs_res:
                st.markdown(f"""
                <div class="metric-card" style="border-top: 3px solid #f97316;">
                    <div class="metric-card-title"><span class="badge-gbfs">Greedy Best-First Search</span></div>
                    <div class="metric-card-value">{gbfs_res.total_cost:.1f} m</div>
                    <div style="margin: 8px 0; color: #e2e8f0;">
                        <b>Status:</b> {"✅ Route Found" if gbfs_res.success else "❌ Unreachable"}<br>
                        <b>Nodes Expanded:</b> {gbfs_res.expanded_nodes_count}<br>
                        <b>Nodes Generated:</b> {gbfs_res.generated_nodes_count}<br>
                        <b>Execution Time:</b> {gbfs_res.execution_time_ms:.3f} ms
                    </div>
                    <div style="font-size: 0.85rem; color: #94a3b8; word-break: break-all;">
                        <b>Route:</b> {" ➔ ".join(gbfs_res.path_names)}
                    </div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.info("Greedy Best-First Search has not been executed for this query.")

        with col_res2:
            if astar_res:
                st.markdown(f"""
                <div class="metric-card" style="border-top: 3px solid #06b6d4;">
                    <div class="metric-card-title"><span class="badge-astar">A* Search (Optimal)</span></div>
                    <div class="metric-card-value">{astar_res.total_cost:.1f} m</div>
                    <div style="margin: 8px 0; color: #e2e8f0;">
                        <b>Status:</b> {"✅ Route Found" if astar_res.success else "❌ Unreachable"}<br>
                        <b>Nodes Expanded:</b> {astar_res.expanded_nodes_count}<br>
                        <b>Nodes Generated:</b> {astar_res.generated_nodes_count}<br>
                        <b>Execution Time:</b> {astar_res.execution_time_ms:.3f} ms
                    </div>
                    <div style="font-size: 0.85rem; color: #94a3b8; word-break: break-all;">
                        <b>Route:</b> {" ➔ ".join(astar_res.path_names)}
                    </div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.info("A* Search has not been executed for this query.")

        # If both are executed, show delta comparison
        if gbfs_res and astar_res and gbfs_res.success and astar_res.success:
            cost_diff = gbfs_res.total_cost - astar_res.total_cost
            pct_diff = ((cost_diff) / astar_res.total_cost * 100.0) if astar_res.total_cost > 0 else 0.0

            if cost_diff > 1e-4:
                st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #ef4444;">
                    <span class="badge-suboptimal">Suboptimal GBFS Decision Detected</span>
                    <p style="margin-top: 8px; color: #f8fafc;">
                        GBFS selected a path that is <b>{cost_diff:.1f} metres longer (+{pct_diff:.2f}% excess walking distance)</b>
                        than A*. Greedy prioritized nodes that appeared locally closer according to the Euclidean heuristic,
                        falling into a detour trap.
                    </p>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid #22c55e;">
                    <span class="badge-optimal">Both Algorithms Found Optimal Route</span>
                    <p style="margin-top: 8px; color: #f8fafc;">
                        Both GBFS and A* produced the optimal path cost of <b>{astar_res.total_cost:.1f} metres</b>.
                        Compare their node expansions in the <b>Algorithm Comparison</b> tab to evaluate search efficiency.
                    </p>
                </div>
                """, unsafe_allow_html=True)


# ==============================================================================
# VIEW 4: ALGORITHM COMPARISON
# ==============================================================================
elif nav_choice == "4. Algorithm Comparison":
    st.subheader("Side-by-Side Algorithmic Performance Comparison")

    gbfs_res = st.session_state["gbfs_res"]
    astar_res = st.session_state["astar_res"]

    if not (gbfs_res and astar_res):
        st.warning("Please run **Both Algorithms** from the **Route Planner** tab to view side-by-side comparative analytics.")
        if st.button("Run Both Algorithms on Default Route Now"):
            start_node = current_graph.get_start_node()
            goal_node = current_graph.get_destinations()[0] if current_graph.get_destinations() else list(current_graph.nodes.keys())[-1]
            st.session_state["gbfs_res"] = greedy_best_first_search(current_graph, start_node, goal_node)
            st.session_state["astar_res"] = astar_search(current_graph, start_node, goal_node)
            st.rerun()
    else:
        # Comparison Metrics Table
        excess_pct = ((gbfs_res.total_cost - astar_res.total_cost) / astar_res.total_cost * 100.0) if astar_res.total_cost > 0 else 0.0

        comp_data = {
            "Performance Metric": [
                "Evaluation Function",
                "Calculated Walking Cost",
                "Path Node Count",
                "Nodes Expanded",
                "Nodes Generated",
                "Execution Time",
                "Optimality Status",
            ],
            "Greedy Best-First Search": [
                "f(n) = h(n)",
                f"{gbfs_res.total_cost:.1f} m",
                f"{len(gbfs_res.path)} nodes",
                f"{gbfs_res.expanded_nodes_count}",
                f"{gbfs_res.generated_nodes_count}",
                f"{gbfs_res.execution_time_ms:.3f} ms",
                "Suboptimal" if excess_pct > 0 else "Optimal",
            ],
            "A* Search (Optimal)": [
                "f(n) = g(n) + h(n)",
                f"{astar_res.total_cost:.1f} m",
                f"{len(astar_res.path)} nodes",
                f"{astar_res.expanded_nodes_count}",
                f"{astar_res.generated_nodes_count}",
                f"{astar_res.execution_time_ms:.3f} ms",
                "Guaranteed Optimal",
            ],
            "Advantage / Difference": [
                "A* accounts for g(n)",
                f"{'+' if excess_pct > 0 else ''}{excess_pct:.1f}% excess in GBFS",
                f"{len(gbfs_res.path) - len(astar_res.path):+d} nodes",
                f"{gbfs_res.expanded_nodes_count - astar_res.expanded_nodes_count:+d} expansions",
                f"{gbfs_res.generated_nodes_count - astar_res.generated_nodes_count:+d} generated",
                f"{gbfs_res.execution_time_ms - astar_res.execution_time_ms:+.3f} ms",
                "A* guarantees lowest distance",
            ]
        }
        st.dataframe(pd.DataFrame(comp_data), use_container_width=True)

        # Comparative Charts
        st.markdown("### Performance Visualizations")
        cost_fig, nodes_fig, time_fig = visualizer.create_comparison_charts(gbfs_res, astar_res)

        col_c1, col_c2, col_c3 = st.columns(3)
        with col_c1:
            st.plotly_chart(cost_fig, use_container_width=True)
        with col_c2:
            st.plotly_chart(nodes_fig, use_container_width=True)
        with col_c3:
            st.plotly_chart(time_fig, use_container_width=True)

        # Route Sequences
        st.markdown("### Reconstructed Route Sequences")
        col_r1, col_r2 = st.columns(2)
        with col_r1:
            st.markdown("**GBFS Reconstructed Route:**")
            st.code(" ➔ ".join(gbfs_res.path_names), language="text")
        with col_r2:
            st.markdown("**A* Reconstructed Route:**")
            st.code(" ➔ ".join(astar_res.path_names), language="text")


# ==============================================================================
# VIEW 5: SEARCH TRACE
# ==============================================================================
elif nav_choice == "5. Search Trace":
    st.subheader("Step-by-Step Search Execution Trace")
    st.markdown("""
    Inspect the exact node expansion sequence, priority values, and frontier dynamics
    for each algorithm.
    """)

    gbfs_res = st.session_state["gbfs_res"]
    astar_res = st.session_state["astar_res"]

    trace_algo = st.radio("Select Algorithm Trace to Inspect:", ["A* Search", "Greedy Best-First Search"], horizontal=True)
    active_res = astar_res if trace_algo == "A* Search" else gbfs_res

    if active_res is None or not active_res.search_trace:
        st.warning(f"No search trace recorded for {trace_algo}. Run the algorithm from the **Route Planner** tab first.")
    else:
        st.markdown(f"**Evaluation Function:** `{'f(n) = g(n) + h(n)' if trace_algo == 'A* Search' else 'f(n) = h(n)'}`")
        st.markdown(f"**Total Steps / Expansions:** {len(active_res.search_trace)}")

        trace_df = pd.DataFrame([step.to_dict() for step in active_res.search_trace])
        st.dataframe(trace_df, use_container_width=True)

        # CSV Download for Trace
        csv_trace = export_trace_to_csv([step.to_dict() for step in active_res.search_trace])
        st.download_button(
            label=f"📥 Download {trace_algo} Trace as CSV",
            data=csv_trace,
            file_name=f"{trace_algo.lower().replace(' ', '_')}_trace.csv",
            mime="text/csv",
        )


# ==============================================================================
# VIEW 6: EXPERIMENTAL RESULTS
# ==============================================================================
elif nav_choice == "6. Experimental Results":
    st.subheader("Empirical Benchmarking Across Multiple Campus Topologies")
    st.markdown("""
    This experimental suite runs both algorithms across **all 3 test map configurations**:
    1. **Normal Campus Map**: Evaluates paths to all 5 required destinations.
    2. **Alternative and Detour Map**: Tests performance against scenic detours and longer paths.
    3. **Misleading Heuristic Trap Map**: Demonstrates the classic theoretical weakness of Greedy Best-First Search.
    """)

    col_btn_run, col_export = st.columns([2, 2])
    with col_btn_run:
        run_exp_btn = st.button("⚡ Execute Full Benchmark Suite Across All Maps", use_container_width=True)

    if run_exp_btn or st.session_state["benchmark_df"] is None:
        with st.spinner("Executing rigorous benchmarks across all maps..."):
            st.session_state["benchmark_df"] = run_benchmark_experiments(DATA_DIR)

    benchmark_df = st.session_state["benchmark_df"]
    st.dataframe(benchmark_df, use_container_width=True)

    # Summary Statistics
    suboptimal_cases = (benchmark_df["Excess Cost (%)"] > 0).sum()
    avg_excess = benchmark_df.loc[benchmark_df["Excess Cost (%)"] > 0, "Excess Cost (%)"].mean()
    if pd.isna(avg_excess):
        avg_excess = 0.0

    col_s1, col_s2, col_s3 = st.columns(3)
    with col_s1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-card-title">Total Benchmark Test Cases</div>
            <div class="metric-card-value">{len(benchmark_df)}</div>
            <div class="metric-card-sub">Across 3 Map Topologies</div>
        </div>
        """, unsafe_allow_html=True)
    with col_s2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-card-title">Suboptimal GBFS Cases</div>
            <div class="metric-card-value">{suboptimal_cases} / {len(benchmark_df)}</div>
            <div class="metric-card-sub">Cases Where GBFS Failed Optimality</div>
        </div>
        """, unsafe_allow_html=True)
    with col_s3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-card-title">Average GBFS Excess Cost</div>
            <div class="metric-card-value">+{avg_excess:.1f}%</div>
            <div class="metric-card-sub">On Suboptimal Routes</div>
        </div>
        """, unsafe_allow_html=True)

    # Download CSV
    csv_data = export_dataframe_to_csv(benchmark_df)
    st.download_button(
        label="📥 Export Benchmark Results to CSV",
        data=csv_data,
        file_name="campus_delivery_search_benchmarks.csv",
        mime="text/csv",
    )

    # Section 8 Misleading Heuristic In-Depth Focus
    st.markdown("---")
    st.markdown("### The Misleading Heuristic Experiment (Section 8 Deep Dive)")

    st.markdown("""
    <div class="info-callout">
        <b>Why Did Greedy Choose S ➔ A ➔ G (Cost 101) Instead of S ➔ B ➔ G (Cost 5)?</b><br>
        In the Misleading Heuristic Map, the coordinates are:
        <code>S = (0, 0)</code>, <code>A = (1, 0)</code>, <code>B = (0, 2)</code>, and Goal <code>G = (2, 0)</code>.<br>
        The straight-line Euclidean distance from <b>A</b> to <b>G</b> is <b>1.0 metre</b>, whereas from <b>B</b> to <b>G</b> it is <b>2.83 metres</b>.<br>
        Because <b>Greedy Best-First Search evaluates solely <code>f(n) = h(n)</code></b>, it greedily expands A because <code>1.0 &lt; 2.83</code>.
        It has no mechanism to account for the massive 100m transition cost between A and G.<br>
        In contrast, <b>A* evaluates <code>f(n) = g(n) + h(n)</code></b>. When A is expanded, the cost to reach G becomes <code>g + h = 101 + 0 = 101</code>.
        A* then pops B from the priority queue because <code>f(B) = 2 + 2.83 = 4.83 &lt; 101</code>, discovering the true optimal path <code>S ➔ B ➔ G</code> with total cost <b>5.0 metres</b>!
    </div>
    """, unsafe_allow_html=True)


# ==============================================================================
# VIEW 7: ABOUT & COMPLEXITY
# ==============================================================================
elif nav_choice == "7. About & Complexity":
    st.subheader("Theoretical Formulations & Computational Complexity Analysis")

    tab1, tab2, tab3 = st.tabs(["State-Space Formulation", "Complexity Analysis", "Custom Campus Setup"])

    with tab1:
        st.markdown(r"""
        ### State-Space Representation of Campus Delivery
        - **State Space (S):** Set of all discrete physical campus landmarks (administrative buildings, departments, auditoriums, and pathway junctions).
        - **Initial State ($s_0$):** Central Office (`central_office` / `S`).
        - **Goal State ($s_g$):** Selected delivery destination (e.g., Department Office, Library, Examination Section).
        - **Actions ($A(s)$):** Traversal along connected walking corridors between node $s$ and its adjacent neighbors $Adj(s)$.
        - **Transition Model ($Result(s, a)$):** Moving to the neighboring node connected by edge $a$.
        - **Step Cost ($c(s, a, s')$):** Measured walking distance in metres along the connecting path.
        - **Path Cost ($g(p)$):** Cumulative sum of walking distances: $g(p) = \sum_{(u, v) \in p} c(u, v)$.
        """)

    with tab2:
        st.markdown(r"""
        ### Search Complexity Breakdown

        | Search Algorithm | Evaluation Function | Time Complexity (General) | Time Complexity (Finite Graph) | Space Complexity | Optimality Guarantee |
        | :--- | :--- | :--- | :--- | :--- | :--- |
        | **Greedy Best-First** | $f(n) = h(n)$ | $O(b^m)$ | $O(|V| \log |V| + |E|)$ | $O(b^m)$ / $O(|V|)$ | **No** (Greedy trap) |
        | **A\* Search** | $f(n) = g(n) + h(n)$ | $O(b^\epsilon)$ | $O(|V| \log |V| + |E|)$ | $O(b^d)$ / $O(|V|)$ | **Yes** (if $h$ is admissible) |
        | **Dijkstra** | $f(n) = g(n)$ | $O(b^{C^*/\epsilon})$ | $O(|V| \log |V| + |E|)$ | $O(|V|)$ | **Yes** ($h(n) = 0$) |

        Where:
        - $b$: Average branching factor of the campus network (typically $2$ to $4$ corridors per junction).
        - $d$: Depth of the optimal delivery path.
        - $m$: Maximum search depth.
        - $|V|$: Number of campus nodes (locations & junctions).
        - $|E|$: Number of connecting corridors.

        #### Admissibility and Monotonicity Proof:
        The Euclidean heuristic is defined as $h(n) = \sqrt{(x_n - x_g)^2 + (y_n - y_g)^2}$.
        1. In 2D Euclidean space, the shortest possible continuous distance between any two coordinates $(x_1, y_1)$ and $(x_2, y_2)$ is the straight line.
        2. In our campus dataset, every edge weight $w(u, v)$ satisfies $w(u, v) \ge \text{Euclidean}(u, v)$.
        3. By the triangle inequality, for any path from $n$ to $goal$:
           $$\sum_{e \in path} w(e) \ge \sum_{e \in path} \text{Euclidean}(e) \ge \text{Euclidean}(n, goal) = h(n)$$
        Hence, $h(n) \le h^*(n)$ everywhere, satisfying strict **admissibility**.
        Furthermore, for any transition $(u, v)$, $h(u) \le c(u, v) + h(v)$, satisfying **consistency (monotonicity)**.
        """)

    with tab3:
        st.markdown("""
        ### How to Replace the Sample Campus Map With Your College Layout

        To customize this system for any college or university campus:
        1. Open `data/campus_map.json`.
        2. Update the `nodes` list with your college buildings:
           ```json
           {
             "id": "computer_science_block",
             "name": "CS Department Building",
             "x": 350.0,
             "y": 420.0,
             "type": "destination",
             "description": "Lab and faculty rooms"
           }
           ```
        3. Update the `edges` list with surveyed or measured walking distances:
           ```json
           {
             "source": "central_office",
             "target": "computer_science_block",
             "distance": 180.0,
             "bidirectional": true,
             "path_type": "paved_walkway"
           }
           ```
        4. Ensure edge distances in metres are greater than or equal to straight-line Euclidean distance between coordinate pairs to preserve heuristic admissibility!
        """)
