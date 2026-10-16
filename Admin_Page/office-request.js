
// GET REQUEST ID FROM URL
const API_BASE_URL = "http://localhost:5001/api";
console.log("office-request.js loaded");

const urlParams = new URLSearchParams(
    window.location.search
);

const requestId = urlParams.get("id");



// LOAD ORGANISATION DETAILS
async function loadOrganisation() {
    // Check whether request ID exists

    if (!requestId) {
        alert(
            "No organisation request was selected."
        );
        return;
    }


    try {
        const response = await fetch(
           `${API_BASE_URL}/notification/${requestId}`
        );

        const data = await response.json();

        console.log(
            "Organisation data:",
            data
        );

        // Check whether request was successful
        if (!response.ok) {
            alert(
                data.message ||
                "Failed to load organisation"
            );
            return;
        }

        // Get organisation object
        const office = data.organisation;


        // DISPLAY ORGANISATION DETAILS
       
        document.getElementById(
            "officeName"
        ).textContent =
            office.office_name;

        document.getElementById(
            "officeType"
        ).textContent =
            office.office_type;

        document.getElementById(
            "registrationNumber"
        ).textContent =
            office.registration_no;

        document.getElementById(
            "officeAddress"
        ).textContent =
            office.address;

        document.getElementById(
            "officeEmail"
        ).textContent =
            office.email;

        document.getElementById(
            "officePhone"
        ).textContent =
            office.contact_number;

        document.getElementById(
            "officeWebsite"
        ).textContent =
            office.official_website;

        document.getElementById(
            "officeDescription"
        ).textContent =
            office.description;

    }


    catch (error) {
        console.error(
            "Error loading organisation:",
            error
        );

        alert(
            "Unable to load organisation details"
        );
    }

}


// Load organisation when page opens
loadOrganisation();

// GO BACK TO NOTIFICATION PAGE

function goBack() {
    window.location.href =
        "admin-notifications.html";
}

// ACCEPT REQUEST
async function acceptRequest() {

    const confirmAccept = confirm(
        "Are you sure you want to accept this office request?"
    );


    if (!confirmAccept) {
        return;
    }


    try {
        const response = await fetch(
    `${API_BASE_URL}/notification/${requestId}/accept`,
    {
        method: "POST"
    }
);


        const data = await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Failed to accept request."
            );

            return;
        }


        alert(
            "Office request has been accepted."
        );

        // Go back to notification page

        window.location.href =
            "admin-notifications.html";

    }


    catch (error) {

        console.error(
            "Accept error:",
            error
        );

        alert(
            "Unable to accept the request."
        );
    }
}


// SHOW REJECTION BOX

function showRejectBox() {

    document.getElementById(
        "rejectModal"
    ).style.display = "flex";
}

// CLOSE REJECTION BOX

function closeRejectBox() {

    document.getElementById(
        "rejectModal"
    ).style.display = "none";

}

// REJECT REQUEST

async function rejectRequest() {

    const reason =
        document.getElementById(
            "rejectReason"
        ).value.trim();

    // Check whether reason was entered

    if (reason === "") {
        alert(
            "Please provide a reason for rejection."
        );

        return;
    }


    try {
        const response = await fetch(
    `${API_BASE_URL}/notification/${requestId}/reject`,
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            reason: reason
        })
    }
);

        const data = await response.json();

        if (!response.ok) {
            alert(
                data.message ||
                "Failed to reject request."
            );
            return;
        }


        alert(
            "Office request has been rejected."
        );

        // Close modal
        closeRejectBox();

        // Return to notification page

        window.location.href =
            "admin-notifications.html";

    }


    catch (error) {

        console.error(
            "Reject error:",
            error
        );


        alert(
            "Unable to reject the request."
        );
    }

}

// VIEW REGISTRATION DOCUMENT

function viewRegistrationDocument() {

    window.open(
    `${API_BASE_URL}/notification/${requestId}/document/registration`,
    "_blank"
);
}

// VIEW AUTHORISATION DOCUMENT

function viewVerificationDocument() {
    window.open(
        `${API_BASE_URL}/notification/${requestId}/document/verification`,
        "_blank"
    );
}