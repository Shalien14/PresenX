const express = require("express");
const db = require("../database/database");

const router=express.Router()

router.get("/employees",(req,res)=>{
    const employees = db.prepare(`
        SELECT employee_id, name, destiation
        FROM employees
        ORDER BY employee_id
    `).all();

    res.json({
        success: true,
        employees: employees

    })
})

module.exports=router