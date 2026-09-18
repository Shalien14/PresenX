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
let officialsData = [
  {
    id: 1,
    name: "Dr. Alistair Vance",
    position: "Chief Medical Officer",
    department: "Health Administration",
    room: "Room 402 - Wing B",
    status: "AVAILABLE",
    lastUpdated: "Today at 10:15 AM",
    attendance: "Present (Check-in 08:30 AM)"
  },
  {
    id: 2,
    name: "Sarah Jenkins, Esq.",
    position: "Legal Counsel",
    department: "Legal Affairs",
    room: "Room 205 - Main Hall",
    status: "ON OFFICIAL DUTY",
    lastUpdated: "Today at 09:40 AM",
    attendance: "Field Assignment"
  },
  {
    id: 3,
    name: "Marcus Thorne",
    position: "Senior Town Planner",
    department: "Urban Development",
    room: "Room 110 - Ground Floor",
    status: "TEMPORARILY UNAVAILABLE",
    lastUpdated: "Today at 11:05 AM",
    attendance: "Present (In Meeting)"
  },
  {
    id: 4,
    name: "Elena Rostova",
    position: "Director of Revenue",
    department: "Finance & Taxation",
    room: "Room 301 - Wing A",
    status: "ABSENT",
    lastUpdated: "Yesterday at 04:50 PM",
    attendance: "On Leave"
  }
];

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
function initOfficialDashboard() {
  const selectStatus = document.getElementById("update-status-select");
  const statusForm = document.getElementById("status-update-form");
  const currentBadge = document.getElementById("current-status-badge");
  const lastUpdatedEl = document.getElementById("current-last-updated");

  if (!statusForm) return;

  // Assume logged in as official ID 1 (Dr. Alistair Vance)
  const myProfile = officialsData[0];

  function refreshView() {
    currentBadge.className = `status-badge ${getStatusClass(myProfile.status)}`;
    currentBadge.textContent = myProfile.status;
    lastUpdatedEl.textContent = myProfile.lastUpdated;
    selectStatus.value = myProfile.status;
  }

  refreshView();

  statusForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newStatus = selectStatus.value;
    const now = new Date();
    const timeString = `Today at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    myProfile.status = newStatus;
    myProfile.lastUpdated = timeString;

    refreshView();
    alert(`Status successfully updated to: ${newStatus}`);
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
document.addEventListener("DOMContentLoaded", () => {
  initPublicSearch();
  initOfficialDashboard();
  initAdminDashboard();
  initLogin();
});