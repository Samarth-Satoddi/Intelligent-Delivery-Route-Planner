"""Root launcher for Intelligent Delivery Route Planner.

Runs the Streamlit application from workspace root or delegates to intelligent-delivery-route-planner.
"""
import sys
from pathlib import Path

# Add project folder to sys.path
PROJECT_DIR = Path(__file__).resolve().parent / "intelligent-delivery-route-planner"
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

# Execute the application
if __name__ == "__main__":
    import runpy
    app_file = PROJECT_DIR / "app.py"
    runpy.run_path(str(app_file), run_name="__main__")

