"""Root launcher for FastAPI backend server."""
import sys
from pathlib import Path
import importlib.util

sub_api_path = Path(__file__).resolve().parent / "intelligent-delivery-route-planner" / "api.py"
spec = importlib.util.spec_from_file_location("sub_api", str(sub_api_path))
sub_api = importlib.util.module_from_spec(spec)
sys.modules["sub_api"] = sub_api
spec.loader.exec_module(sub_api)

app = sub_api.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
