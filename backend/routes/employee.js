const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../database/database");
const upload = multer({
    storage: multer.memoryStorage()
});

// ==========================================
// GET ALL EMPLOYEES
// ==========================================
router.get("/", (req, res) => {
    try {

        const employees = db.prepare(`
            SELECT
                e.employee_id,
                e.name,
                e.designation,
                e.department,
                e.room,

                COALESCE(s.presence, 'ABSENT') AS presence,
                COALESCE(s.availability, 'AVAILABLE') AS availability,
                COALESCE(s.updated_at, datetime('now')) AS updated_at

            FROM employees e

            LEFT JOIN official_status s
                ON s.employee_id = e.employee_id

            ORDER BY e.employee_id
        `).all();

        res.json({
            success: true,
            employees: employees
        });

    } catch (error) {

        console.error("Error fetching employees:", error);

        res.status(500).json({
            success: false,
            error: "Failed to fetch employees"
        });
    }
});


// ==========================================
// ADD EMPLOYEE + REGISTER FACE
// ==========================================
router.post("/", upload.single("image"), async (req, res) => {

    const {
        employee_id,
        name,
        designation,
        department,
        room
    } = req.body;

    const image = req.file;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (
        !employee_id ||
        !name ||
        !designation ||
        !department ||
        !room
    ) {
        return res.status(400).json({
            success: false,
            error: "All fields are required"
        });
    }

    if (!image) {
        return res.status(400).json({
            success: false,
            error: "Employee image is required"
        });
    }

    try {

        // ==========================================
        // CHECK DUPLICATE EMPLOYEE ID FIRST
        // ==========================================

        const existingEmployee = db.prepare(`
            SELECT employee_id
            FROM employees
            WHERE employee_id = ?
        `).get(employee_id);

        if (existingEmployee) {
            return res.status(409).json({
                success: false,
                error: "Employee ID already exists"
            });
        }


        // ==========================================
        // SEND IMAGE TO PYTHON CV SERVICE
        // ==========================================

        const formData = new FormData();

        formData.append(
            "employee_id",
            employee_id
        );

        formData.append(
            "image",
            new Blob(
                [image.buffer],
                { type: image.mimetype }
            ),
            image.originalname
        );


        const cvResponse = await fetch(
            "http://localhost:5002/register-face",
            {
                method: "POST",
                body: formData
            }
        );


        const cvResult = await cvResponse.json();


        // ==========================================
        // CV REGISTRATION FAILED
        // ==========================================

        if (!cvResponse.ok || !cvResult.success) {

            return res.status(400).json({
                success: false,
                error: cvResult.error ||
                       "Face registration failed"
            });
        }


        // ==========================================
        // ADD EMPLOYEE TO DATABASE
        // ==========================================

        const addEmployee = db.prepare(`
            INSERT INTO employees
            (
                employee_id,
                name,
                designation,
                department,
                room
            )
            VALUES (?, ?, ?, ?, ?)
        `);

        addEmployee.run(
            employee_id,
            name,
            designation,
            department,
            room
        );


        // ==========================================
        // CREATE INITIAL OFFICIAL STATUS
        // ==========================================

        const addStatus = db.prepare(`
            INSERT INTO official_status
            (
                employee_id,
                presence,
                availability,
                updated_at
            )
            VALUES (?, ?, ?, ?)
        `);

        addStatus.run(
            employee_id,
            "ABSENT",
            "AVAILABLE",
            new Date().toISOString()
        );


        // ==========================================
        // SUCCESS
        // ==========================================

        res.status(201).json({
            success: true,
            message: "Employee and face registered successfully",
            employee_id: employee_id
        });


    } catch (error) {

        console.error(
            "Error adding employee:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Failed to add employee"
        });
    }
});


module.exports = router;