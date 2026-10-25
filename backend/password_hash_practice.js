const bcrypt = require("bcrypt");
const crypto = require("node:crypto");

async function testPasswordHashing() {
    const temporaryPassword = crypto.randomBytes(18).toString("base64url");

    // Convert password into a secure hash
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Verify password against the stored hash
    const isValid = await bcrypt.compare(
        temporaryPassword,
        hashedPassword
    );

    console.log("Hash created:", hashedPassword.startsWith("$2"));
    console.log("Password verification:", isValid);
}

testPasswordHashing().catch(console.error);