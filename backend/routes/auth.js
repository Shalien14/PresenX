const express = require("express");
const router = express.Router();

const db = require("../database/database");
const bcrypt = require("bcrypt");

// Helper: create a fresh authenticated session
function createLoginSession(req, user) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) {
                return reject(error);
            }

            req.session.user = user;

            req.session.save((saveError) => {
                if (saveError) {
                    return reject(saveError);
                }

                resolve();
            });
        });
    });
}

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const {
            role,
            organisationId,
            employeeId,
            password
        } = req.body;

        if (
            !["official", "admin"].includes(role) ||
            !organisationId ||
            !employeeId ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                error: "Please provide valid login details"
            });
        }

        // ====================
        // OFFICIAL LOGIN
        // ====================

        if (role === "official") {
            const employee = db.prepare(`
                SELECT *
                FROM employees
                WHERE employee_id = ?
                AND organisation_id = ?
            `).get(employeeId, organisationId);

            if (!employee) {
                return res.status(401).json({
                    success: false,
                    error: "Invalid Employee ID or Password"
                });
            }

            const passwordMatches = await bcrypt.compare(
                password,
                employee.password
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    error: "Invalid Employee ID or Password"
                });
            }

            // Check temporary password expiry
            if (
                employee.must_change_password === 1 &&
                employee.temp_password_expires_at
            ) {
                const expiryTime = Date.parse(
                    employee.temp_password_expires_at
                );

                if (
                    !Number.isFinite(expiryTime) ||
                    Date.now() >= expiryTime
                ) {
                    return res.status(403).json({
                        success: false,
                        error: "Temporary password has expired. Please contact your manager."
                    });
                }
            }

            // Create a new authenticated employee session
            await createLoginSession(req, {
                role: "official",
                employeeId: employee.employee_id,
                organisationId: employee.organisation_id
            });

            return res.json({
                success: true,
                role: "official",
                employee: {
                    employee_id: employee.employee_id,
                    name: employee.name,
                    designation: employee.designation,
                    department: employee.department,
                    organisation_id: employee.organisation_id,
                    must_change_password: employee.must_change_password
                }
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
                
            );



            if (!organisation) {
                return res.status(401).json({
                    success: false,
                    error: "Invalid Manager Credentials"
                });
            }

            const validPassword = await bcrypt.compare(
    password,
    organisation.password
);

if (!validPassword) {
    return res.status(401).json({
        success: false,
        error: "Invalid Manager Credentials"
    });
}


            // Create a new authenticated manager session
            await createLoginSession(req, {
                role: "admin",
                organisationId: organisation.id
            });

            return res.json({
                success: true,
                role: "admin",
                organisation: {
                    id: organisation.id,
                    office_name: organisation.office_name,
                    username: organisation.username
                }
            });
        }

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});


// ====================================
// EMPLOYEE FIRST-TIME PASSWORD CHANGE
// ====================================

router.post("/change-password", async (req, res) => {
    try {
        // Check whether the user has an authenticated session
        const user = req.session?.user;

        if (!user || user.role !== "official") {
            return res.status(401).json({
                success: false,
                error: "Employee login required"
            });
        }

        const { newPassword } = req.body;

        // Validate the new password
        if (
            typeof newPassword !== "string" ||
            newPassword.length < 12 ||
            newPassword.length > 128
        ) {
            return res.status(400).json({
                success: false,
                error: "Password must contain 12 to 128 characters"
            });
        }

        // Get the employee from the authenticated session
        const employee = db.prepare(`
            SELECT employee_id, organisation_id,
                   must_change_password
            FROM employees
            WHERE employee_id = ?
              AND organisation_id = ?
        `).get(
            user.employeeId,
            user.organisationId
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee not found"
            });
        }

        // This endpoint is only for first-time password setup
        if (employee.must_change_password !== 1) {
            return res.status(403).json({
                success: false,
                error: "Initial password setup is already completed"
            });
        }

        // Hash the new password before saving
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update the employee's password
        db.prepare(`
            UPDATE employees
            SET password = ?,
                must_change_password = 0,
                temp_password_expires_at = NULL
            WHERE employee_id = ?
              AND organisation_id = ?
              AND must_change_password = 1
        `).run(
            hashedPassword,
            user.employeeId,
            user.organisationId
        );

        return res.json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Password Change Error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to update password"
        });
    }
});


module.exports = router;
