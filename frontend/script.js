// Default initial data
const DEFAULT_OFFICIALS = [
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

// Load from localStorage or initialize with defaults
function getOfficialsData() {
  const saved = localStorage.getItem("smart_presence_officials");
  if (!saved) {
    localStorage.setItem("smart_presence_officials", JSON.stringify(DEFAULT_OFFICIALS));
    return DEFAULT_OFFICIALS;
  }
  return JSON.parse(saved);
}

function saveOfficialsData(data) {
  localStorage.setItem("smart_presence_officials", JSON.stringify(data));
}