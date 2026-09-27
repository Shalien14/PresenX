import sys
import os
import threading

# Allow Python to find the PresenX project modules
sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

from flask import Flask, request
from Recognition.attendance_engine import main

app = Flask(__name__)

# Keeps track of whether face recognition is currently running
camera_running = False


@app.route("/door-open", methods=["POST"])
def door_open():

    global camera_running

    # Check if face recognition is already running
    if camera_running:
        print("Face recognition is already running.")

        return {
            "message": "Face recognition already running"
        }, 200

    # Mark recognition as running
    camera_running = True

    def run_recognition():

        global camera_running

        try:
            print("Starting face recognition...")

            main()

        finally:
            camera_running = False
            print("Face recognition finished.")

    # Run face recognition in background
    threading.Thread(
        target=run_recognition,
        daemon=True
    ).start()

    # Immediately respond to ESP32
    return {
        "message": "Door signal received"
    }, 200


if __name__ == "__main__":

    print("--------------------------------")
    print("PresenX Python Server")
    print("Port: 5001")
    print("--------------------------------")

    app.run(
        host="0.0.0.0",
        port=5001
    )