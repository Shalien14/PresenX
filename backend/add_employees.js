const db = require("./database/database");

const addEmployee = db.prepare(`
    INSERT OR IGNORE INTO employees
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


const addStatus = db.prepare(`
    INSERT OR IGNORE INTO official_status
    (employee_id, presence, availability, updated_at)
    VALUES (?, ?, ?, ?)
`);

const initialStatuses = [
    "EMP001",
    "EMP002",
    "EMP003"
];

for (const employeeId of initialStatuses) {
    addStatus.run(
        employeeId,
        "PRESENT",
        "AVAILABLE",
        new Date().toISOString()
    );
}

console.log("Database seed completed.");