
#!/bin/bash

# ==========================================================
# PresenX Launcher - macOS
# ==========================================================

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"


if [ -f "$ROOT_DIR/venv/Scripts/python.exe" ]; then
    # Windows virtual environment (Git Bash)
    PYTHON="$ROOT_DIR/venv/Scripts/python.exe"
elif [ -f "$ROOT_DIR/venv/bin/python" ]; then
    # macOS/Linux virtual environment
    PYTHON="$ROOT_DIR/venv/bin/python"
else
    echo "ERROR: Python virtual environment not found."
    echo "Create it using: python -m venv venv"
    exit 1
fi

NODE="$ROOT_DIR/backend/node_modules/.bin/../node_modules/node/bin/node"
BACKEND_DIR="$ROOT_DIR/backend"
APP="$ROOT_DIR/app.py"
ENGINE="$ROOT_DIR/Recognition/attendance_engine.py"
SERVER_IP="$ROOT_DIR/hardware/server_ip.py"


LOG_DIR="$ROOT_DIR/logs"

BACKEND_PID=""
FLASK_PID=""
ENGINE_PID=""
SERVER_IP_PID=""

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

if [[ ! -f "$BACKEND_DIR/server.js" || ! -f "$APP" || ! -f "$ENGINE" || ! -f "$SERVER_IP" ]]; then
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


start_server_ip() {
    if is_running "$SERVER_IP_PID"; then
        echo "ESP32 server is already running."
        return
    fi

    if [[ ! -f "$SERVER_IP" ]]; then
        echo "ERROR: server_ip.py not found at:"
        echo "$SERVER_IP"
        return
    fi

    echo "Starting ESP32 server..."

    (
        cd "$ROOT_DIR" || exit 1
        exec "$PYTHON" "$SERVER_IP"
    ) >> "$LOG_DIR/server_ip.log" 2>&1 &

    SERVER_IP_PID=$!
    sleep 2

    if is_running "$SERVER_IP_PID"; then
        echo "ESP32 server process started (PID $SERVER_IP_PID)."
        echo "Output is in logs/server_ip.log"
    else
        SERVER_IP_PID=""
        echo "ESP32 server failed to start."
        echo "Check logs/server_ip.log"
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
    stop_process "$SERVER_IP_PID" "ESP32 server"
    stop_process "$FLASK_PID" "Flask service"
    stop_process "$BACKEND_PID" "Express backend"

    ENGINE_PID=""
    SERVER_IP_PID=""
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
            start_server_ip

            echo
            echo "All requested services have been launched."
            echo "Select option 3 only if you want to restart/start the camera engine separately."
            ;;
        2)
            start_backend
            start_flask
            start_server_ip
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
