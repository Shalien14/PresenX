const express = require("express");
const db = require("../database/database");

const router = express.Router();

// Get all employees
router.get("/employees", (req, res) => {
    const employees = db.prepare(`
        SELECT * FROM employees
    `).all();

    res.json({
        success: true,
        employees: employees
    });
});


// Get one employee using employee ID
router.get("/employees:employee_ID", (req, res) => {

    const id = req.params.employee_ID;

    const employee = db.prepare(`
        SELECT * FROM employees
        WHERE employee_ID = ?
    `).get(id);

    if (!employee) {
        return res.status(404).json({
            success: false,
            message: "Employee not found"
        });
    }

    res.json({
        success: true,
        employee: employee
    });
});


// Add a new employee
router.post("/employees", (req, res) => {
    const lastEmployee=db.prepare(`
        SELECT employee_ID FROM employees ORDER BY employee_ID 
        DESC LIMIT 1
        `).get()
    let number=1
    if (lastEmployee){
        number=parseInt(lastEmployee.employee_id.replace("EM",""))+1
    }

    const employee_ID = `EM${String(number).padStart(3,"0")}`
    const name = req.body.name;
    const designation = req.body.designation;
    console.log("BODY:", req.body);
    try {

        const employee = db.prepare(`
            INSERT INTO employees
            (employee_ID, name, designation)
            VALUES (?, ?, ?)
        `).run(
            employee_ID,
            name,
            designation
        );
        

        res.status(201).json({
            success: true,
            message: "Employee successfully added",
            employee: {
                employee_ID: employee_ID,
                name: name,
                designation: designation
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to add employee"
        });
    }
});

//editing the data
router.patch("/employees:employee_ID",(req,res)=>{
    const id=req.params.employee_ID
    const {name, designation}=req.body
    try {
        const employee=db.prepare(`
            UPDATE employees SET
            name=COALESCE(?,name),
            destination=COALESEC(?,designation)
            WHERE employee_id=?
            `).run (name,designation,id)
            if (result.changes===0){
                return res.status(404).json({
                    success: false,
                    message:"Employee not found"
                })
            }
            res.json({
                success: true,
                message:"Employees successfully updated"
            })
    } catch (error){
        console.error(error)
        res.status(500).json({
            success:false,
            message: "failed to update"
        })
    }

})

//delete employees
router.delete("/employees/:employee_ID",(req,res)=>{
    const id=req.params.employee_ID
    const employee=db.prepare(`
        DELETE FROM employees WHERE employee_id=?
        `).run(id)
    if (employee.changes===0){
        return res.status(404).json({
            success:false,
            message:"employee not found"
        })
    }
    res.json({
        success: true,
        message:"Employee deleted successfully"
    })
})

module.exports = router;