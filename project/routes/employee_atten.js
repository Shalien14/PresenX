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
        SELECT employee_id, name, destination
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
 

module.exports=router