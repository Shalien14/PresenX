
console.log("admin-notifications.js loaded");

const API_BASE_URL = "http://localhost:5001/api";

const container = document.querySelector(
    ".notification-container"
);

const count = document.getElementById(
    "notificationCount"
);

const countLabel = document.getElementById(
    "countLabel"
);

const filterButtons = document.querySelectorAll(
    ".filter-btn"
);


// Load notifications for the selected status
async function loadNotifications(status = "pending") {

    try {
        container.textContent = "Loading requests...";

        const response = await fetch(
            `${API_BASE_URL}/notification?status=${status}`
        );

        if (!response.ok) {
            throw new Error("Failed to load requests.");
        }

        const data = await response.json();

        if (!Array.isArray(data.notifications)) {
            throw new Error("Invalid notification data.");
        }

        // Clear previous notifications
        container.innerHTML = "";

        // Update count and heading
        count.textContent = data.notifications.length;

        const labels = {
            pending: "Pending Requests",
            accepted: "Accepted Organisations",
            rejected: "Rejected Organisations"
        };

        countLabel.textContent = labels[status];

        // Show a message if there are no requests
        if (data.notifications.length === 0) {
            container.textContent =
                `No ${status} organisations found.`;
            return;
        }

        // Create notification cards
        data.notifications.forEach(notification => {

            const card = document.createElement("div");
            card.className = "notification-card";

            const icon = document.createElement("div");
            icon.className = "notification-icon";
            icon.textContent = "🏢";

            const content = document.createElement("div");
            content.className = "notification-content";

            const heading = document.createElement("h3");
            heading.textContent =
                notification.office_name;

            const description = document.createElement("p");

            const statusText = document.createElement("span");
            statusText.className =
                `status-label status-${notification.status}`;
            statusText.textContent =
                notification.status.toUpperCase();

            const time = document.createElement("span");
            time.className = "request-time";
            if (notification.submitted_at) {
    // Convert the database timestamp into a standard format
    const timestamp = notification.submitted_at.replace(
        /^(\d{4}-\d{2}-\d{2}) (\d{1,2})-(\d{2})-(\d{2})$/,
        "$1T$2:$3:$4Z"
    );

    const date = new Date(timestamp);

    if (!isNaN(date.getTime())) {
        time.textContent = date.toLocaleString("en-GB", {
            timeZone: "Asia/Colombo",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });
    } else {
        time.textContent = notification.submitted_at;
    }
}

            description.textContent =
                `Office request status: ${notification.status}`;

            content.append(
                heading,
                description,
                statusText,
                document.createElement("br"),
                time
            );

            const arrow = document.createElement("div");
            arrow.className = "arrow";
            arrow.textContent = "→";

            card.append(icon, content, arrow);

            card.addEventListener("click", () => {
                openRequest(notification.id);
            });

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Notification error:", error);

        container.textContent =
            "Unable to load requests. Please try again.";
    }
}


// Change the selected filter
filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        // Update active button
        filterButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        // Load organisations with the selected status
        loadNotifications(button.dataset.status);
    });
});


// Open organisation details
function openRequest(requestId) {

    window.location.href =
        "office-request.html?id=" +
        encodeURIComponent(requestId);
}


// Initially show pending requests
loadNotifications();
