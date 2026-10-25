const crypto = require("node:crypto");

function generateTemporaryPassword() {
    return crypto.randomBytes(18).toString("base64url");
}

const temporaryPassword = generateTemporaryPassword();

console.log("Temporary password:", temporaryPassword);