const express = require("express");
const db = require("../database/database");
const router = express.Router();

// GET ALL PENDING NOTIFICATIONS
router.get("/notification", (req, res) => {
    try {
        const notifications = db.prepare(`
            SELECT
                id,
                office_name,
                status,
                submitted_at
            FROM organisations
            WHERE status = 'pending'
            ORDER BY submitted_at DESC
        `).all();

        res.json({
            success: true,
            notifications: notifications
        });
    }

    catch (error) {
        console.error(
            "Error loading notifications:",
            error
        );
        res.status(500).json({
            success: false,
            message: "Failed to load notifications"
        });
    }
});

// GET ONE ORGANISATION REQUEST
router.get("/notification/:id", (req, res) => {
    console.log(
    db.prepare(`PRAGMA table_info(organisations)`).all()
);
    try {
        const id = req.params.id;
        const organisation = db.prepare(`
            SELECT id, office_name, office_type, registration_no, address,
                email, contact_number, official_website, description,
                status, rejection_reason, submitted_at
            FROM organisations WHERE id = ?
        `).get(id);

        if (!organisation) {
            return res.status(404).json({
                success: false,
                message: "Organisation not found"
            });
        }

        res.json({
            success: true,
            organisation: organisation
        });
    }

    catch (error) {
        console.error(
            "Error loading organisation:",
            error
        );
        res.status(500).json({
            success: false,
            message: "Failed to load organisation"
        });
    }
});

// ACCEPT ORGANISATION REQUEST
router.post("/notification/:id/accept", (req, res) => {
    try {
        const id = req.params.id;
        const organisation = db.prepare(`
            SELECT id, status
            FROM organisations
            WHERE id = ?
        `).get(id);

        if (!organisation) {
            return res.status(404).json({
                success: false,
                message: "Organisation not found"
            });
        }

        // Update status
        db.prepare(`
            UPDATE organisations
            SET status = 'accepted'
            WHERE id = ?
        `).run(id);

        res.json({
            success: true,
            message: "Organisation request accepted."
        });
    }

    catch (error) {
        console.error(
            "Error accepting organisation:",
            error
        );
        res.status(500).json({
            success: false,
            message: "Failed to accept organisation request."
        });
    }
});

// REJECT ORGANISATION REQUEST
router.post("/notification/:id/reject", (req, res) => {
    try {
        const id = req.params.id;
        const { reason } = req.body;

        // Check reason
        if (!reason || reason.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required."
            });
        }

        // Check whether organisation exists
        const organisation = db.prepare(`
            SELECT id, status
            FROM organisations
            WHERE id = ?
        `).get(id);

        if (!organisation) {
            return res.status(404).json({
                success: false,
                message: "Organisation not found"
            });
        }

        // Update status and rejection reason
        db.prepare(`
            UPDATE organisations
            SET
                status = 'rejected',
                rejection_reason = ?
            WHERE id = ?
        `).run(
            reason.trim(),
            id
        );

        res.json({
            success: true,
            message: "Organisation request rejected."
        });
    }

    catch (error) {
        console.error(
            "Error rejecting organisation:",
            error
        );
        res.status(500).json({
            success: false,
            message: "Failed to reject organisation request."
        });
    }
});

// VIEW REGISTRATION DOCUMENT
router.get(
    "/notification/:id/document/registration",
    (req, res) => {
        try {
            const id = req.params.id;
            const organisation = db.prepare(`
                SELECT
                    registration_document,
                    registration_document_type
                FROM organisations
                WHERE id = ?
            `).get(id);

            if (!organisation) {
                return res.status(404).send(
                    "Organisation not found"
                );
            }
            if (!organisation.registration_document) {
                return res.status(404).send(
                    "Registration document not found"
                );
            }
            res.setHeader(
                "Content-Type",
                organisation.registration_document_type
            );

            res.send(
                organisation.registration_document
            );
        }

        catch (error) {
            console.error(
                "Error loading registration document:",
                error
            );
            res.status(500).send(
                "Failed to load document"
            );
        }
    }
);


// VIEW VERIFICATION DOCUMENT
router.get(
    "/notification/:id/document/verification",
    (req, res) => {
        try {
            const id = req.params.id;
            const organisation = db.prepare(`
                SELECT
                    verification_document,
                    verification_document_type
                FROM organisations
                WHERE id = ?
            `).get(id);

            if (!organisation) {
                return res.status(404).send(
                    "Organisation not found"
                );
            }

            if (!organisation.verification_document) {
                return res.status(404).send(
                    "Verification document not found"
                );
            }

            res.setHeader(
                "Content-Type",
                organisation.verification_document_type
            );

            res.send(
                organisation.verification_document
            );
        }

        catch (error) {
            console.error(
                "Error loading verification document:",
                error
            );
            res.status(500).send(
                "Failed to load document"
            );
        }
    }
);


module.exports = router;