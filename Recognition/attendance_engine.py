import os
import cv2
import numpy as np
import pickle
import platform
import requests
from datetime import datetime, date
from pathlib import Path
from insightface.app import FaceAnalysis

API_BASE_URL = "http://localhost:5001/api"

# ============================================================
# PATHS (matched to your PresenX structure)
# ============================================================

BASE_DIR = Path(__file__).parent.resolve()          # PresenX/Recognition
PROJECT_ROOT = BASE_DIR.parent                      # PresenX

KNOWN_FACES_DIR = PROJECT_ROOT / "Known_faces"
EMBEDDINGS_FILE = KNOWN_FACES_DIR / "embeddings.pkl"   # ← now lives inside Known_faces

# Create folders if they don't exist
KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# CONFIG
# ============================================================

MATCH_THRESHOLD = 0.50
DETECTION_THRESHOLD = 0.50
PROCESS_EVERY_N_FRAMES = 3
CONFIRMATION_FRAMES = 3          # must be seen this many times before marking
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480
DET_SIZE = (320, 320)

# ============================================================
# INITIALIZATION
# ============================================================

print("Loading InsightFace model...")
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=-1, det_size=DET_SIZE)
print("Model loaded.")

# ============================================================
# HELPERS
# ============================================================

def normalize_embedding(embedding):
    embedding = np.asarray(embedding, dtype=np.float32)
    norm = np.linalg.norm(embedding)
    return embedding if norm == 0 else embedding / norm


def get_face_embedding(image):
    faces = app.get(image)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    if face.det_score < DETECTION_THRESHOLD:
        return None
    return normalize_embedding(face.embedding)


def load_or_build_database(force_rebuild=False):
    """
    Loads existing embeddings.pkl and automatically adds any new faces
    found in Known_faces folder.
    """
    database = {}

    # Load existing cache if available
    if EMBEDDINGS_FILE.exists() and not force_rebuild:
        print("Loading cached embeddings...")
        with open(EMBEDDINGS_FILE, "rb") as f:
            database = pickle.load(f)
        print(f"Loaded {len(database)} people from cache.")

    if not KNOWN_FACES_DIR.exists():
        print(f"Known_faces folder not found at: {KNOWN_FACES_DIR}")
        return database

    # Check for new images that are not yet in the database
    existing_names = set(database.keys())
    new_faces_found = False

    print("Scanning Known_faces for new people...")
    for path in KNOWN_FACES_DIR.glob("*"):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue

        # Clean name from filename
        name = path.stem.split("_")[0].replace("-", " ").strip().title()

        if name in existing_names and not force_rebuild:
            continue  # already have this person

        image = cv2.imread(str(path))
        if image is None:
            print(f"  Could not read {path.name}")
            continue

        emb = get_face_embedding(image)
        if emb is not None:
            database.setdefault(name, []).append(emb)
            print(f"  + Added/Updated: {name}")
            new_faces_found = True
        else:
            print(f"  × No face detected in {path.name}")

    if new_faces_found or force_rebuild:
        with open(EMBEDDINGS_FILE, "wb") as f:
            pickle.dump(database, f)
        print(f"Saved updated embeddings → {EMBEDDINGS_FILE}")

    return database


def recognize_face(query_embedding, database):
    best_name = "Unknown"
    best_score = -1.0
    query_embedding = normalize_embedding(query_embedding)

    for name, refs in database.items():
        scores = [float(np.dot(query_embedding, ref)) for ref in refs]
        person_best = max(scores) if scores else -1.0
        if person_best > best_score:
            best_score = person_best
            best_name = name

    if best_score < MATCH_THRESHOLD:
        best_name = "Unknown"
    return best_name, best_score


# ============================================================
# ATTENDANCE
# ============================================================


def mark_attendance(
    name: str,
    similarity: float,
    employee_mapping: dict
) -> bool:

    employee_id = employee_mapping.get(name)

    if not employee_id:
        print(
            f"[WARNING] No employee found for recognized person: {name}"
        )
        return False

    success = send_attendance(employee_id, "ENTRY")

    if not success:
        print(
            f"[ERROR] Failed to record attendance for "
            f"{name} ({employee_id})"
        )
        return False

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(
        f"[ATTENDANCE] {name} ({employee_id}) "
        f"marked present at {now} ({similarity:.1%})"
    )

    return True

def get_today_attendance():
    today = date.today().isoformat()

    try:
        response = requests.get(
            f"{API_BASE_URL}/attendance",
            params={"date": today},
            timeout=5
        )

        if response.status_code != 200:
            print(
                f"[BACKEND ERROR] "
                f"{response.status_code}: {response.text}"
            )
            return []

        data = response.json()

        return data.get("attendance", [])

    except requests.RequestException as e:
        print(
            f"[BACKEND ERROR] Could not get attendance: {e}"
        )
        return []

# ============================================================
# LOAD EMPLOYEE MAPPING FROM PRESENX
# ============================================================

def load_employee_mapping():
    try:
        response = requests.get(
            f"{API_BASE_URL}/employees",
            timeout=5
        )

        response.raise_for_status()

        data = response.json()

        employees = data.get("employees", [])

        mapping = {}

        for employee in employees:
            name = employee["name"]
            employee_id = employee["employee_id"]

            mapping[name] = employee_id

        print("Employee mapping loaded:")
        for name, employee_id in mapping.items():
            print(f"  {name} -> {employee_id}")

        return mapping

    except requests.RequestException as e:
        print(f"ERROR: Could not connect to PresenX backend: {e}")
        return {}

# ============================================================
# SEND ATTENDANCE TO YOUR BACKEND
# ============================================================

def send_attendance(employee_id, status="ENTRY"):
    now = datetime.now()

    payload = {
        "employeeId": employee_id,
        "status": status,
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S")
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/attendance",
            json=payload,
            timeout=5
        )

        if response.status_code in (200, 201):
            data = response.json()

            print(
                f"[BACKEND] {data.get('message')} "
                f"| {employee_id} | {status}"
            )

            return True

        print(
            f"[BACKEND ERROR] "
            f"{response.status_code}: {response.text}"
        )

        return False

    except requests.RequestException as e:
        print(
            f"[BACKEND ERROR] Could not send attendance: {e}"
        )
        return False

# ============================================================
# MAIN LOOP
# ============================================================

def main():
    # Set force_rebuild=True if you want to completely rebuild the database
    known_database = load_or_build_database(force_rebuild=False)
    employee_mapping = load_employee_mapping()

    if not employee_mapping:
        print("Could not load employee mapping from PresenX backend.")
        return

    if not known_database:
        print("No known faces found. Add photos to Known_faces/ and restart.")
        return
    # This identify the platform and support camera in both platform
    if platform.system() == "Darwin":  # macOS
        cap = cv2.VideoCapture(0, cv2.CAP_AVFOUNDATION)
    else:  # Windows / Linux
        cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("ERROR: Could not open webcam.")
        return

    print("Webcam opened successfully.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)

    # Warm up the camera in mac os first run doesnt work.
    for _ in range(5):
        ret, frame = cap.read()
        if ret:
            break

    if not ret:
        print("ERROR: Webcam opened but failed to read frame.")
        cap.release()
        return

    print("First frame captured successfully.")

    frame_count = 0
    cached_faces = []
    confirmation_counter = {}

    print("\nPresenX Attendance Engine v4 started")
    print(f"Known faces : {list(known_database.keys())}")
    print("Press 'q' to quit | 'a' to show today's attendance\n")

    attendance_recorded = set()
    attendance_count = 0
    last_attendance_refresh = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("ERROR: Failed to read frame from webcam.")
            break

        frame_count += 1
        display = frame.copy()

        if frame_count % PROCESS_EVERY_N_FRAMES == 0:
            cached_faces.clear()
            small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            faces = app.get(small)

            current_names = set()

            for face in faces:
                if face.det_score < DETECTION_THRESHOLD:
                    continue

                bbox = (face.bbox * 2).astype(int)
                emb = normalize_embedding(face.embedding)
                name, similarity = recognize_face(emb, known_database)

                cached_faces.append((bbox, name, similarity))
                current_names.add(name)

                if name != "Unknown":
                    confirmation_counter[name] = confirmation_counter.get(name, 0) + 1
                    # if confirmation_counter[name] >= CONFIRMATION_FRAMES:
                    #     mark_attendance(name, similarity)
                    #     confirmation_counter[name] = 0
                    if confirmation_counter[name] >= CONFIRMATION_FRAMES:

                        if name not in attendance_recorded:
                            success = mark_attendance(name,similarity,employee_mapping)

                            if success:
                                attendance_recorded.add(name)
                                attendance_count = len(get_today_attendance())

                        confirmation_counter[name] = 0

            # Decay people who disappeared
            for name in list(confirmation_counter.keys()):
                if name not in current_names:
                    confirmation_counter[name] = max(0, confirmation_counter[name] - 1)

        # Draw
        for bbox, name, similarity in cached_faces:
            x1, y1, x2, y2 = bbox
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            label = f"{name} ({int(similarity*100)}%)"

            cv2.rectangle(display, (x1, y1), (x2, y2), color, 2)
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(display, (x1, y1 - th - 10), (x1 + tw + 8, y1), color, -1)
            cv2.putText(display, label, (x1 + 4, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Status
        current_time = datetime.now().timestamp()

        if current_time - last_attendance_refresh >= 5:
            attendance_count = len(get_today_attendance())
            last_attendance_refresh = current_time
            
        cv2.putText(display, f"Today: {attendance_count} present  |  Press 'a'",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        cv2.imshow("PresenX - Attendance Engine v4", display)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        elif key == ord("a"):
            print("\n===== Today's Attendance =====")
            rows = get_today_attendance()
            if not rows:
                print("  No one marked yet today.")
            else:
                for r in rows:
                    print(
                        f"  {r['name']:<18} "
                        f"{r['date']} {r['time']}  "
                        f"{r['status']}"
                    )
            print("==============================\n")

    cap.release()
    cv2.destroyAllWindows()
    print("Shutdown complete.")


if __name__ == "__main__":
    main()