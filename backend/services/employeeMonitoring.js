
const db = require("../database/database");

const MONITORING_DURATION_MS = 2 * 60 * 1000;

// ============================================================
// START EMPLOYEE AVAILABILITY MONITORING
// ============================================================

function startMonitoring(employeeId, organisationId) {
    return db.transaction(() => {
        const employee = db.prepare(`
            SELECT e.employee_id
            FROM employees e
            JOIN official_status s
                ON s.employee_id = e.employee_id
            WHERE e.employee_id = ?
              AND e.organisation_id = ?
              AND s.organisation_id = ?
              AND s.presence = 'PRESENT'
              AND s.availability IN (
                  'AVAILABLE',
                  'TEMPORARILY UNAVAILABLE'
              )
        `).get(employeeId, organisationId, organisationId);

        if (!employee) return false;

        const startedAt = new Date();
        const expiresAt = new Date(
            startedAt.getTime() + MONITORING_DURATION_MS
        );

        // Existing timers are never restarted.
        const result = db.prepare(`
            INSERT OR IGNORE INTO employee_monitoring (
                employee_id,
                organisation_id,
                started_at,
                expires_at
            )
            VALUES (?, ?, ?, ?)
        `).run(
            employeeId,
            organisationId,
            startedAt.toISOString(),
            expiresAt.toISOString()
        );

        if (result.changes === 0) {
            return false;
        }

        db.prepare(`
            UPDATE official_status
            SET availability = 'TEMPORARILY UNAVAILABLE',
                updated_at = ?
            WHERE employee_id = ?
              AND organisation_id = ?
              AND presence = 'PRESENT'
              AND availability = 'AVAILABLE'
        `).run(
            startedAt.toISOString(),
            employeeId,
            organisationId
        );

        return true;
    })();
}

// ============================================================
// RESTORE AVAILABILITY AFTER RECOGNITION
// ============================================================

function recognizeEmployee(employeeId, organisationId) {
    return db.transaction(() => {
        const employee = db.prepare(`
            SELECT e.employee_id, s.availability
            FROM employees e
            JOIN official_status s
                ON s.employee_id = e.employee_id
            WHERE e.employee_id = ?
              AND e.organisation_id = ?
              AND s.organisation_id = ?
        `).get(employeeId, organisationId, organisationId);

        if (!employee) return false;

        // Preserve manually assigned official-duty status.
        if (employee.availability === "ON OFFICIAL DUTY") {
            return false;
        }

        // Recognition cancels the employee's monitoring timer.
        db.prepare(`
            DELETE FROM employee_monitoring
            WHERE employee_id = ?
              AND organisation_id = ?
        `).run(employeeId, organisationId);

        // Restore presence and availability.
        db.prepare(`
            UPDATE official_status
            SET presence = 'PRESENT',
                availability = 'AVAILABLE',
                updated_at = ?
            WHERE employee_id = ?
              AND organisation_id = ?
        `).run(
            new Date().toISOString(),
            employeeId,
            organisationId
        );

        return true;
    })();
}

// ============================================================
// PROCESS EXPIRED MONITORING DEADLINES
// ============================================================

function processExpiredMonitoring() {
    const now = new Date().toISOString();

    return db.transaction(() => {
        const expired = db.prepare(`
            SELECT m.employee_id, m.organisation_id
            FROM employee_monitoring m
            JOIN employees e
                ON e.employee_id = m.employee_id
               AND e.organisation_id = m.organisation_id
            JOIN official_status s
                ON s.employee_id = m.employee_id
               AND s.organisation_id = m.organisation_id
            WHERE m.expires_at <= ?
              AND s.presence = 'PRESENT'
              AND s.availability = 'TEMPORARILY UNAVAILABLE'
        `).all(now);

        let updated = 0;

        for (const employee of expired) {
            const result = db.prepare(`
                UPDATE official_status
                SET presence = 'ABSENT',
                    availability = 'ABSENT',
                    updated_at = ?
                WHERE employee_id = ?
                  AND organisation_id = ?
                  AND presence = 'PRESENT'
                  AND availability = 'TEMPORARILY UNAVAILABLE'
            `).run(
                now,
                employee.employee_id,
                employee.organisation_id
            );

            updated += result.changes;
        }

        // Clear completed and stale deadlines.
        db.prepare(`
            DELETE FROM employee_monitoring
            WHERE expires_at <= ?
        `).run(now);

        return updated;
    })();
}

module.exports = {
    startMonitoring,
    recognizeEmployee,
    processExpiredMonitoring
};
