
const express = require("express");
const crypto = require("node:crypto");
const db = require("../database/database");

const {
    startMonitoring,
    recognizeEmployee
} = require("../services/employeeMonitoring");

const router = express.Router();

// ============================================================
// CAMERA AUTHENTICATION
// ============================================================

// backend/.env example:
// PRESENX_CAMERA_KEYS_JSON={"1":"LONG_RANDOM_KEY_FOR_ORG_1","6":"LONG_RANDOM_KEY_FOR_ORG_6"}

function cameraOrganisation(req) {
    const supplied = req.get("x-presenx-camera-key");

    if (!supplied || typeof supplied !== "string") {
        return null;
    }

    const keys = JSON.parse(
        process.env.PRESENX_CAMERA_KEYS_JSON || "{}"
    );

    for (const [id, secret] of Object.entries(keys)) {
        if (typeof secret !== "string" || secret.length < 32) {
            continue;
        }

        const suppliedBuffer = Buffer.from(supplied);
        const secretBuffer = Buffer.from(secret);

        if (
            suppliedBuffer.length === secretBuffer.length &&
            crypto.timingSafeEqual(suppliedBuffer, secretBuffer)
        ) {
            const organisationId = Number(id);

            if (
                Number.isSafeInteger(organisationId) &&
                organisationId > 0
            ) {
                return organisationId;
            }
        }
    }

    return null;
}

function requireCamera(req, res, next) {
    try {
        const organisationId = cameraOrganisation(req);

        if (!organisationId) {
            return res.status(401).json({
                success: false,
                message: "Camera authentication required"
            });
        }

        req.cameraOrganisationId = organisationId;
        next();

    } catch (error) {
        console.error("Camera authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Camera configuration error"
        });
    }
}

function requireOrganisationAccess(req, res, next) {
    try {
        const suppliedCameraKey = req.get("x-presenx-camera-key");

        if (suppliedCameraKey) {
            const organisationId = cameraOrganisation(req);

            if (!organisationId) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid camera credentials"
                });
            }

            req.authorisedOrganisationId = organisationId;
            req.isCameraRequest = true;
            return next();
        }

        const user = req.session?.user;

        if (!user?.organisationId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        req.authorisedOrganisationId = Number(user.organisationId);
        req.isCameraRequest = false;
        next();

    } catch (error) {
        console.error("Organisation access error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication configuration error"
        });
    }
}

// ============================================================
// GET EMPLOYEES FOR THIS CAMERA
// ============================================================

router.get("/monitoring/employees", requireCamera, (req, res) => {
    try {
        const employees = db.prepare(`
            SELECT employee_id
            FROM employees
            WHERE organisation_id = ?
            ORDER BY employee_id
        `).all(req.cameraOrganisationId);

        return res.json({
            success: true,
            employees
        });

    } catch (error) {
        console.error("Camera employee list error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve camera employees"
        });
    }
});

// ============================================================
// RECORD EMPLOYEE ATTENDANCE
// ============================================================

router.post("/attendance", requireOrganisationAccess, (req, res) => {
    try {
        const { employeeId, status, date, time } = req.body;
        const organisationId = req.authorisedOrganisationId;

        if (!employeeId || !status || !date || !time) {
            return res.status(400).json({
                success: false,
                message: "employeeId, status, date and time are required."
            });
        }

        if (!["ENTRY", "EXIT"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid attendance status."
            });
        }

        if (
            !req.isCameraRequest &&
            req.session?.user?.role === "official" &&
            req.session.user.employeeId !== employeeId
        ) {
            return res.status(403).json({
                success: false,
                message: "Cannot record another employee's attendance"
            });
        }

        const employee = db.prepare(`
            SELECT employee_id, name, organisation_id
            FROM employees
            WHERE employee_id = ?
              AND organisation_id = ?
        `).get(employeeId, organisationId);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found."
            });
        }

        const existing = db.prepare(`
            SELECT id
            FROM attendance_events
            WHERE employee_id = ?
              AND organisation_id = ?
              AND date = ?
              AND status = ?
            LIMIT 1
        `).get(employeeId, organisationId, date, status);

        const presence = status === "ENTRY"
            ? "PRESENT"
            : "ABSENT";

        const updatedAt = new Date().toISOString();

        const updateStatus = db.transaction(() => {
            if (status === "EXIT") {
                db.prepare(`
                    UPDATE official_status
                    SET presence = 'ABSENT',
                        availability = 'ABSENT',
                        updated_at = ?
                    WHERE employee_id = ?
                      AND organisation_id = ?
                `).run(updatedAt, employeeId, organisationId);

            } else {
                db.prepare(`
                    UPDATE official_status
                    SET presence = 'PRESENT',
                        availability = CASE
                            WHEN availability = 'ON OFFICIAL DUTY'
                            THEN 'ON OFFICIAL DUTY'
                            ELSE 'AVAILABLE'
                        END,
                        updated_at = ?
                    WHERE employee_id = ?
                      AND organisation_id = ?
                `).run(updatedAt, employeeId, organisationId);
            }

            db.prepare(`
                DELETE FROM employee_monitoring
                WHERE employee_id = ?
                  AND organisation_id = ?
            `).run(employeeId, organisationId);

            if (existing) {
                return {
                    attendanceId: existing.id,
                    alreadyRecorded: true
                };
            }

            const result = db.prepare(`
                INSERT INTO attendance_events
                    (employee_id, organisation_id, status, date, time)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                employeeId,
                organisationId,
                status,
                date,
                time
            );

            return {
                attendanceId: result.lastInsertRowid,
                alreadyRecorded: false
            };
        })();

        return res.status(
            updateStatus.alreadyRecorded ? 200 : 201
        ).json({
            success: true,
            message: updateStatus.alreadyRecorded
                ? "Attendance already recorded."
                : "Attendance recorded successfully.",
            attendanceId: updateStatus.attendanceId,
            employeeId,
            presence
        });

    } catch (error) {
        console.error("Attendance error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to record attendance"
        });
    }
});

// ============================================================
// GET EMPLOYEE ATTENDANCE HISTORY
// ============================================================

router.get(
    "/employees/:employeeId/attendance",
    requireOrganisationAccess,
    (req, res) => {
        try {
            const employeeId = req.params.employeeId;
            const organisationId = req.authorisedOrganisationId;
            const { date } = req.query;

            if (
                !req.isCameraRequest &&
                req.session?.user?.role === "official" &&
                req.session.user.employeeId !== employeeId
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            const employee = db.prepare(`
                SELECT employee_id, name, designation
                FROM employees
                WHERE employee_id = ?
                  AND organisation_id = ?
            `).get(employeeId, organisationId);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found."
                });
            }

            let attendance;

            if (date) {
                attendance = db.prepare(`
                    SELECT id, status, date, time
                    FROM attendance_events
                    WHERE employee_id = ?
                      AND organisation_id = ?
                      AND date = ?
                    ORDER BY time ASC
                `).all(employeeId, organisationId, date);

            } else {
                attendance = db.prepare(`
                    SELECT id, status, date, time
                    FROM attendance_events
                    WHERE employee_id = ?
                      AND organisation_id = ?
                      AND date >= date(
                          'now',
                          '-' || (
                              (CAST(strftime('%w', 'now') AS INTEGER) + 6) % 7
                          ) || ' days'
                      )
                      AND date <= date('now')
                    ORDER BY date ASC, time ASC
                `).all(employeeId, organisationId);
            }

            return res.json({
                success: true,
                employee,
                attendance
            });

        } catch (error) {
            console.error("Attendance history error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve attendance"
            });
        }
    }
);

// ============================================================
// GET CURRENT OFFICIAL STATUS
// ============================================================

router.get(
    "/employees/:employeeId/status",
    requireOrganisationAccess,
    (req, res) => {
        try {
            const employeeId = req.params.employeeId;
            const organisationId = req.authorisedOrganisationId;

            const status = db.prepare(`
                SELECT employee_id, presence, availability, updated_at
                FROM official_status
                WHERE employee_id = ?
                  AND organisation_id = ?
            `).get(employeeId, organisationId);

            if (!status) {
                return res.status(404).json({
                    success: false,
                    message: "Official status not found."
                });
            }

            return res.json({
                success: true,
                status
            });

        } catch (error) {
            console.error("Official status error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve status"
            });
        }
    }
);

// ============================================================
// MANUALLY UPDATE OFFICIAL AVAILABILITY
// ============================================================

router.put(
    "/employees/:employeeId/status",
    requireOrganisationAccess,
    (req, res) => {
        try {
            const employeeId = req.params.employeeId;
            const organisationId = req.authorisedOrganisationId;
            const { availability } = req.body;

            const user = req.session?.user;

            if (
                !user ||
                (
                    user.role !== "admin" &&
                    user.employeeId !== employeeId
                )
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Not allowed to update status"
                });
            }

            const allowedStatuses = [
                "AVAILABLE",
                "TEMPORARILY UNAVAILABLE",
                "ON OFFICIAL DUTY",
                "ABSENT"
            ];

            if (!allowedStatuses.includes(availability)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid availability status."
                });
            }

            const employee = db.prepare(`
                SELECT employee_id
                FROM official_status
                WHERE employee_id = ?
                  AND organisation_id = ?
            `).get(employeeId, organisationId);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Official status not found."
                });
            }

            const updatedAt = new Date().toISOString();

            db.transaction(() => {
                db.prepare(`
                    UPDATE official_status
                    SET availability = ?,
                        presence = CASE
                            WHEN ? = 'ABSENT'
                            THEN 'ABSENT'
                            ELSE 'PRESENT'
                        END,
                        updated_at = ?
                    WHERE employee_id = ?
                      AND organisation_id = ?
                `).run(
                    availability,
                    availability,
                    updatedAt,
                    employeeId,
                    organisationId
                );

                db.prepare(`
                    DELETE FROM employee_monitoring
                    WHERE employee_id = ?
                      AND organisation_id = ?
                `).run(employeeId, organisationId);
            })();

            return res.json({
                success: true,
                message: "Availability updated successfully.",
                availability,
                updated_at: updatedAt
            });

        } catch (error) {
            console.error("Manual availability error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update availability"
            });
        }
    }
);

// ============================================================
// GET TODAY'S ATTENDANCE
// ============================================================

router.get("/attendance", requireOrganisationAccess, (req, res) => {
    try {
        const { date } = req.query;
        const organisationId = req.authorisedOrganisationId;

        const attendanceDate =
            date || new Date().toISOString().slice(0, 10);

        const attendance = db.prepare(`
            SELECT
                a.id,
                a.employee_id,
                e.name,
                a.status,
                a.date,
                a.time
            FROM attendance_events a
            JOIN employees e
                ON a.employee_id = e.employee_id
            WHERE a.date = ?
              AND e.organisation_id = ?
              AND (
                  a.organisation_id = ?
                  OR a.organisation_id IS NULL
              )
            ORDER BY a.time ASC
        `).all(
            attendanceDate,
            organisationId,
            organisationId
        );

        return res.json({
            success: true,
            attendance
        });

    } catch (error) {
        console.error("Today's attendance error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve today's attendance"
        });
    }
});

// ============================================================
// CAMERA: EMPLOYEE RECOGNIZED
// ============================================================

router.post(
    "/monitoring/recognized",
    requireCamera,
    (req, res) => {
        try {
            const { employeeId } = req.body;
            const organisationId = req.cameraOrganisationId;

            if (
                typeof employeeId !== "string" ||
                !employeeId.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid employeeId required."
                });
            }

            const restored = recognizeEmployee(
                employeeId,
                organisationId
            );

            return res.json({
                success: true,
                restored
            });

        } catch (error) {
            console.error("Recognition monitoring error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update recognition status"
            });
        }
    }
);

// ============================================================
// CAMERA: VALID EMPTY SESSION
// ============================================================

router.post(
    "/monitoring/empty-session",
    requireCamera,
    (req, res) => {
        try {
            const organisationId = req.cameraOrganisationId;

            const employees = db.prepare(`
                SELECT e.employee_id
                FROM employees e
                JOIN official_status s
                    ON s.employee_id = e.employee_id
                   AND s.organisation_id = e.organisation_id
                WHERE e.organisation_id = ?
                  AND s.presence = 'PRESENT'
                  AND s.availability IN (
                      'AVAILABLE',
                      'TEMPORARILY UNAVAILABLE'
                  )
            `).all(organisationId);

            let started = 0;

            for (const employee of employees) {
                if (
                    startMonitoring(
                        employee.employee_id,
                        organisationId
                    )
                ) {
                    started++;
                }
            }

            return res.json({
                success: true,
                eligibleEmployees: employees.length,
                timersStarted: started
            });

        } catch (error) {
            console.error("Empty-session monitoring error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to process monitoring session"
            });
        }
    }
);

// ============================================================
// CAMERA: COMPLETE RECOGNITION SESSION
// ============================================================

router.post(
    "/monitoring/session-result",
    requireCamera,
    (req, res) => {
        try {
            const { recognizedEmployeeIds } = req.body;
            const organisationId = req.cameraOrganisationId;

            if (
                !Array.isArray(recognizedEmployeeIds) ||
                !recognizedEmployeeIds.every(
                    id => typeof id === "string" && id.trim()
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid monitoring session data."
                });
            }

            const recognized = new Set(recognizedEmployeeIds);

            // Reject employee IDs belonging to other organizations.
            for (const employeeId of recognized) {
                const member = db.prepare(`
                    SELECT 1
                    FROM employees
                    WHERE employee_id = ?
                      AND organisation_id = ?
                `).get(employeeId, organisationId);

                if (!member) {
                    return res.status(400).json({
                        success: false,
                        message: "Employee not assigned to this camera"
                    });
                }
            }

            let monitoringStarted = 0;
            let availabilityRestored = 0;

            db.transaction(() => {
                const employees = db.prepare(`
                    SELECT e.employee_id
                    FROM employees e
                    JOIN official_status s
                        ON s.employee_id = e.employee_id
                       AND s.organisation_id = e.organisation_id
                    WHERE e.organisation_id = ?
                      AND s.presence = 'PRESENT'
                      AND s.availability IN (
                          'AVAILABLE',
                          'TEMPORARILY UNAVAILABLE'
                      )
                `).all(organisationId);

                // Recognized employees become AVAILABLE.
                for (const employeeId of recognized) {
                    if (
                        recognizeEmployee(
                            employeeId,
                            organisationId
                        )
                    ) {
                        availabilityRestored++;
                    }
                }

                // Missing PRESENT employees start monitoring.
                for (const employee of employees) {
                    if (!recognized.has(employee.employee_id)) {
                        if (
                            startMonitoring(
                                employee.employee_id,
                                organisationId
                            )
                        ) {
                            monitoringStarted++;
                        }
                    }
                }
            })();

            return res.json({
                success: true,
                recognizedCount: recognized.size,
                availabilityRestored,
                monitoringStarted
            });

        } catch (error) {
            console.error("Session monitoring error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to process recognition session"
            });
        }
    }
);

module.exports = router;
