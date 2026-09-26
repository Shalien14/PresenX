const express=require("express")
const db =require("../database/database")

const router =express.Router()

router.post("/attendance", (req, res) => {

    const { employeeId, status, date, time } = req.body;

    // Validate required fields
    if (!employeeId || !status || !date || !time) {
        return res.status(400).json({
            success: false,
            message: "employeeId, status, date and time are required."
        });
    }

    // Validate attendance status
    if (!["ENTRY", "EXIT"].includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid attendance status."
        });
    }

    // Check employee exists
    const employee = db.prepare(`
        SELECT employee_id, name
        FROM employees
        WHERE employee_id = ?
    `).get(employeeId);

    if (!employee) {
        return res.status(404).json({
            success: false,
            message: "Employee not found."
        });
    }

    // Check whether this type of attendance was already recorded today
    const existing = db.prepare(`
        SELECT id
        FROM attendance_events
        WHERE employee_id = ?
        AND date = ?
        AND status = ?
        LIMIT 1
    `).get(employeeId, date, status);

    // Determine presence from attendance event
    const presence = status === "ENTRY"
        ? "PRESENT"
        : "ABSENT";

    const updatedAt = new Date().toISOString();

    // Update presence even if attendance already exists
    db.prepare(`
        UPDATE official_status
        SET presence = ?, updated_at = ?
        WHERE employee_id = ?
    `).run(
        presence,
        updatedAt,
        employeeId
    );

    // If already recorded, don't create another attendance event
    if (existing) {
        return res.status(200).json({
            success: true,
            message: "Attendance already recorded.",
            attendanceId: existing.id,
            presence: presence
        });
    }

    // Insert new attendance event
    const result = db.prepare(`
        INSERT INTO attendance_events
        (employee_id, status, date, time)
        VALUES (?, ?, ?, ?)
    `).run(
        employeeId,
        status,
        date,
        time
    );

    res.status(201).json({
        success: true,
        message: "Attendance recorded successfully.",
        attendanceId: result.lastInsertRowid,
        employeeId: employeeId,
        presence: presence
    });
});


router.get("/employees/:employeeId/attendance",(req,res)=>{
    const employeeId=req.params.employeeId
    const{date}=req.query

    const employee = db.prepare(`
        SELECT employee_id, name, designation
        FROM employees
        WHERE employee_id = ?
    `).get(employeeId);
    
    // Check whether employee exists
    if (!employee) {

        return res.status(404).json({
            success: false,
            message: "Employee not found."
        });
    }

    let attendance

    if (date){
        attendance = db.prepare(`
            SELECT id, status, date, time
            FROM attendance_events
            WHERE employee_id = ?
            AND date = ?
            ORDER BY time ASC
        `).all(employeeId, date);
    }
    else{
        attendance = db.prepare(`
            SELECT id, status, date, time
            FROM attendance_events
            WHERE employee_id = ?

            AND date >= date(
                'now',
                '-' || (
                    (CAST(strftime('%w', 'now') AS INTEGER) + 6) % 7
                ) || ' days'
            )

            AND date <= date('now')

            ORDER BY date ASC, time ASC
        `).all(employeeId);
    }

     // Send employee and attendance data
    res.json({
        success: true,
        employee: employee,
        attendance: attendance
    });
})
 
// Get current official status
router.get("/employees/:employeeId/status", (req, res) => {
    const employeeId = req.params.employeeId;

    const status = db.prepare(`
        SELECT
            employee_id,
            presence,
            availability,
            updated_at
        FROM official_status
        WHERE employee_id = ?
    `).get(employeeId);

    if (!status) {
        return res.status(404).json({
            success: false,
            message: "Official status not found."
        });
    }

    res.json({
        success: true,
        status: status
    });
});

// Update official availability
router.put("/employees/:employeeId/status", (req, res) => {
    const employeeId = req.params.employeeId;
    const { availability } = req.body;

    const allowedStatuses = [
        "AVAILABLE",
        "TEMPORARILY UNAVAILABLE",
        "ON OFFICIAL DUTY"
    ];

    if (!allowedStatuses.includes(availability)) {
        return res.status(400).json({
            success: false,
            message: "Invalid availability status."
        });
    }

    const updatedAt = new Date().toISOString();

    const result = db.prepare(`
        UPDATE official_status
        SET availability = ?, updated_at = ?
        WHERE employee_id = ?
    `).run(availability, updatedAt, employeeId);

    if (result.changes === 0) {
        return res.status(404).json({
            success: false,
            message: "Official status not found."
        });
    }

    res.json({
        success: true,
        message: "Availability updated successfully.",
        availability: availability,
        updated_at: updatedAt
    });
});

router.get("/attendance", (req, res) => {

    const { date } = req.query;

    const attendanceDate = date || new Date().toISOString().slice(0, 10);

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
        ORDER BY a.time ASC
    `).all(attendanceDate);

    res.json({
        success: true,
        attendance: attendance
    });
});

module.exports=router