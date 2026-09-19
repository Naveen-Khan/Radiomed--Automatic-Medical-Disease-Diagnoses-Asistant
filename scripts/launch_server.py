"""
Radiomed — Cross-platform launcher (Windows + Linux + macOS).

Replaces scripts/launch_server.py with a portable version that:
  - Computes all paths relative to this file (no hardcoded /home/z/ paths)
  - Uses the correct process-detachment flags per OS
  - Opens log/pid files inside the project folder, not in /home/z/

Usage:
  Windows:  python scripts/launch_server.py
  Linux/Mac: python3 scripts/launch_server.py
"""
import os
import sys
import time
import subprocess
from pathlib import Path

# ─── Resolve project paths RELATIVE TO THIS FILE ──────────────────────
# This is the key fix: never hardcode /home/z/... — compute paths from
# __file__ so they resolve correctly on any OS.
SCRIPT_DIR   = Path(__file__).resolve().parent          # .../scripts/
PROJECT_ROOT = SCRIPT_DIR.parent                        # .../radiomed_project/
APP_FILE     = PROJECT_ROOT / "app.py"
LOG_FILE     = SCRIPT_DIR / "server.log"
PID_FILE     = SCRIPT_DIR / "server.pid"

# Make sure scripts/ exists (it does, since this file is in it)
SCRIPT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Kill any previous instance ────────────────────────────────────────
if PID_FILE.exists():
    try:
        old_pid = int(PID_FILE.read_text().strip())
        try:
            if os.name == "nt":
                subprocess.run(["taskkill", "/F", "/PID", str(old_pid)],
                               capture_output=True)
            else:
                os.kill(old_pid, 15)
            time.sleep(1)
        except (ProcessLookupError, FileNotFoundError):
            pass
    except ValueError:
        pass

# ─── Environment ───────────────────────────────────────────────────────
env = os.environ.copy()
env["TF_CPP_MIN_LOG_LEVEL"] = "3"
env["PYTHONUNBUFFERED"] = "1"

# ─── OS-specific detachment flags ──────────────────────────────────────
popen_kwargs = {}
if os.name == "nt":
    # Windows: detach into a new process group so Ctrl+C in this shell
    # doesn't kill the server.
    popen_kwargs["creationflags"] = (
        subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
    )
else:
    # Linux/macOS: start_new_session detaches from this shell's session.
    popen_kwargs["start_new_session"] = True

# ─── Launch ────────────────────────────────────────────────────────────
# Use sys.executable so the same Python that runs this launcher also runs
# the app (important inside a venv).
log_fp = open(LOG_FILE, "w", encoding="utf-8")
proc = subprocess.Popen(
    [sys.executable, "-u", str(APP_FILE)],
    cwd=str(PROJECT_ROOT),
    env=env,
    stdout=log_fp,
    stderr=subprocess.STDOUT,
    stdin=subprocess.DEVNULL,
    **popen_kwargs,
)
PID_FILE.write_text(str(proc.pid))

print(f"Server launched, PID={proc.pid}")
print(f"Log file: {LOG_FILE}")
print(f"Open:     http://localhost:5000  (wait ~6 seconds for first startup)")
print(f"Demo:     demo@radiomed.ai / radiomed123")
if os.name == "nt":
    print(f"To stop:  taskkill /F /PID {proc.pid}")
else:
    print(f"To stop:  kill {proc.pid}")
