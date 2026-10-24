const express = require("express");
const router = express.Router();

const db = require("../database/database");

// LOGIN
router.post("/login", (req, res) => {
    try {

        const {
            role,
            organisationId,
            employeeId,
            password
        } = req.body;

        // ====================
        // OFFICIAL LOGIN
        // ====================

        if (role === "official") {

            const employee = db.prepare(`
                SELECT *
                FROM employees
                WHERE employee_id = ?
                AND organisation_id = ?
                AND password = ?
            `).get(
                employeeId,
                organisationId,
                password
            );

            if (!employee) {
                return res.status(401).json({
                    success: false,
                    error: "Invalid Employee ID or Password"
                });
            }

            return res.json({
                success: true,
                role: "official",
                employee
            });
        }

        // ====================
        // MANAGER LOGIN
        // ====================

        if (role === "admin") {

            const organisation = db.prepare(`
                SELECT *
                FROM organisations
                WHERE id = ?
                AND username = ?
                AND password = ?
                AND status = 'accepted'
            `).get(
                organisationId,
                employeeId,
                password
            );

            if (!organisation) {
                return res.status(401).json({
                    success: false,
                    error: "Invalid Manager Credentials"
                });
            }

            return res.json({
                success: true,
                role: "admin",
                organisation
            });
        }

        return res.status(400).json({
            success: false,
            error: "Invalid role"
        });

    } catch (error) {

        console.error("Login Error:", error);

        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

module.exports = router;