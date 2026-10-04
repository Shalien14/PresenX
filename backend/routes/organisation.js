const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../database/database");

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
        name: "registrationDocument", // Fixed spelling mismatch with frontend/controller
        maxCount: 1
    }, 
    {
        name: "authorisationDocument",
        maxCount: 1
    }
]),
(req, res) => {
    try {
        const { name, type, reg_no, address, email, phone, website, description } = req.body;

        // Extract files using the correct object keys
        const reg_doc = req.files?.registrationDocument?.[0];
        const auth_doc = req.files?.authorisationDocument?.[0];
        
        if (!reg_doc) {
            return res.status(400).json({
                success: false,
                message: "Registration certificate is required."
            });
        }
        if (!auth_doc) {
            return res.status(400).json({ // Fixed typo: res.satus -> res.status
                success: false,
                message: "Authorisation document is required."
            });
        }

        const statement = db.prepare(`
            INSERT INTO organisations (
                office_name, office_type, registration_no, address, email, contact_number, 
                official_website, description, registration_document, registration_document_type, 
                authorisation_document, authorisation_document_type, status
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
            auth_doc.buffer,
            auth_doc.mimetype,
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

module.exports = router;