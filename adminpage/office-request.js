// Get the request ID from the URL

const urlParams = new URLSearchParams(
    window.location.search
);

const requestId = urlParams.get("id");


// Example data

const officeRequests = {

    1: {
        name: "ABC Engineering Pvt Ltd",
        type: "Engineering Company",
        registration: "REG-2026-001",
        address: "123 Main Street, Colombo",
        email: "contact@abcengineering.com",
        phone: "+94 77 123 4567",
        website: "www.abcengineering.com",
        description:
            "ABC Engineering provides engineering consultancy and technical services."
    },

    2: {
        name: "Tech Solutions Lanka",
        type: "IT Company",
        registration: "REG-2026-002",
        address: "45 Galle Road, Colombo",
        email: "info@techsolutions.lk",
        phone: "+94 71 555 8899",
        website: "www.techsolutions.lk",
        description:
            "Tech Solutions Lanka provides software development and IT services."
    },

    3: {
        name: "Global IT Solutions",
        type: "Technology Company",
        registration: "REG-2026-003",
        address: "78 Kandy Road, Colombo",
        email: "contact@globalit.lk",
        phone: "+94 76 222 3344",
        website: "www.globalit.lk",
        description:
            "Global IT Solutions provides technology and digital transformation services."
    }

};


// Get selected office

const office = officeRequests[requestId];


// Display office details

if (office) {

    document.getElementById("officeName").textContent =
        office.name;

    document.getElementById("officeType").textContent =
        office.type;

    document.getElementById("registrationNumber").textContent =
        office.registration;

    document.getElementById("officeAddress").textContent =
        office.address;

    document.getElementById("officeEmail").textContent =
        office.email;

    document.getElementById("officePhone").textContent =
        office.phone;

    document.getElementById("officeWebsite").textContent =
        office.website;

    document.getElementById("officeDescription").textContent =
        office.description;

}


// Go back to notification page

function goBack() {

    window.location.href =
        "admin-notifications.html";

}


// Accept request

function acceptRequest() {

    alert(
        "Office request has been accepted."
    );

}


// Show rejection box

function showRejectBox() {

    document.getElementById("rejectModal").style.display =
        "flex";

}


// Close rejection box

function closeRejectBox() {

    document.getElementById("rejectModal").style.display =
        "none";

}


// Reject request

function rejectRequest() {

    const reason =
        document.getElementById("rejectReason").value.trim();


    // Check whether admin entered a reason

    if (reason === "") {

        alert(
            "Please provide a reason for rejection."
        );

        return;
    }


    alert(
        "Office request rejected.\n\nReason: "
        + reason
    );


    // Close modal

    closeRejectBox();

}


// View document

function viewDocument() {

    alert(
        "The submitted document would open here."
    );

}