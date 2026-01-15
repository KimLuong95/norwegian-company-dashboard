let allCompanies = [];
let companies = [];
let page = 1;
const perPage = 20;
let chart;

const BASE_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";
const PAGE_SIZE = 200;

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
  let url = `${BASE_URL}?size=${PAGE_SIZE}&sort=antallAnsatte,desc`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    allCompanies = (data._embedded?.enheter || [])
      .map(e => ({
        orgNr: e.organisasjonsnummer,
        name: e.navn,
        employees: e.antallAnsatte || 0,
        industry: e.naeringskode1?.beskrivelse || "Unknown",
        type: e.organisasjonsform?.kode || "",
        city: e.forretningsadresse?.poststed || ""
      }))
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 100);

    populateIndustryFilter();
    applyFilters();

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
  const name = searchName.value.toLowerCase();
  const minEmp = parseInt(minEmployees.value) || 0;
  const industry = industryFilter.value;
  const type = typeFilter.value;

  companies = allCompanies.filter(c =>
    (!name || c.name.toLowerCase().includes(name)) &&
    (!industry || c.industry === industry) &&
    (!type || c.type === type) &&
    c.employees >= minEmp
  );

  page = 1;
  updateAll();
}

function resetFilters() {
  searchName.value = "";
  minEmployees.value = "";
  industryFilter.value = "";
  typeFilter.value = "";
  applyFilters();
}

// --------------------
// FILTER DROPDOWNS
// --------------------
function populateCompanyTypes() {
  ["", "AS", "ASA", "SA", "ENK", "ANS", "KS", "SF"].forEach(t => {
    typeFilter.innerHTML += `<option value="${t}">${t || "All types"}</option>`;
  });
}

function populateIndustryFilter() {
  industryFilter.innerHTML = `<option value="">All industries</option>`;

  [...new Set(allCompanies.map(c => c.industry))]
    .sort()
    .forEach(ind =>
      industryFilter.innerHTML += `<option value="${ind}">${ind}</option>`
    );
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
    companies.filter(c => c.employees >= 1000).length;

  const totalEmp = companies.reduce((s, c) => s + c.employees, 0);
  totalEmployees.textContent =
    totalEmp ? Math.round(totalEmp / 1000) + "K" : "0K";

  totalIndustries.textContent =
    new Set(companies.map(c => c.industry)).size;
}

// --------------------
// CHART
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
        backgroundColor: "rgba(102,126,234,0.85)",
        borderRadius: 8
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
// TABLE
// --------------------
function updateTable() {
  const start = (page - 1) * perPage;
  const rows = companies.slice(start, start + perPage);

  tableContent.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Industry</th>
          <th>Employees ↓</th>
          <th>Type</th>
          <th>City</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.industry}</td>
            <td>${c.employees.toLocaleString()}</td>
            <td>${c.type}</td>
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
