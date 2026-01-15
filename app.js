let companies = [];
let filtered = [];
let page = 1;
const perPage = 20;
let chart;

// --------------------
// CONFIG
// --------------------
const BASE_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";
const DEFAULT_PAGE_SIZE = 100;

// --------------------
// INIT
// --------------------
window.onload = () => {
  populateStaticFilters();
  fetchCompanies();
};

// --------------------
// FETCH FROM BRREG
// --------------------
async function fetchCompanies() {
  const name = document.getElementById("searchName").value;
  const minEmp = document.getElementById("minEmployees").value;
  const industry = document.getElementById("industryFilter").value;
  const type = document.getElementById("typeFilter").value;

  let url = `${BASE_URL}?size=${DEFAULT_PAGE_SIZE}`;

  if (name) url += `&navn=${encodeURIComponent(name)}`;
  if (minEmp) url += `&antallAnsatteFra=${minEmp}`;
  if (industry) url += `&naeringskode=${encodeURIComponent(industry)}`;
  if (type) url += `&organisasjonsform=${encodeURIComponent(type)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    companies = (data._embedded?.enheter || []).map(e => ({
      name: e.navn,
      orgNr: e.organisasjonsnummer,
      employees: e.antallAnsatte || 0,
      industry: e.naeringskode1?.beskrivelse || "Unknown",
      industryCode: e.naeringskode1?.kode || "",
      type: e.organisasjonsform?.kode || "",
      city: e.forretningsadresse?.poststed || ""
    }));

    filtered = [...companies];
    page = 1;

    populateDynamicFilters();
    updateAll();
  } catch (err) {
    console.error("Brreg fetch failed", err);
    document.getElementById("tableContent").innerHTML =
      "<div class='no-results'>Failed to load data from Brreg</div>";
  }
}

// --------------------
// FILTERS
// --------------------
function applyFilters() {
  fetchCompanies();
}

function resetFilters() {
  document.getElementById("searchName").value = "";
  document.getElementById("minEmployees").value = "";
  document.getElementById("industryFilter").value = "";
  document.getElementById("typeFilter").value = "";
  fetchCompanies();
}

// --------------------
// FILTER DROPDOWNS
// --------------------
function populateStaticFilters() {
  const typeSelect = document.getElementById("typeFilter");
  ["AS", "ASA", "SA", "ENK", "ANS", "KS", "SF"].forEach(t => {
    typeSelect.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

function populateDynamicFilters() {
  const industrySelect = document.getElementById("industryFilter");
  industrySelect.innerHTML = `<option value="">All industries</option>`;

  [...new Set(companies.map(c => c.industryCode))]
    .filter(Boolean)
    .sort()
    .forEach(code => {
      industrySelect.innerHTML += `<option value="${code}">${code}</option>`;
    });
}

// --------------------
// UPDATE UI
// --------------------
function updateAll() {
  updateStats();
  updateChart();
  updateTable();
}

function updateStats() {
  document.getElementById("totalCompanies").textContent = filtered.length;
  document.getElementById("largeCompanies").textContent =
    filtered.filter(c => c.employees >= 100).length;

  const totalEmp = filtered.reduce((s, c) => s + c.employees, 0);
  document.getElementById("totalEmployees").textContent =
    totalEmp > 1000 ? Math.round(totalEmp / 1000) + "K" : totalEmp;

  document.getElementById("totalIndustries").textContent =
    new Set(filtered.map(c => c.industry)).size;
}

// --------------------
// CHART
// --------------------
function updateChart() {
  const counts = {};
  filtered.forEach(c => {
    counts[c.industry] = (counts[c.industry] || 0) + 1;
  });

  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("industryChart"), {
    type: "bar",
    data: {
      labels: top.map(t => t[0]),
      datasets: [{
        data: top.map(t => t[1]),
        backgroundColor: "rgba(102,126,234,0.8)"
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

// --------------------
// TABLE + PAGINATION
// --------------------
function updateTable() {
  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  if (!rows.length) {
    document.getElementById("tableContent").innerHTML =
      "<div class='no-results'>No results</div>";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  document.getElementById("tableContent").innerHTML =
    `<table>
      <thead>
        <tr>
          <th>Org nr</th>
          <th>Name</th>
          <th>Industry</th>
          <th>Type</th>
          <th>Employees</th>
          <th>City</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(c => `
          <tr>
            <td>${c.orgNr}</td>
            <td>${c.name}</td>
            <td>${c.industry}</td>
            <td>${c.type}</td>
            <td>${c.employees}</td>
            <td>${c.city}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;

  const pages = Math.ceil(filtered.length / perPage);
  document.getElementById("pagination").innerHTML = `
    ${page > 1 ? `<button onclick="page--;updateTable()">← Prev</button>` : ""}
    <button disabled>Page ${page} / ${pages}</button>
    ${page < pages ? `<button onclick="page++;updateTable()">Next →</button>` : ""}
  `;
}
