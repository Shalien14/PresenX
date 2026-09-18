const db = require("./database/database");

// Add test employees
const addEmployee = db.prepare(`
    INSERT INTO employees (employee_id, name, destination)
    VALUES (?, ?, ?)
`);

addEmployee.run("EMP001", "Kamal", "Manager");
addEmployee.run("EMP002", "Nimal", "Clerk");
addEmployee.run("EMP003", "Sarah", "Officer");

console.log("Employees added successfully.");