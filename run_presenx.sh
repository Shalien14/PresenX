
#!/bin/bash

# ==========================================================
# PresenX Launcher - macOS
# ==========================================================

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

PYTHON="$ROOT_DIR/venv/bin/python"
NODE="$ROOT_DIR/backend/node_modules/.bin/../node_modules/node/bin/node"
BACKEND_DIR="$ROOT_DIR/backend"
APP="$ROOT_DIR/app.py"
ENGINE="$ROOT_DIR/Recognition/attendance_engine.py"

LOG_DIR="$ROOT_DIR/logs"

BACKEND_PID=""
FLASK_PID=""
ENGINE_PID=""

mkdir -p "$LOG_DIR"

# Use the system Node.js executable available on PATH.
NODE="$(command -v node || true)"

if [[ -z "$NODE" ]]; then
    echo "ERROR: Node.js is not installed or not on PATH."
    exit 1
fi

if [[ ! -x "$PYTHON" ]]; then
    echo "ERROR: Python virtual environment not found at:"
    echo "$PYTHON"
    exit 1
fi

if [[ ! -f "$BACKEND_DIR/server.js" || ! -f "$APP" || ! -f "$ENGINE" ]]; then
    echo "ERROR: One or more PresenX entry-point files are missing."
    exit 1
fi

is_running() {
    [[ -n "$1" ]] && kill -0 "$1" 2>/dev/null
}

start_backend() {
    if is_running "$BACKEND_PID"; then
        echo "Express backend is already running."
        return
    fi

    echo "Starting Express backend..."

    (
        cd "$BACKEND_DIR" || exit 1
        exec "$NODE" server.js
    ) >> "$LOG_DIR/backend.log" 2>&1 &

    BACKEND_PID=$!
    sleep 2

    if is_running "$BACKEND_PID"; then
        echo "Express process started (PID $BACKEND_PID)."
    else
        BACKEND_PID=""
        echo "Backend failed to start. Check logs/backend.log"
    fi
}

start_flask() {
    if is_running "$FLASK_PID"; then
        echo "Face-registration service is already running."
        return
    fi

    echo "Starting Flask face-registration service..."

    (
        cd "$ROOT_DIR" || exit 1
        exec "$PYTHON" "$APP"
    ) >> "$LOG_DIR/flask.log" 2>&1 &

    FLASK_PID=$!
    sleep 2

    if is_running "$FLASK_PID"; then
        echo "Flask process started (PID $FLASK_PID)."
    else
        FLASK_PID=""
        echo "Flask failed to start. Check logs/flask.log"
    fi
}

start_engine() {
    if is_running "$ENGINE_PID"; then
        echo "Attendance engine is already running."
        return
    fi

    echo "Starting attendance engine..."

    (
        cd "$ROOT_DIR" || exit 1
        exec "$PYTHON" "$ENGINE"
    ) >> "$LOG_DIR/attendance.log" 2>&1 &

    ENGINE_PID=$!
    sleep 2

    if is_running "$ENGINE_PID"; then
        echo "Attendance engine process started (PID $ENGINE_PID)."
        echo "Its output is in logs/attendance.log"
    else
        ENGINE_PID=""
        echo "Attendance engine failed to start. Check logs/attendance.log"
    fi
}

stop_process() {
    local pid="$1"
    local name="$2"

    if is_running "$pid"; then
        echo "Stopping $name (PID $pid)..."
        kill "$pid" 2>/dev/null || true

        # Give the process a moment to exit.
        for _ in {1..10}; do
            is_running "$pid" || break
            sleep 0.5
        done

        if is_running "$pid"; then
            echo "$name did not stop gracefully; forcing shutdown."
            kill -9 "$pid" 2>/dev/null || true
        fi
    fi
}

stop_all() {
    stop_process "$ENGINE_PID" "Attendance engine"
    stop_process "$FLASK_PID" "Flask service"
    stop_process "$BACKEND_PID" "Express backend"

    ENGINE_PID=""
    FLASK_PID=""
    BACKEND_PID=""

    echo "PresenX processes stopped."
}

cleanup() {
    echo
    echo "Shutting down PresenX..."
    stop_all
}

trap cleanup EXIT INT TERM

while true; do
    echo
    echo "=================================="
    echo "       PresenX Launcher"
    echo "=================================="
    echo "1. Start all services"
    echo "2. Start backend and face registration"
    echo "3. Start attendance engine"
    echo "4. Stop services and exit"
    echo "=================================="

    read -r -p "Choose an option: " choice

    case "$choice" in
        1)
            start_backend
            start_flask
            start_engine
            echo
            echo "All requested services have been launched."
            echo "Select option 3 only if you want to restart/start the camera engine separately."
            ;;
        2)
            start_backend
            start_flask
            ;;
        3)
            start_engine
            ;;
        4)
            break
            ;;
        *)
            echo "Invalid option. Choose 1, 2, 3, or 4."
            ;;
    esac
done
