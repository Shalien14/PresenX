
const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

// POST /api/admin/login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter your username and password."
            });
        }

        const configuredUsername = process.env.ADMIN_USERNAME;
        const passwordHash = process.env.ADMIN_PASSWORD_HASH;

        if (!configuredUsername || !passwordHash) {
            console.error("Admin credentials are not configured.");

            return res.status(500).json({
                success: false,
                message: "Authentication is not configured."
            });
        }

        const usernameMatches =
            username.trim().toLowerCase() ===
            configuredUsername.trim().toLowerCase();

        const passwordMatches = await bcrypt.compare(
            password,
            passwordHash
        );

        if (!usernameMatches || !passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        // Create a fresh session after successful authentication.
        req.session.regenerate((error) => {
            if (error) {
                console.error("Session creation failed:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to create a login session."
                });
            }

            req.session.admin = {
                username: configuredUsername,
                role: "admin"
            };

            req.session.save((saveError) => {
                if (saveError) {
                    console.error("Session save failed:", saveError);

                    return res.status(500).json({
                        success: false,
                        message: "Unable to save the login session."
                    });
                }

                return res.json({
                    success: true,
                    message: "Login successful.",
                    admin: {
                        username: configuredUsername,
                        role: "admin"
                    }
                });
            });
        });

    } catch (error) {
        console.error("Admin login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Authentication service unavailable."
        });
    }
});

// GET /api/admin/me
// Check whether the current browser has an admin session.
router.get("/me", (req, res) => {
    if (!req.session?.admin) {
        return res.status(401).json({
            authenticated: false
        });
    }

    return res.json({
        authenticated: true,
        admin: req.session.admin
    });
});

// POST /api/admin/logout
router.post("/logout", (req, res) => {
    if (!req.session) {
        return res.json({ success: true });
    }

    req.session.destroy((error) => {
        if (error) {
            console.error("Logout error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to log out."
            });
        }

        res.clearCookie("connect.sid", {
            path: "/"
        });

        return res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});

module.exports = router;
