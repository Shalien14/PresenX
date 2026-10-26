
const passwordForm = document.getElementById("password-form");
const messageBox = document.getElementById("message");
const submitButton = document.getElementById("submit-button");

passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newPassword =
        document.getElementById("new-password").value;

    const confirmPassword =
        document.getElementById("confirm-password").value;

    messageBox.textContent = "";

    if (newPassword !== confirmPassword) {
        messageBox.style.color = "red";
        messageBox.textContent = "Passwords do not match.";
        return;
    }

    if (newPassword.length < 12 || newPassword.length > 128) {
        messageBox.style.color = "red";
        messageBox.textContent =
            "Password must contain 12 to 128 characters.";
        return;
    }

    submitButton.disabled = true;

    try {
        const response = await fetch("/api/auth/change-password", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                newPassword: newPassword
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.error || "Unable to change password."
            );
        }

        messageBox.style.color = "green";
        messageBox.textContent =
            "Password updated successfully!";

        // Update frontend data for display purposes only.
        const storedEmployee =
            sessionStorage.getItem("loggedInEmployee");

        if (storedEmployee) {
            const employee = JSON.parse(storedEmployee);
            employee.must_change_password = 0;

            sessionStorage.setItem(
                "loggedInEmployee",
                JSON.stringify(employee)
            );
        }

        const employeeData = storedEmployee
            ? JSON.parse(sessionStorage.getItem("loggedInEmployee"))
            : null;

        // Navigate to the employee dashboard
        if (employeeData) {
            const organisationId =
                encodeURIComponent(employeeData.organisation_id);

            window.location.replace(
                `official-dashboard.html?organisation=${organisationId}`
            );
        } else {
            window.location.replace("login.html");
        }

    } catch (error) {
        messageBox.style.color = "red";
        messageBox.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});
