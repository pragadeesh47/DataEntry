const form = document.getElementById("tripForm");
const list = document.getElementById("tripList");
const summary = document.getElementById("summary");
const listMeta = document.getElementById("listMeta");

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
const clearFilterBtn = document.getElementById("clearFilter");

const modal = document.getElementById("deleteModal");
const confirmBtn = document.getElementById("confirmDelete");
const cancelBtn = document.getElementById("cancelDelete");

const formOverlay = document.getElementById("formOverlay");
const openFormBtn = document.getElementById("openFormBtn");
const closeFormBtn = document.getElementById("closeFormBtn");
const formTitle = document.getElementById("formTitle");

let trips = JSON.parse(localStorage.getItem("trips")) || [];
let editIndex = null;
let deleteIndex = null;

dateInput.value = new Date().toISOString().split("T")[0];
filterType.value = "day";

function openForm(isEdit = false) {
  formOverlay.classList.add("show");
  formTitle.textContent = isEdit ? "Edit Trip" : "Add Trip";
}

function closeForm() {
  formOverlay.classList.remove("show");
  form.reset();
  editIndex = null;
  overtimeCheck.checked = false;
  overtimeFareInput.classList.add("hidden");
  overtimeFareInput.value = "";
  dateInput.value = new Date().toISOString().split("T")[0];
  formTitle.textContent = "Add Trip";
}

openFormBtn.addEventListener("click", () => openForm(false));
closeFormBtn.addEventListener("click", closeForm);
formOverlay.addEventListener("click", (e) => {
  if (e.target === formOverlay) closeForm();
});

overtimeCheck.addEventListener("change", () => {
  overtimeFareInput.classList.toggle("hidden", !overtimeCheck.checked);
});

filterType.addEventListener("change", () => {
  customDateInput.classList.toggle("hidden", filterType.value !== "custom");
  if (filterType.value !== "custom") customDateInput.value = "";
  render();
});

customDateInput.addEventListener("change", render);

clearFilterBtn.addEventListener("click", () => {
  filterType.value = "total";
  customDateInput.value = "";
  customDateInput.classList.add("hidden");
  render();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    date: dateInput.value,
    from: fromInput.value.trim(),
    to: toInput.value.trim(),
    feet: +feetInput.value,
    trips: +tripsInput.value,
    fare: +fareInput.value,
    overtime: overtimeCheck.checked ? (+overtimeFareInput.value || 0) : 0
  };

  if (editIndex !== null) {
    trips[editIndex] = data;
    editIndex = null;
  } else {
    trips.push(data);
  }

  trips.sort((a, b) => new Date(b.date) - new Date(a.date));
  localStorage.setItem("trips", JSON.stringify(trips));

  closeForm();
  render();
});

function getLabel(dateStr) {
  const today = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString();
}

function filterTrips() {
  const type = filterType.value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return trips.filter((t) => {
    const d = new Date(t.date);
    d.setHours(0, 0, 0, 0);

    if (type === "day") {
      return d.getTime() === today.getTime();
    }

    if (type === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);
      return d >= weekAgo && d <= today;
    }

    if (type === "month") {
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }

    if (type === "custom") {
      return customDateInput.value && t.date === customDateInput.value;
    }

    return true;
  });
}

function calculateSummary(filtered) {
  let totalTrips = 0;
  let totalFare = 0;
  const feetSummary = {};

  filtered.forEach((t) => {
    totalTrips += t.trips;
    totalFare += (t.fare * t.trips) + t.overtime;
    feetSummary[t.feet] = (feetSummary[t.feet] || 0) + t.trips;
  });

  summary.innerHTML = `
    <div>
      <h4>Trips</h4>
      <p>${totalTrips}</p>
    </div>
    <div>
      <h4>Earnings</h4>
      <p>$${totalFare}</p>
    </div>
    <div>
      <h4>Loads</h4>
      <p>${Object.entries(feetSummary).map(([f, c]) => `${f}ft×${c}`).join(", ") || "-"}</p>
    </div>
  `;
}

function render() {
  list.innerHTML = "";

  const filtered = filterTrips().sort((a, b) => new Date(b.date) - new Date(a.date));
  calculateSummary(filtered);
  listMeta.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state card">
        <p>No trips found for this filter.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const grouped = {};

  filtered.forEach((t) => {
    const originalIndex = trips.findIndex((trip) =>
      trip.date === t.date &&
      trip.from === t.from &&
      trip.to === t.to &&
      trip.feet === t.feet &&
      trip.trips === t.trips &&
      trip.fare === t.fare &&
      trip.overtime === t.overtime
    );

    const label = getLabel(t.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push({ ...t, index: originalIndex });
  });

  Object.keys(grouped).forEach((label) => {
    const title = document.createElement("div");
    title.className = "group-title";
    title.innerText = label;
    list.appendChild(title);

    grouped[label].forEach((t) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="trip-top">
          <span>${t.from} → ${t.to}</span>
          <span>$${(t.fare * t.trips) + t.overtime}</span>
        </div>

        <div class="trip-sub">
          ${t.feet}ft • ${t.trips} trips • $${t.fare}/trip
          ${t.overtime ? ` • OT $${t.overtime}` : ""}
        </div>

        <div class="actions">
          <button type="button" class="icon-btn edit-btn" onclick="editTrip(${t.index})" aria-label="Edit trip">
            <i data-lucide="pencil"></i>
          </button>
          <button type="button" class="icon-btn delete-btn" onclick="openDeleteModal(${t.index})" aria-label="Delete trip">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
      list.appendChild(li);
    });
  });

  lucide.createIcons();
}

function openDeleteModal(i) {
  deleteIndex = i;
  modal.classList.add("show");
}

cancelBtn.onclick = () => {
  deleteIndex = null;
  modal.classList.remove("show");
};

confirmBtn.onclick = () => {
  if (deleteIndex !== null) {
    trips.splice(deleteIndex, 1);
    localStorage.setItem("trips", JSON.stringify(trips));
    deleteIndex = null;
    render();
  }
  modal.classList.remove("show");
};

function editTrip(i) {
  const t = trips[i];
  if (!t) return;

  dateInput.value = t.date;
  fromInput.value = t.from;
  toInput.value = t.to;
  feetInput.value = t.feet;
  tripsInput.value = t.trips;
  fareInput.value = t.fare;

  overtimeCheck.checked = !!t.overtime;
  overtimeFareInput.classList.toggle("hidden", !t.overtime);
  overtimeFareInput.value = t.overtime || "";

  editIndex = i;
  openForm(true);
}

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}