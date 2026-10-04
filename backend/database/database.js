const Database=require("better-sqlite3")
const path = require("path")
const db=new Database(path.join(__dirname, "presenx.db"))

////
console.log("database connected successfully")

// Employees table
db.prepare(`
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        designation TEXT NOT NULL,
        department TEXT NOT NULL,
        room TEXT NOT NULL
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

// Current official status
db.prepare(`
    CREATE TABLE IF NOT EXISTS official_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        presence TEXT NOT NULL CHECK(presence IN ('PRESENT', 'ABSENT')),
        availability TEXT NOT NULL CHECK(
            availability IN (
                'AVAILABLE',
                'TEMPORARILY UNAVAILABLE',
                'ON OFFICIAL DUTY'
            )
        ),
        updated_at TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    )
`).run();

//create torganisation
db.prepare(`
    CREATE TABLE IF NOT EXISTS organisations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        office_name VARCHAR(150) NOT NULL,
        office_type VARCHAR(150) NOT NULL,
        registration_no VARCHAR(150) NOT NULL,
        address TEXT,
        email VARCHAR(150) NOT NULL,
        contact_number VARCHAR(30) NOT NULL,
        official_website VARCHAR(255),
        description VARCHAR(150),
        registration_document BLOB NOT NULL,
        registration_document_type VARCHAR(100),
        authorisation_document BLOB NOT NULL,
        authorisation_document_type VARCHAR(100),
        status TEXT NOT NULL CHECK (
            status IN ('accepted', 'rejected', 'pending')
        ),
        submitted_at DATETIME DEFAULT (
            datetime('now', '+5 hours', '+30 minutes')
        )
    )
`).run();

db.prepare(`
    INSERT OR IGNORE INTO official_status
    (employee_id, presence, availability, updated_at)
    SELECT employee_id, 'ABSENT', 'AVAILABLE', datetime('now')
    FROM employees
`).run();

console.log("Database tables are ready")
module.exports=db