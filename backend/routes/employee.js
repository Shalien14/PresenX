const express = require("express");
const router = express.Router();

const db = require("../database/database");

// GET all employees
router.get("/", (req, res) => {
    try {
        const employees = db.prepare(`
            SELECT employee_id, name, designation, department, room
            FROM employees
        `).all();

        res.json({
            employees: employees
        });

    } catch (error) {
        console.error("Error fetching employees:", error);

        res.status(500).json({
            error: "Failed to fetch employees"
        });
    }
});

// ADD employee
router.post("/", (req, res) => {

    const {
        employee_id,
        name,
        designation,
        department,
        room
    } = req.body;

    // Validate
    if (
        !employee_id ||
        !name ||
        !designation ||
        !department ||
        !room
    ) {
        return res.status(400).json({
            error: "All fields are required"
        });
    }

    try {

        // Add employee
        const addEmployee = db.prepare(`
            INSERT INTO employees
            (employee_id, name, designation, department, room)
            VALUES (?, ?, ?, ?, ?)
        `);

        addEmployee.run(
            employee_id,
            name,
            designation,
            department,
            room
        );

        // Create initial status
        const addStatus = db.prepare(`
            INSERT INTO official_status
            (employee_id, presence, availability, updated_at)
            VALUES (?, ?, ?, ?)
        `);

        addStatus.run(
            employee_id,
            "ABSENT",
            "AVAILABLE",
            new Date().toISOString()
        );

        res.status(201).json({
            message: "Employee added successfully"
        });

    } catch (error) {

        if (error.message.includes("UNIQUE")) {
            return res.status(409).json({
                error: "Employee ID already exists"
            });
        }

        console.error(error);

        res.status(500).json({
            error: "Failed to add employee"
        });
    }
});

module.exports = router;