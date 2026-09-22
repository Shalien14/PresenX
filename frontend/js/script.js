const API_BASE_URL = "http://localhost:5001/api";
// // Default initial data
// const DEFAULT_OFFICIALS = [
//   {
//     id: 1,
//     name: "Dr. Alistair Vance",
//     position: "Chief Medical Officer",
//     department: "Health Administration",
//     room: "Room 402 - Wing B",
//     status: "AVAILABLE",
//     lastUpdated: "Today at 10:15 AM",
//     attendance: "Present (Check-in 08:30 AM)"
//   },
//   {
//     id: 2,
//     name: "Sarah Jenkins, Esq.",
//     position: "Legal Counsel",
//     department: "Legal Affairs",
//     room: "Room 205 - Main Hall",
//     status: "ON OFFICIAL DUTY",
//     lastUpdated: "Today at 09:40 AM",
//     attendance: "Field Assignment"
//   },
//   {
//     id: 3,
//     name: "Marcus Thorne",
//     position: "Senior Town Planner",
//     department: "Urban Development",
//     room: "Room 110 - Ground Floor",
//     status: "TEMPORARILY UNAVAILABLE",
//     lastUpdated: "Today at 11:05 AM",
//     attendance: "Present (In Meeting)"
//   },
//   {
//     id: 4,
//     name: "Elena Rostova",
//     position: "Director of Revenue",
//     department: "Finance & Taxation",
//     room: "Room 301 - Wing A",
//     status: "ABSENT",
//     lastUpdated: "Yesterday at 04:50 PM",
//     attendance: "On Leave"
//   }
// ];

// // Load from localStorage or initialize with defaults
// function getOfficialsData() {
//   const saved = localStorage.getItem("smart_presence_officials");
//   if (!saved) {
//     localStorage.setItem("smart_presence_officials", JSON.stringify(DEFAULT_OFFICIALS));
//     return DEFAULT_OFFICIALS;
//   }
//   return JSON.parse(saved);
// }

// function saveOfficialsData(data) {
//   localStorage.setItem("smart_presence_officials", JSON.stringify(data));
// }


/* ==========================================================
   Smart Presence - Mock Data & Logic (Frontend Only)
   ========================================================== */

// Initial Static Data (Easily replaced with API data later)
let officialsData = [];
async function loadOfficials() {
  try {
    const response = await fetch(`${API_BASE_URL}/employees`);

    if (!response.ok) {
      throw new Error("Failed to fetch employees");
    }

    const data = await response.json();

    // Get employee profiles
    officialsData = data.employees.map(employee => ({
      id: employee.employee_id,
      name: employee.name,
      position: employee.designation,
      department: employee.department,
      room: employee.room,
      status: null,
      lastUpdated: null,
      attendance: "No attendance data"
    }));

    // Load real status for every employee
    await Promise.all(
      officialsData.map(async official => {
        try {
          const statusResponse = await fetch(
            `${API_BASE_URL}/employees/${official.id}/status`
          );

          if (!statusResponse.ok) {
            throw new Error(
              `Failed to fetch status for ${official.id}`
            );
          }

          const statusData = await statusResponse.json();

          if (statusData.success) {
            official.status = statusData.status.availability;
            official.lastUpdated = statusData.status.updated_at;
          }

        } catch (error) {
          console.error(
            `Error loading status for ${official.id}:`,
            error
          );
        }
      })
    );

    renderPublicCards(officialsData);

  } catch (error) {
    console.error("Error loading officials:", error);

    const container = document.getElementById(
      "public-officials-grid"
    );

    if (container) {
      container.innerHTML = `
        <p style="grid-column: 1/-1; text-align: center;">
          Unable to load officials from the server.
        </p>
      `;
    }
  }
}

// Helper: Status to CSS Class
function getStatusClass(status) {
  return "status-" + status.toLowerCase().replace(/\s+/g, '-');
}

// ----------------- Public Dashboard (index.html) -----------------
function renderPublicCards(officials) {
  const container = document.getElementById("public-officials-grid");
  if (!container) return;

  container.innerHTML = "";
  if (officials.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No officials found matching the filter criteria.</p>`;
    return;
  }

  officials.forEach((official) => {
    // PUBLIC VIEW RESTRICTION: No attendance, cameras, sensor logs or check-in hours
    const card = document.createElement("div");
    card.className = "official-card";
    card.innerHTML = `
      <div class="official-header">
        <div class="official-info">
          <h3>${official.name}</h3>
          <div class="position">${official.position}</div>
        </div>
      </div>
      <div>
        <span class="status-badge ${getStatusClass(official.status)}">${official.status}</span>
      </div>
      <div class="official-details">
        <div><strong>Department:</strong> ${official.department}</div>
        <div><strong>Room:</strong> ${official.room}</div>
        <div><strong>Last Updated:</strong> ${official.lastUpdated}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

function initPublicSearch() {
  const searchInput = document.getElementById("search-input");
  const deptFilter = document.getElementById("department-filter");
  const statusFilter = document.getElementById("status-filter");

  if (!searchInput) return;

  function filterData() {
    const query = searchInput.value.toLowerCase();
    const dept = deptFilter.value;
    const status = statusFilter.value;

    const filtered = officialsData.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(query) || item.position.toLowerCase().includes(query);
      const matchesDept = dept === "ALL" || item.department === dept;
      const matchesStatus = status === "ALL" || item.status === status;
      return matchesSearch && matchesDept && matchesStatus;
    });

    renderPublicCards(filtered);
  }

  searchInput.addEventListener("input", filterData);
  deptFilter.addEventListener("change", filterData);
  statusFilter.addEventListener("change", filterData);

  renderPublicCards(officialsData);
}

// ----------------- Official Self Dashboard -----------------
async function initOfficialDashboard() {
  const selectStatus = document.getElementById("update-status-select");
  const statusForm = document.getElementById("status-update-form");
  const currentBadge = document.getElementById("current-status-badge");
  const lastUpdatedEl = document.getElementById("current-last-updated");

  if (!statusForm) return;

  // Get the employee who logged in
  const storedEmployee = sessionStorage.getItem("loggedInEmployee");

  if (!storedEmployee) {
    console.error("No logged-in employee found.");
    window.location.href = "login.html";
    return;
  }

  const loggedInEmployee = JSON.parse(storedEmployee);

  // Find that employee in the loaded employee list
  const myProfile = officialsData.find(
    official => official.id === loggedInEmployee.employee_id
  );

  if (!myProfile) {
    console.error(
      `Employee ${loggedInEmployee.employee_id} not found in officialsData`
    );
    return;
  }
  const officialName = document.getElementById("official-name");
  const officialPosition = document.getElementById("official-position");
  const officialRoom = document.getElementById("official-room");

  officialName.textContent = myProfile.name;
  officialPosition.textContent = myProfile.position;
  officialRoom.textContent = myProfile.room;

  // Load current status from backend
  try {
    const response = await fetch(
      `${API_BASE_URL}/employees/${loggedInEmployee.employee_id}/status`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch official status");
    }

    const data = await response.json();

    if (data.success) {
      myProfile.status = data.status.availability;
      myProfile.lastUpdated = data.status.updated_at;
    }

  } catch (error) {
    console.error("Error loading official status:", error);

    currentBadge.className = "status-badge";
    currentBadge.textContent = "STATUS UNAVAILABLE";
    lastUpdatedEl.textContent = "Unable to load current status";

    selectStatus.value = "";
  }

  function refreshView() {
    if (!myProfile.status) {
      currentBadge.className = "status-badge";
      currentBadge.textContent = "LOADING...";
      lastUpdatedEl.textContent = "Loading...";
      return;
    }

    currentBadge.className =
      `status-badge ${getStatusClass(myProfile.status)}`;

    currentBadge.textContent = myProfile.status;
    lastUpdatedEl.textContent = myProfile.lastUpdated;

    selectStatus.value = myProfile.status;
  }

  refreshView();

  // Update availability
  statusForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newStatus = selectStatus.value;

    try {
      const response = await fetch(
        `${API_BASE_URL}/employees/${loggedInEmployee.employee_id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            availability: newStatus
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update status"
        );
      }

      myProfile.status = data.availability;
      myProfile.lastUpdated = data.updated_at;

      refreshView();

      alert(
        `Status successfully updated to: ${data.availability}`
      );

    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  });
}

// ----------------- Admin Dashboard -----------------
function initAdminDashboard() {
  const tableBody = document.getElementById("admin-table-body");
  if (!tableBody) return;

  function renderAdmin() {
    tableBody.innerHTML = "";

    let counts = { AVAILABLE: 0, ABSENT: 0, "TEMPORARILY UNAVAILABLE": 0, "ON OFFICIAL DUTY": 0 };

    officialsData.forEach((item) => {
      if (counts[item.status] !== undefined) counts[item.status]++;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${item.name}</strong><br><small style="color:var(--text-muted);">${item.position}</small></td>
        <td>${item.department}</td>
        <td>${item.room}</td>
        <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
        <td>${item.attendance}</td>
        <td>${item.lastUpdated}</td>
      `;
      tableBody.appendChild(row);
    });

    // Update stats counters
    if (document.getElementById("count-avail")) document.getElementById("count-avail").textContent = counts["AVAILABLE"];
    if (document.getElementById("count-temp")) document.getElementById("count-temp").textContent = counts["TEMPORARILY UNAVAILABLE"];
    if (document.getElementById("count-duty")) document.getElementById("count-duty").textContent = counts["ON OFFICIAL DUTY"];
    if (document.getElementById("count-absent")) document.getElementById("count-absent").textContent = counts["ABSENT"];
  }

  renderAdmin();
}

// ----------------- Auth Logic (Mock) -----------------
function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const role = document.getElementById("role-select").value;

    if (role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "official-dashboard.html";
    }
  });
}

// Global DOM Loaded
document.addEventListener("DOMContentLoaded", async () => {
  await loadOfficials();

  initPublicSearch();
  initOfficialDashboard();
  initAdminDashboard();
  initLogin();
});