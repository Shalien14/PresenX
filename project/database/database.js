const Database=require("better-sqlite3")
const db=new Database("database/presenx.db")

////
console.log("database connected successfully")

// Employees table
db.prepare(`
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        destination TEXT NOT NULL
    )
`).run();


// Attendance events table
db.prepare(`
    CREATE TABLE IF NOT EXISTS attendance_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('ENTRY', 'EXIT')),
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    )
`).run();

console.log("Database tables are ready")
module.exports=db