const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../database/database");
const bcrypt = require("bcrypt");

// Correctly configure Multer with limits and fileFilter inside the options object
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB per file
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, JPG, and PNG files are allowed"));
        }
    }
});

// Sending request route
router.post("/request", upload.fields([
    {
        name: "registrationDocument",
        maxCount: 1
    }, 
    {
        name: "verificationDocument",
        maxCount: 1
    }
]),
(req, res) => {
    try {
        const { name, type, reg_no, address, email, phone, website, description } = req.body;

        // Extract files using the correct object keys
        const reg_doc = req.files?.registrationDocument?.[0];
        const ver_doc = req.files?.verificationDocument?.[0];
        
        if (!reg_doc) {
            return res.status(400).json({
                success: false,
                message: "Registration certificate is required."
            });
        }
        if (!ver_doc) {
            return res.status(400).json({
                success: false,
                message: "Verification document is required."
            });
        }

        const existingOrg=db.prepare(`SELECT id, office_name,status
            FROM organisations
            WHERE registration_no=?
            `).get(reg_no)

        if (existingOrg){
            return res.status(409).json({
                success: false,
                message:"An organisation with this registration number has already submitted a request.",
                organisationId: existingOrg.id,
                status: existingOrg.status
            })
        }

        const statement = db.prepare(`
            INSERT INTO organisations (
                office_name, office_type, registration_no, address, email, contact_number, 
                official_website, description, registration_document, registration_document_type, 
                verification_document, verification_document_type, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = statement.run(
            name,
            type,
            reg_no,
            address,
            email,
            phone,
            website,
            description,
            reg_doc.buffer,
            reg_doc.mimetype,
            ver_doc.buffer,
            ver_doc.mimetype,
            "pending"
        );

        res.status(201).json({
            success: true,
            message: "Office registration submitted successfully.",
            organisationId: result.lastInsertRowid
        });

    } catch (error) {
        console.error("Office registration error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to register office."
        });
    }
});

router.get("/status/:registrationNumber", (req, res) => {
    try {
        const { registrationNumber } = req.params;

        const organisation = db.prepare(`
            SELECT *
            FROM organisations
            WHERE registration_no = ?
        `).get(registrationNumber);

        if (!organisation) {
            return res.status(404).json({
                error: "Organisation not found"
            });
        }

        res.json(organisation);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Server error"
        });
    }
    console.log("Searching:", registrationNumber);

const organisation = db.prepare(`
    SELECT *
    FROM organisations
    WHERE registration_no = ?
`).get(registrationNumber);

console.log("Found:", organisation);
});


router.post("/create-account", async(req, res) => {
    
    try {

        const {
            organisationId,
            username,
            password
        } = req.body;

const hashedPassword = await bcrypt.hash(password, 10);

        db.prepare(`
            UPDATE organisations
            SET
                username = ?,
                password = ?,
                account_created = 1
            WHERE id = ?
        `).run(
            username,
            hashedPassword,
            organisationId
        );

        res.json({
            success: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false
        });

    }
});
module.exports = router;