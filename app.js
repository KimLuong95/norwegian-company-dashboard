let companies = [];
let page = 1;
const perPage = 20;
let chart;

const BASE_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";
const PAGE_SIZE = 100;

// --------------------
// INIT
// --------------------
window.onload = () => {
  populateCompanyTypes();
  fetchCompanies();
};

// --------------------
// FETCH FROM BRREG
// --------------------
async function fetchCompanies() {
  const name = searchName.value.trim();
  const minEmp = minEmployees.value;
  const type = typeFilter.value;

  let url = `${BASE_URL}?size=${PAGE_SIZE}&sort=antallAnsatte,desc`;

  if (name) url += `&navn=${encodeURIComponent(name)}`;
  if (minEmp) url += `&antallAnsatteFra=${minEmp}`;
  if (type) url += `&organisasjonsform=${type}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    companies = (data._embedded?.enheter || []).map(e => ({
      orgNr: e.organisasjonsnummer,
      name: e.navn,
      employees: e.antallAnsatte || 0,
      industry: e.naeringskode1?.beskrivelse || "Unknown",
      type: e.organisasjonsform?.kode || "",
      city: e.forretningsadresse?.poststed || ""
    }));

    // Always work on top 100 companies by employees
    companies = companies
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 100);

    page = 1;
    updateAll();

  } catch (err) {
    console.error(err);
    tableContent.innerHTML =
      "<div class='no-results'>Failed to load data from Brønnøysund</div>";
  }
}

// --------------------
// FILTERS
// --------------------
function applyFilters() {
  fetchCompanies();
}

function resetFilters() {
  searchName.value = "";
  minEmployees.value = "";
  typeFilter.value = "";
  fetchCompanies();
}

// --------------------
// STATIC FILTERS
// --------------------
function populateCompanyTypes() {
  ["", "AS", "ASA", "SA", "ENK", "ANS", "KS", "SF"].forEach(t => {
    typeFilter.innerHTML += `<option value="${t}">${t || "All types"}</option>`;
  });
}

// --------------------
// UPDATE ALL
// --------------------
function updateAll() {
  updateStats();
  updateChart();
  updateTable();
}

// --------------------
// STATS
// --------------------
function updateStats() {
  totalCompanies.textContent = companies.length;
  largeCompanies.textContent =
    companies.filter(c => c.employees >= 100).length;

  const totalEmp = companies.reduce((s, c) => s + c.employees, 0);
  totalEmployees.textContent =
    Math.round(totalEmp / 1000) + "K";

  totalIndustries.textContent =
    new Set(companies.map(c => c.industry)).size;
}

// --------------------
// CHART: TOP INDUSTRIES (TOP 100)
// --------------------
function updateChart() {
  const counts = {};

  companies.forEach(c => {
    counts[c.industry] = (counts[c.industry] || 0) + 1;
  });

  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (chart) chart.destroy();

  chart = new Chart(industryChart, {
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
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

// --------------------
// SORTABLE TABLE (EMPLOYEES DESC)
// --------------------
function updateTable() {
  const start = (page - 1) * perPage;
  const rows = companies.slice(start, start + perPage);

  tableContent.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Org nr</th>
          <th>Company</th>
          <th>Industry</th>
          <th>Type</th>
          <th>Employees ↓</th>
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
            <td>${c.employees.toLocaleString()}</td>
            <td>${c.city}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const pages = Math.ceil(companies.length / perPage);
  pagination.innerHTML = `
    ${page > 1 ? `<button onclick="page--;updateTable()">← Prev</button>` : ""}
    <button disabled>Page ${page} / ${pages}</button>
    ${page < pages ? `<button onclick="page++;updateTable()">Next →</button>` : ""}
  `;
}
