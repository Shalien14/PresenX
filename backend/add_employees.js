const db = require("./database/database");

// Add test employees
const addEmployee = db.prepare(`
    INSERT INTO employees
    (employee_id, name, designation, department, room)
    VALUES (?, ?, ?, ?, ?)
`);

addEmployee.run(
    "EMP001",
    "Kamal",
    "Manager",
    "Health Administration",
    "Room 402"
);

addEmployee.run(
    "EMP002",
    "Nimal",
    "Clerk",
    "Finance & Taxation",
    "Room 205"
);

addEmployee.run(
    "EMP003",
    "Sarah",
    "Officer",
    "Legal Affairs",
    "Room 110"
);

console.log("Employees added successfully.");