# PresenX

Smart Official Presence & Availability Monitoring System

## Overview

PresenX is an IoT and AI-based system designed to monitor
the real-time presence and availability of an official and
provide this information through a web application.

## System Modules

### IoT
- Door activity monitoring

### AI & Computer Vision
- Face detection
- Face recognition
- Officer identification
- Recognition evaluation

### Backend
- Presence state management
- Availability status
- Attendance/history

### Web Application
- Public availability interface
- Administrative dashboard

## Technologies

- Python
- OpenCV
- NumPy
- face_recognition
- ESP32 / Arduino
- Backend framework
- Database
- HTML / CSS / JavaScript
```text
IoT
 └── Door monitoring

AI / Computer Vision
 ├── Face detection
 ├── Face recognition
 ├── Officer identification
 └── Recognition evaluation

Backend
 ├── Presence state
 ├── Availability status
 └── History

Web
 ├── Public availability interface
 └── Higher-official/admin dashboard
```
## Git & Branch Guide

### Branch Structure

The `main` branch contains the stable version of the project.

Each team member should create a separate feature branch for their work.

```text
main
├── feature/ai-cv
├── feature/iot
├── feature/backend
└── feature/frontend
```

### 1. Get the latest changes

Before starting work:
```bash
git switch main
git pull origin main
```
### 2. Create a new branch

Create a branch for your feature:
```bash
git switch -c feature/your-feature
```
Example:
```bash
git switch -c feature/ai-cv
```
### 3. Check your current branch
```bash
git branch
```
The branch with * is your current branch.

### 4. Switch between branches
```bash
git switch main
```
or:
```bash
git switch feature/ai-cv
```
### 5. Save your changes
```bash
git add .
git commit -m "Describe your changes"
```
Example:
```bash
git commit -m "Add face detection module"
```
### 6. Push your branch

First time:
```bash
git push -u origin feature/ai-cv
```

After that:
```bash
git push
```
### 7. Create a Pull Request

After pushing your branch:

- Go to the GitHub repository.
- Open Pull Requests.
- Click New Pull Request.
- Select your feature branch.
- Set main as the base branch.
- Describe your changes.
- Create the Pull Request.
- Ask another team member to review it.

### 8. After the Pull Request is merged

Update your local main:
```bash
git switch main
git pull origin main
```
Your feature branch can then be deleted:
```bash
git branch -d feature/ai-cv
```

### Important Rules
- ❌ Do not work directly on main. 
- ❌ Do not push directly to main.
- ❌ Do not use git push --force on main.
- ✅ Create a feature branch for your work.
- ✅ Pull the latest main before starting new work.
- ✅ Create a Pull Request when your work is ready.
- ✅ Get at least one review before merging.


## Running PresenX

### 1. Initial Setup

Clone the repository and navigate to the project directory:

```bash
git clone <repository-url>
cd PresenX
```

Make the launcher executable:

```bash
chmod +x run_presenx.sh
```

### 2. Create a Terminal Shortcut (macOS)

PresenX uses a shell alias to make launching the system easier. Run this command once from the project root:

```bash
echo 'alias presenx="./run_presenx.sh"' >> ~/.zshrc
source ~/.zshrc
```

**Note:** This alias assumes the terminal's current directory is the PresenX project root when you launch it.

### 3. Start PresenX

Whenever you want to launch PresenX, navigate to the project root and run:

```bash
presenx
```

The startup menu will appear. Select option `1` to start all required services, including the backend, face registration service, and camera attendance engine.

### 4. Stop PresenX

Use the exit option in the launcher menu to stop the services and exit the program.

### Requirements

- Node.js and npm
- Python 3
- Required Node.js dependencies installed in `backend/`
- Required Python packages installed in the project's virtual environment
- A working webcam for face recognition

