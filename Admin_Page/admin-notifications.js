console.log("admin-notifications.js loaded");

async function loadNotifications() {

    try {

        const response = await fetch(
            "http://localhost:5001/api/notification"
        );

        const data = await response.json();

        console.log("Received data:", data);

        const container =
            document.querySelector(".notification-container");

        const count =
            document.getElementById("notificationCount");

        // Show number of notifications
        count.textContent = data.notifications.length;


        // Create each notification
        data.notifications.forEach(notification => {

            console.log("Creating notification:", notification);

            const card = document.createElement("div");

            card.className = "notification-card";

            card.innerHTML = `
                <div class="notification-icon">
                    🏢
                </div>

                <div class="notification-content">

                    <h3>New Office Request</h3>

                    <p>
                        <strong>${notification.office_name}</strong>
                        has requested to add their office
                        to the website.
                    </p>

                    <span class="request-time">
                        ${notification.submitted_at}
                    </span>

                </div>

                <div class="arrow">
                    →
                </div>
            `;

            card.addEventListener("click", function () {

                openRequest(notification.id);

            });

            container.appendChild(card);

            console.log("Card added:", card);

        });

    }

    catch (error) {

        console.error(
            "Notification error:",
            error
        );

    }

}


function openRequest(requestId) {

    window.location.href =
        "office-request.html?id=" + requestId;

}


loadNotifications();