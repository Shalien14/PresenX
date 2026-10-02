import os
import cv2
import pickle
import numpy as np
from flask import Flask, request, jsonify
from insightface.app import FaceAnalysis

app = Flask(__name__)

# ==========================================================
# PATHS
# ==========================================================

KNOWN_FACES_DIR = "Known_faces"
EMBEDDINGS_FILE = os.path.join(
    KNOWN_FACES_DIR,
    "embeddings.pkl"
)

os.makedirs(KNOWN_FACES_DIR, exist_ok=True)


# ==========================================================
# INSIGHTFACE
# ==========================================================

print("Loading InsightFace model...")

face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=-1,
    det_size=(320, 320)
)

print("Model Loaded.")


# ==========================================================
# HELPERS
# ==========================================================

def normalize_embedding(embedding):

    embedding = np.asarray(
        embedding,
        dtype=np.float32
    )

    norm = np.linalg.norm(embedding)

    if norm == 0:
        return embedding

    return embedding / norm


def generate_embedding(image_path):

    image = cv2.imread(image_path)

    if image is None:
        return None

    faces = face_app.get(image)

    if not faces:
        return None

    # Select the largest detected face
    face = max(
        faces,
        key=lambda f:
        (f.bbox[2] - f.bbox[0]) *
        (f.bbox[3] - f.bbox[1])
    )

    return normalize_embedding(face.embedding)


def load_database():

    if os.path.exists(EMBEDDINGS_FILE):

        with open(
            EMBEDDINGS_FILE,
            "rb"
        ) as f:

            return pickle.load(f)

    return {}


def save_database(database):

    with open(
        EMBEDDINGS_FILE,
        "wb"
    ) as f:

        pickle.dump(database, f)


# ==========================================================
# FACE REGISTRATION API
# ==========================================================

@app.route("/register-face", methods=["POST"])
def register_face():

    print("\n========== NEW FACE REGISTRATION ==========")

    print("FORM:", request.form)
    print("FILES:", request.files)

    employee_id = request.form.get("employee_id")
    image = request.files.get("image")


    # ======================================================
    # VALIDATION
    # ======================================================

    if not employee_id:

        return jsonify({
            "success": False,
            "error": "Employee ID is required"
        }), 400


    if not image or image.filename == "":

        return jsonify({
            "success": False,
            "error": "Employee image is required"
        }), 400


    # ======================================================
    # SAVE IMAGE
    # ======================================================

    employee_id = employee_id.strip()

    filename = f"{employee_id}.jpg"

    image_path = os.path.join(
        KNOWN_FACES_DIR,
        filename
    )

    image.save(image_path)

    print("Image saved:", image_path)


    # ======================================================
    # GENERATE FACE EMBEDDING
    # ======================================================

    embedding = generate_embedding(image_path)


    if embedding is None:

        if os.path.exists(image_path):
            os.remove(image_path)

        return jsonify({
            "success": False,
            "error": "No face detected in image"
        }), 400


    # ======================================================
    # UPDATE EMBEDDING DATABASE
    # ======================================================

    database = load_database()

    database[employee_id] = [embedding]

    save_database(database)


    print(
        f"{employee_id} added successfully."
    )

    print(
        f"Database now contains "
        f"{len(database)} people."
    )


    # ======================================================
    # SUCCESS
    # ======================================================

    return jsonify({
        "success": True,
        "employee_id": employee_id,
        "message": "Face registered successfully"
    }), 201


# ==========================================================
# START SERVER
# ==========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5002,
        debug=True
    )