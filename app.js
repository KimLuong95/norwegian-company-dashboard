let companies = [];
let page = 1;
const perPage = 20;
let chart;

const BASE_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";
const FETCH_LIMIT = 500;

const industryMap = new Map();

// --------------------
// INIT
// --------------------
window.onload = () => {
  populateCompanyTypes();
  fetchCompanies(true);
};

// --------------------
// FETCH FROM BRREG
// --------------------
async function fetchCompanies(initialLoad = false) {
  const name = searchName.value.trim();
  const minEmp = minEmployees.value;
  const industryCode = industryFilter.value;
  const type = typeFilter.value;

  let url = `${BASE_URL}?size=${FETCH_LIMIT}&sort=antallAnsatte,desc`;

  if (name) url += `&navn=${encodeURIComponent(name)}`;
  if (minEmp) url += `&antallAnsatteFra=${minEmp}`;
  if (industryCode) url += `&naeringskode=${industryCode}`;
  if (type) url += `&organisasjonsform=${type}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    companies = (data._embedded?.enheter || [])
      .map(e => {
        const code = e.naeringskode1?.kode || "";
        const name = e.naeringskode1?.beskrivelse || "Unknown";

        if (code && !industryMap.has(code)) {
          industryMap.set(code, name);
        }

        return {
          orgNr: e.organisasjonsnummer,
          name: e.navn,
          employees: e.antallAnsatte || 0,
          industryCode: code,
          industry: name,
          type: e.organisasjonsform?.kode || "",
          city: e.forretningsadresse?.poststed || ""
        };
      })
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 100);

    if (initialLoad) populateIndustryFilter();

    page = 1;
    updateAll();

  } catch (err) {
    console.error(err);
    tableContent.innerHTML =
      "<div class='no-results'>Failed to load data from Brønnøysund</div>";
  }
}

// --------------------
// FILTER ACTIONS
// --------------------
function applyFilters() {
  fetchCompanies(false);
}

function resetFilters() {
  searchName.value = "";
  minEmployees.value = "";
  industryFilter.value = "";
  typeFilter.value = "";
  fetchCompanies(false);
}

// --------------------
// FILTER DROPDOWNS
// --------------------
function populateCompanyTypes() {
  typeFilter.innerHTML = "";
  ["", "AS", "ASA", "SA", "ENK", "ANS", "KS", "SF"].forEach(t => {
    typeFilter.innerHTML += `<option value="${t}">${t || "All types"}</option>`;
  });
}

function populateIndustryFilter() {
  industryFilter.innerHTML = `<option value="">All industries</option>`;

  [...industryMap.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([code, name]) => {
      industryFilter.innerHTML +=
        `<option value="${code}">${name}</option>`;
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
    companies.filter(c => c.employees >= 1000).length;

  const totalEmp = companies.reduce((s, c) => s + c.employees, 0);
  totalEmployees.textContent =
    totalEmp ? Math.round(totalEmp / 1000) + "K" : "0K";

  totalIndustries.textContent =
    new Set(companies.map(c => c.industryCode)).size;
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
          <th>Employees</th>
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
