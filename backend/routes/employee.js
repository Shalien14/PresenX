const express = require("express");
const router = express.Router();

const db = require("../database/database");

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
// ADD EMPLOYEE
// ==========================================
router.post("/", (req, res) => {

    const {
        employee_id,
        name,
        designation,
        department,
        room
    } = req.body;

    // Validate required fields
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

    try {

        // ------------------------------
        // Add employee
        // ------------------------------
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


        // ------------------------------
        // Create initial official status
        // ------------------------------
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


        res.status(201).json({
            success: true,
            message: "Employee added successfully"
        });

    } catch (error) {

        // Duplicate employee ID
        if (error.message.includes("UNIQUE")) {

            return res.status(409).json({
                success: false,
                error: "Employee ID already exists"
            });
        }

        console.error("Error adding employee:", error);

        res.status(500).json({
            success: false,
            error: "Failed to add employee"
        });
    }
});


module.exports = router;