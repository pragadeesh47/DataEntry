const form = document.getElementById("tripForm");
const list = document.getElementById("tripList");
const summary = document.getElementById("summary");

const dateInput = document.getElementById("date");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const feetInput = document.getElementById("feet");
const tripsInput = document.getElementById("trips");
const fareInput = document.getElementById("fare");

const overtimeCheck = document.getElementById("overtimeCheck");
const overtimeFareInput = document.getElementById("overtimeFare");

const filterType = document.getElementById("filterType");
const customDateInput = document.getElementById("customDate");

const modal = document.getElementById("deleteModal");
const confirmBtn = document.getElementById("confirmDelete");
const cancelBtn = document.getElementById("cancelDelete");

let trips = JSON.parse(localStorage.getItem("trips")) || [];
let editIndex = null;
let deleteIndex = null;

dateInput.value = new Date().toISOString().split("T")[0];

// Toggle OT
overtimeCheck.addEventListener("change", () => {
  overtimeFareInput.classList.toggle("hidden", !overtimeCheck.checked);
});

// Filter
filterType.addEventListener("change", () => {
  customDateInput.classList.toggle("hidden", filterType.value !== "custom");
  calculateSummary();
});

customDateInput.addEventListener("change", calculateSummary);

// Submit
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    date: dateInput.value,
    from: fromInput.value,
    to: toInput.value,
    feet: +feetInput.value,
    trips: +tripsInput.value,
    fare: +fareInput.value,
    overtime: overtimeCheck.checked ? +overtimeFareInput.value : 0
  };

  if (editIndex !== null) {
    trips[editIndex] = data;
    editIndex = null;
  } else {
    trips.push(data);
  }

  localStorage.setItem("trips", JSON.stringify(trips));

  form.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
  overtimeCheck.checked = false;
  overtimeFareInput.classList.add("hidden");

  render();
});

// Date label
function getLabel(dateStr) {
  const today = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString();
}

// Render
function render() {
  list.innerHTML = "";

  const grouped = {};

  trips.forEach((t, i) => {
    const label = getLabel(t.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push({ ...t, index: i });
  });

  Object.keys(grouped).forEach(label => {
    const title = document.createElement("div");
    title.className = "group-title";
    title.innerText = label;
    list.appendChild(title);

    grouped[label].forEach(t => {
      const li = document.createElement("li");

      li.innerHTML = `
        <div class="trip-top">
          <span>${t.from} → ${t.to}</span>
          <span>$${(t.fare * t.trips) + t.overtime}</span>
        </div>

        <div class="trip-sub">
          ${t.feet}ft • ${t.trips} • $${t.fare}/trip
          ${t.overtime ? ` • OT $${t.overtime}` : ""}
        </div>

        <div class="actions">
          <div class="icon-btn edit-btn" onclick="editTrip(${t.index})">
            <i data-lucide="pencil"></i>
          </div>
          <div class="icon-btn delete-btn" onclick="openDeleteModal(${t.index})">
            <i data-lucide="trash-2"></i>
          </div>
        </div>
      `;

      list.appendChild(li);
    });
  });

  lucide.createIcons();
  calculateSummary();
}

// Delete modal
function openDeleteModal(i) {
  deleteIndex = i;
  modal.classList.add("show");
}

cancelBtn.onclick = () => modal.classList.remove("show");

confirmBtn.onclick = () => {
  if (deleteIndex !== null) {
    trips.splice(deleteIndex, 1);
    localStorage.setItem("trips", JSON.stringify(trips));
    render();
  }
  modal.classList.remove("show");
};

// Edit
function editTrip(i) {
  const t = trips[i];

  dateInput.value = t.date;
  fromInput.value = t.from;
  toInput.value = t.to;
  feetInput.value = t.feet;
  tripsInput.value = t.trips;
  fareInput.value = t.fare;

  if (t.overtime) {
    overtimeCheck.checked = true;
    overtimeFareInput.classList.remove("hidden");
    overtimeFareInput.value = t.overtime;
  }

  editIndex = i;
};

// Filter logic
function filterTrips() {
  const type = filterType.value;
  const today = new Date();

  return trips.filter(t => {
    const d = new Date(t.date);

    if (type === "day") return d.toDateString() === today.toDateString();

    if (type === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return d >= weekAgo;
    }

    if (type === "month") return d.getMonth() === today.getMonth();

    if (type === "custom") return t.date === customDateInput.value;

    return true;
  });
}

// Summary
function calculateSummary() {
  const filtered = filterTrips();

  let totalTrips = 0;
  let totalFare = 0;
  let feetSummary = {};

  filtered.forEach(t => {
    totalTrips += t.trips;
    totalFare += (t.fare * t.trips) + t.overtime;

    feetSummary[t.feet] = (feetSummary[t.feet] || 0) + t.trips;
  });

  summary.innerHTML = `
    <div><h4>Trips</h4><p>${totalTrips}</p></div>
    <div><h4>Earnings</h4><p>$${totalFare}</p></div>
    <div><h4>Loads</h4>
      <p>${Object.entries(feetSummary).map(([f,c])=>`${f}ft×${c}`).join(", ") || "-"}</p>
    </div>
  `;
}

render();

// PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}