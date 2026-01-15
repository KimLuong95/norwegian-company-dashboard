let companies = [];
let page = 1;
const perPage = 20;
let chart;

let currentSort = { column: "employees", direction: "desc" };

const ENHETS_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";
const REGNSKAP_URL = "https://data.brreg.no/regnskapsregisteret/regnskap";
const FETCH_LIMIT = 500;

// ---------------- INIT ----------------
window.onload = () => {
  populateCompanyTypes();
  fetchCompanies(true);
};

// ---------------- FETCH COMPANIES ----------------
async function fetchCompanies(initialLoad = false) {
  const name = searchName.value.trim();
  const minEmp = minEmployees.value;
  const minRevenueMNOK = parseInt(minRevenueInput.value || "0");
  const industryCode = industryFilter.value;
  const type = typeFilter.value;

  let url = `${ENHETS_URL}?size=${FETCH_LIMIT}&sort=antallAnsatte,desc`;
  if (name) url += `&navn=${encodeURIComponent(name)}`;
  if (minEmp) url += `&antallAnsatteFra=${minEmp}`;
  if (industryCode) url += `&naeringskode=${industryCode}`;
  if (type) url += `&organisasjonsform=${type}`;

  const res = await fetch(url);
  const data = await res.json();

  let base = (data._embedded?.enheter || [])
    .map(e => ({
      orgNr: e.organisasjonsnummer,
      name: e.navn,
      employees: e.antallAnsatte || 0,
      industry: e.naeringskode1?.beskrivelse || "Unknown",
      industryCode: e.naeringskode1?.kode || "",
      type: e.organisasjonsform?.kode || "",
      revenue: null,
      operatingResult: null,
      assets: null,
      equity: null
    }))
    .sort((a, b) => b.employees - a.employees)
    .slice(0, 100);

  await enrichWithFinancials(base);

  companies = base.filter(c =>
    !minRevenueMNOK ||
    (c.revenue && c.revenue >= minRevenueMNOK * 1_000_000)
  );

  if (initialLoad) populateIndustryFilter(base);

  page = 1;
  sortCompanies(currentSort.column, true);
  updateAll();
}

// ---------------- FETCH FINANCIALS (FIXED) ----------------
async function enrichWithFinancials(list) {
  await Promise.all(
    list.map(async c => {
      try {
        const res = await fetch(`${REGNSKAP_URL}/${c.orgNr}`);
        if (!res.ok) return;

        const json = await res.json();

        // 🔑 REAL FIX: regnskaper is an ARRAY
        const regnskaper = json.regnskaper;
        if (!Array.isArray(regnskaper) || regnskaper.length === 0) return;

        // Pick latest year
        const latest = regnskaper.sort(
          (a, b) =>
            (b.regnskapsperiode?.aar || 0) -
            (a.regnskapsperiode?.aar || 0)
        )[0];

        const rr = latest.resultatregnskap;
        const bal = latest.balanse;

        c.revenue =
          rr?.driftsinntekter?.salgsinntekt ?? null;

        c.operatingResult =
          rr?.driftsresultat ?? null;

        c.assets =
          bal?.eiendeler?.sumEiendeler ?? null;

        c.equity =
          bal?.egenkapitalGjeld?.egenkapital ?? null;

      } catch {
        // ignore
      }
    })
  );
}

// ---------------- FILTERS ----------------
function applyFilters() {
  fetchCompanies(false);
}

function resetFilters() {
  searchName.value = "";
  minEmployees.value = "";
  minRevenueInput.value = "";
  industryFilter.value = "";
  typeFilter.value = "";
  fetchCompanies(false);
}

// ---------------- DROPDOWNS ----------------
function populateCompanyTypes() {
  ["", "AS", "ASA", "SA", "ENK", "ANS", "KS", "SF"].forEach(t => {
    typeFilter.innerHTML +=
      `<option value="${t}">${t || "All types"}</option>`;
  });
}

function populateIndustryFilter(data) {
  industryFilter.innerHTML = `<option value="">All industries</option>`;
  const map = new Map();
  data.forEach(c => map.set(c.industryCode, c.industry));
  [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([code, name]) => {
      industryFilter.innerHTML +=
        `<option value="${code}">${name}</option>`;
    });
}

// ---------------- SORT ----------------
function sortCompanies(column, silent = false) {
  if (!silent) {
    if (currentSort.column === column) {
      currentSort.direction =
        currentSort.direction === "asc" ? "desc" : "asc";
    } else {
      currentSort.column = column;
      currentSort.direction = "desc";
    }
  }

  companies.sort((a, b) => {
    const A = a[column] ?? -Infinity;
    const B = b[column] ?? -Infinity;
    return currentSort.direction === "asc" ? A - B : B - A;
  });

  page = 1;
  updateTable();
}

// ---------------- UPDATE ----------------
function updateAll() {
  updateStats();
  updateChart();
  updateTable();
}

function updateStats() {
  totalCompanies.textContent = companies.length;
  largeCompanies.textContent =
    companies.filter(c => c.employees >= 1000).length;
  totalEmployees.textContent =
    Math.round(
      companies.reduce((s, c) => s + c.employees, 0) / 1000
    ) + "K";
  totalIndustries.textContent =
    new Set(companies.map(c => c.industryCode)).size;
}

// ---------------- CHART ----------------
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
        backgroundColor: "#667eea"
      }]
    },
    options: {
      plugins: { legend: { display: false } }
    }
  });
}

// ---------------- TABLE ----------------
function updateTable() {
  const start = (page - 1) * perPage;
  const rows = companies.slice(start, start + perPage);

  tableContent.innerHTML = `
    <table>
      <thead>
        <tr>
          <th onclick="sortCompanies('name')">Company</th>
          <th onclick="sortCompanies('employees')">Employees</th>
          <th onclick="sortCompanies('revenue')">Revenue (MNOK)</th>
          <th onclick="sortCompanies('operatingResult')">Op. result</th>
          <th onclick="sortCompanies('equity')">Equity</th>
          <th onclick="sortCompanies('assets')">Assets</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(c => `
          <tr>
            <td>${c.name}</td>
            <td>${c.employees.toLocaleString()}</td>
            <td>${fmt(c.revenue)}</td>
            <td>${fmt(c.operatingResult)}</td>
            <td>${fmt(c.equity)}</td>
            <td>${fmt(c.assets)}</td>
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

function fmt(v) {
  return v == null ? "–" : Math.round(v / 1_000_000).toLocaleString();
}
