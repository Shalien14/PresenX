const Database=require("better-sqlite3")

const db=new Database(path.join(__dirname, "organisation.db"))

//create temporary table
db.prepare(`
    CREATE TABLE IF NOT EXISTS temp_org (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        office_name VARCHAR(150) NOT NULL,
        office_type VARCHAR(150) NOT NULL,
        registration_no VARCHAR(150) NOT NULL,
        address TEXT,
        email VARCHAR(150) NOT NULL,
        contact_number VARCHAR(30) NOT NULL,
        official_website VARCHAR(255),
        description VARCHAR(150),
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();