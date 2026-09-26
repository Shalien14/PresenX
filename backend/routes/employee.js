const express = require("express");
const db = require("../database/database");

const router=express.Router()

router.get("/employees",(req,res)=>{
    const employees = db.prepare(`
        SELECT
            e.employee_id,
            e.name,
            e.designation,
            e.department,
            e.room,
            COALESCE(s.availability, 'AVAILABLE') AS availability,
            COALESCE(s.updated_at, datetime('now')) AS updated_at
        FROM employees e
        LEFT JOIN official_status s ON s.employee_id = e.employee_id
        ORDER BY e.employee_id
    `).all();

    res.json({
        success: true,
        employees: employees

    })
})

module.exports=router