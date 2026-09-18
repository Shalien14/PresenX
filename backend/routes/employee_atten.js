const express=require("express")
const db =require("../database/database")

const router =express.Router()

router.post("/attendance",(req,res)=>{
    const { employeeId, status, date, time } = req.body;

const result = db.prepare(`
        INSERT INTO attendance_events
        (employee_id, status, date, time)
        VALUES (?, ?, ?, ?)
    `).run(employeeId, status , date, time);

////
res.status(201).json({
        success: true,
        message: "Attendance recorded successfully.",
        attendanceId: result.lastInsertRowid
    });
})


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

module.exports=router