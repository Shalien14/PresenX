
function requireAdmin(req, res, next) {
    if (
        req.session &&
        req.session.admin &&
        req.session.admin.role === "admin"
    ) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Administrator authentication required."
    });
}

module.exports = requireAdmin;
