const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../database/database");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const upload = multer({
    storage: multer.memoryStorage()
});

// GENERATE TEMPORARY PASSWORD
function generateTemporaryPassword() {
    return crypto.randomBytes(18).toString("base64url");
}

function requireManager(req, res, next) {
    const user = req.session?.user;

    if (!user || user.role !== "admin") {
        return res.status(401).json({
            success: false,
            error: "Manager login required"
        });
    }

    next();
}

// ==========================================
// GET ALL EMPLOYEES
// ==========================================
router.get("/", (req, res) => {
    try {

        const organisationId = req.query.organisationId;

        let employees;

        if (organisationId) {
            employees = db.prepare(`
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
                    AND s.organisation_id = e.organisation_id
                WHERE e.organisation_id = ?
                ORDER BY e.employee_id
            `).all(organisationId);
        } else {
            employees = db.prepare(`
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
                    AND s.organisation_id = e.organisation_id
                ORDER BY e.employee_id
            `).all();
        }

        res.json({
            success: true,
            employees
        });

    } catch (error) {
        console.error("Error fetching employees:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// ==========================================
// ADD EMPLOYEE + REGISTER FACE
// ==========================================
router.post("/", requireManager, upload.single("image"), async (req, res) => {

    const {
        employee_id,
        name,
        designation,
        department,
        room
    } = req.body;

    // Get organization ID from authenticated manager session
    const organisationId = req.session.user.organisationId;

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
            AND organisation_id = ?
        `).get(employee_id,organisationId );

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
        // Generate a temporary password
        const temporaryPassword = generateTemporaryPassword();

        // Hash the temporary password
        const hashedPassword = await bcrypt.hash(
            temporaryPassword,
            12
        );

        // Set temporary password expiry to 24 hours
        const expiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        ).toISOString();
        
        const addEmployee = db.prepare(`
            INSERT INTO employees
            (
                organisation_id,
                employee_id,
                name,
                designation,
                department,
                room,
                password,
                must_change_password,
                temp_password_expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        addEmployee.run(
            organisationId,
            employee_id,
            name,
            designation,
            department,
            room,
            hashedPassword,
            1,
            expiresAt
        );

        // ==========================================
        // CREATE INITIAL OFFICIAL STATUS
        // ==========================================

        const addStatus = db.prepare(`
            INSERT INTO official_status
            (
                organisation_id,
                employee_id,
                presence,
                availability,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?)
        `);

        addStatus.run(
            organisationId,
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
            employee_id: employee_id,
            temporaryPassword: temporaryPassword
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