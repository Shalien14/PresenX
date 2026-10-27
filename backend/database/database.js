
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "presenx.db"));

console.log("database connected successfully");

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
                'ON OFFICIAL DUTY',
                'ABSENT'
            )
        ),
        updated_at TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    )
`).run();

// Create organisation table
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
        verification_document BLOB NOT NULL,
        verification_document_type VARCHAR(100),
        rejection_reason TEXT,
        status TEXT NOT NULL CHECK (
            status IN ('accepted', 'rejected', 'pending')
        ),
        submitted_at DATETIME DEFAULT (
            datetime('now', '+5 hours', '+30 minutes')
        )
    )
`).run();

// Migration: update organisations table schema
const columns = db
    .prepare("PRAGMA table_info(organisations)")
    .all();

const columnNames = new Set(
    columns.map(column => column.name)
);

// Rename legacy document columns when necessary
if (
    columnNames.has("authorisation_document") &&
    !columnNames.has("verification_document")
) {
    db.exec(`
        ALTER TABLE organisations
        RENAME COLUMN authorisation_document
        TO verification_document
    `);
}

if (
    columnNames.has("authorisation_document_type") &&
    !columnNames.has("verification_document_type")
) {
    db.exec(`
        ALTER TABLE organisations
        RENAME COLUMN authorisation_document_type
        TO verification_document_type
    `);
}

// Add rejection_reason if missing
if (!columnNames.has("rejection_reason")) {
    db.exec(`
        ALTER TABLE organisations
        ADD COLUMN rejection_reason TEXT
    `);
}

// Check attendance_events table
const tableColumns = db.prepare(
    "PRAGMA table_info(attendance_events)"
).all();

const hasOrganisationId = tableColumns.some(
    col => col.name === "organisation_id"
);

if (!hasOrganisationId) {
    db.prepare(`
        ALTER TABLE attendance_events
        ADD COLUMN organisation_id INTEGER
    `).run();
}

// Check employees table columns
const employeeColumns = db.prepare(
    "PRAGMA table_info(employees)"
).all();

// Add organisation_id if missing
if (!employeeColumns.some(col => col.name === "organisation_id")) {
    db.prepare(`
        ALTER TABLE employees
        ADD COLUMN organisation_id INTEGER
    `).run();

    console.log("Added organisation_id column");
}

// Add password if missing
if (!employeeColumns.some(col => col.name === "password")) {
    db.prepare(`
        ALTER TABLE employees
        ADD COLUMN password TEXT
    `).run();

    console.log("Added password column");
}

// Add first-time password setup flag
if (!employeeColumns.some(col => col.name === "must_change_password")) {
    db.prepare(`
        ALTER TABLE employees
        ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1
    `).run();

    console.log("Added must_change_password column");
}

// Add temporary password expiry
if (!employeeColumns.some(col => col.name === "temp_password_expires_at")) {
    db.prepare(`
        ALTER TABLE employees
        ADD COLUMN temp_password_expires_at TEXT
    `).run();

    console.log("Added temp_password_expires_at column");
}

// ============================================================
// ENSURE OFFICIAL STATUS HAS ORGANISATION ID
// ============================================================

// This must run BEFORE rebuilding official_status,
// because the migration copies organisation_id.

const officialStatusColumns = db.prepare(
    "PRAGMA table_info(official_status)"
).all();

if (!officialStatusColumns.some(col => col.name === "organisation_id")) {
    db.prepare(`
        ALTER TABLE official_status
        ADD COLUMN organisation_id INTEGER
    `).run();

    console.log("Added organisation_id to official_status");
}

// ============================================================
// MIGRATION: SUPPORT ABSENT AVAILABILITY
// ============================================================

const statusTableSql = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'official_status'
`).get()?.sql || "";

const availabilityConstraint = statusTableSql.match(
    /availability\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*availability\s+IN\s*\(([\s\S]*?)\)\s*\)/i
);

if (!availabilityConstraint) {
    throw new Error(
        "Cannot verify official_status availability constraint."
    );
}

if (!availabilityConstraint[1].includes("'ABSENT'")) {
    db.transaction(() => {
        db.exec(`
            CREATE TABLE official_status_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE NOT NULL,
                presence TEXT NOT NULL CHECK(
                    presence IN ('PRESENT', 'ABSENT')
                ),
                availability TEXT NOT NULL CHECK(
                    availability IN (
                        'AVAILABLE',
                        'TEMPORARILY UNAVAILABLE',
                        'ON OFFICIAL DUTY',
                        'ABSENT'
                    )
                ),
                updated_at TEXT NOT NULL,
                organisation_id INTEGER,
                FOREIGN KEY (employee_id)
                    REFERENCES employees(employee_id)
            );

            INSERT INTO official_status_new (
                id,
                employee_id,
                presence,
                availability,
                updated_at,
                organisation_id
            )
            SELECT
                id,
                employee_id,
                presence,
                availability,
                updated_at,
                organisation_id
            FROM official_status;

            DROP TABLE official_status;

            ALTER TABLE official_status_new
            RENAME TO official_status;
        `);
    })();

    console.log(
        "Migrated official_status to support ABSENT availability."
    );
}

// ============================================================
// ORGANISATION ACCOUNT MIGRATIONS
// ============================================================

const organisationColumns = db.prepare(
    "PRAGMA table_info(organisations)"
).all();

if (!organisationColumns.some(col => col.name === "username")) {
    db.prepare(`
        ALTER TABLE organisations
        ADD COLUMN username TEXT
    `).run();
}

if (!organisationColumns.some(col => col.name === "password")) {
    db.prepare(`
        ALTER TABLE organisations
        ADD COLUMN password TEXT
    `).run();
}

if (!organisationColumns.some(col => col.name === "account_created")) {
    db.prepare(`
        ALTER TABLE organisations
        ADD COLUMN account_created INTEGER DEFAULT 0
    `).run();
}

// ============================================================
// EMPLOYEE OFFICIAL STATUS INITIALIZATION
// ============================================================

// Create missing status records with the correct organisation ID.
db.prepare(`
    INSERT OR IGNORE INTO official_status (
        employee_id,
        presence,
        availability,
        updated_at,
        organisation_id
    )
    SELECT
        employee_id,
        'ABSENT',
        'ABSENT',
        datetime('now'),
        organisation_id
    FROM employees
`).run();

// Fix existing status records that have no organisation ID.
db.prepare(`
    UPDATE official_status
    SET organisation_id = (
        SELECT e.organisation_id
        FROM employees e
        WHERE e.employee_id = official_status.employee_id
    )
    WHERE organisation_id IS NULL
`).run();

// ============================================================
// EMPLOYEE AVAILABILITY MONITORING
// ============================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS employee_monitoring (
        employee_id TEXT PRIMARY KEY,
        organisation_id INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (employee_id)
            REFERENCES employees(employee_id)
    )
`).run();

console.log("Database tables are ready");

module.exports = db;
