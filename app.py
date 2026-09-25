import os
import cv2
import pickle
import numpy as np
from flask import Flask, render_template, request
from insightface.app import FaceAnalysis

app = Flask(__name__)

# ==========================================================
# PATHS - matching your structure
# ==========================================================
KNOWN_FACES_DIR = "Known_faces"
EMBEDDINGS_FILE = os.path.join(KNOWN_FACES_DIR, "embeddings.pkl")

os.makedirs(KNOWN_FACES_DIR, exist_ok=True)

# ==========================================================
# INSIGHTFACE
# ==========================================================
print("Loading InsightFace model…")
face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)
face_app.prepare(ctx_id=-1, det_size=(320, 320))
print("Model Loaded.")

# ==========================================================
# HELPERS
# ==========================================================
def normalize_embedding(embedding):
    embedding = np.asarray(embedding, dtype=np.float32)
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

    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return normalize_embedding(face.embedding)

def load_database():
    if os.path.exists(EMBEDDINGS_FILE):
        with open(EMBEDDINGS_FILE, "rb") as f:
            return pickle.load(f)
    return {}

def save_database(database):
    with open(EMBEDDINGS_FILE, "wb") as f:
        pickle.dump(database, f)

# ==========================================================
# ROUTES
# ==========================================================
@app.route("/")
def home():
    return render_template("addemployee.html")

@app.route("/addemployee", methods=["POST"])
def add_employee():
    print("\n========== NEW REQUEST ==========")
    print("FORM:", request.form)
    print("FILES:", request.files)

    employee_name = request.form.get("name")
    image = request.files.get("image")

    if not employee_name:
        return "Employee name not received!"

    if not image or image.filename == "":
        return "Image not received!"

    # Save image into the existing Known_faces folder
    filename = f"{employee_name.strip()}.jpg"
    image_path = os.path.join(KNOWN_FACES_DIR, filename)
    image.save(image_path)
    print("Image Saved:", image_path)

    embedding = generate_embedding(image_path)

    if embedding is None:
        if os.path.exists(image_path):
            os.remove(image_path)
        return "No face detected in image!"

    # Load existing embeddings.pkl (from Known_faces) and update it
    database = load_database()
    database[employee_name] = [embedding]      # add / overwrite
    save_database(database)

    print(f"{employee_name} added successfully.")
    print(f"Database now contains {len(database)} people.")

    return f"""
    <h2>{employee_name} added successfully!</h2>
    <p>Image saved to: {image_path}</p>
    <p>Embedding updated in: {EMBEDDINGS_FILE}</p>
    <a href="/">Add Another Employee</a>
    """

if __name__ == "__main__":
    app.run(debug=True)