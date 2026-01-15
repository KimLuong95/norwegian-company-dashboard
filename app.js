// ==============================
// CONFIG
// ==============================
const BACKEND_BASE = "https://norwegian-company-dashboard.vercel.app";
const PER_PAGE = 20;

// ==============================
// STATE
// ==============================
let companies = [];
let page = 1;
let sortKey = "employees";
let sortDir = "desc";

// ==============================
// HELPERS
// ==============================
const formatNumber = (n) =>
  n === null || n === undefined ? "–" : n.toLocaleString("no-NO");

const formatMNOK = (n) =>
  n === null || n === undefined
    ? "–"
    : Math.round(n / 1_000_000).toLocaleString("no-NO");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ==============================
// FETCH TOP COMPANIES (DEMO SET)
// ==============================
async function loadCompanies() {
  // Simple demo list to prove pipeline works
  // You can later replace this with live Enhetsregisteret queries
  const base = [
    { name: "BDO AS", orgnr: "993606650", employees: 1288 },
    { name: "BDO ADVOKATER AS", orgnr: "996449318", employees: 84 }
  ];

  companies = [];

  for (const c of base) {
    const financials = await fetchFinancials(c.orgnr);
    companies.push({ ...c, financials });
    await sleep(300); // be nice to Brreg
  }

  render();
}

// ==============================
// FETCH FINANCIALS (REAL DATA)
// ==============================
async function fetchFinancials(orgnr) {
  try {
    const res = await fetch(
      `${BACKEND_BASE}/api/regnskap?orgnr=${orgnr}`
    );

    if (!res.ok) return null;

    const data = await res.json();

    return {
      year: data?.regnskapsperiode?.aar ?? null,
      revenue: data?.resultatregnskap?.driftsinntekter ?? null,
      operatingResult:
        data?.resultatregnskap?.driftsresultat ?? null,
      equity: data?.balanse?.egenkapital ?? null,
      assets: data?.balanse?.sumEiendeler ?? null
    };
  } catch {
    return null;
  }
}

// ==============================
// SORTING
// ==============================
function sortBy(key) {
  if (sortKey === key) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortKey = key;
    sortDir = "desc";
  }
  render();
}

function sortedCompanies() {
  return [...companies].sort((a, b) => {
    const av =
      keyValue(a, sortKey) ?? -Infinity;
    const bv =
      keyValue(b, sortKey) ?? -Infinity;

    return sortDir === "asc" ? av - bv : bv - av;
  });
}

function keyValue(c, key) {
  if (key === "employees") return c.employees;
  return c.financials?.[key] ?? null;
}

// ==============================
// RENDER
// ==============================
function render() {
  renderStats();
  renderTable();
}

function renderStats() {
  document.getElementById("totalCompanies").textContent =
    companies.length;

  document.getElementById("largeCompanies").textContent =
    companies.filter((c) => c.employees >= 1000).length;

  const totalEmp = companies.reduce(
    (s, c) => s + c.employees,
    0
  );
  document.getElementById("totalEmployees").textContent =
    formatNumber(totalEmp);

  document.getElementById("totalIndustries").textContent =
    "–";
}

// ==============================
// TABLE
// ==============================
function renderTable() {
  const start = (page - 1) * PER_PAGE;
  const rows = sortedCompanies().slice(
    start,
    start + PER_PAGE
  );

  let html = `
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th onclick="sortBy('employees')">Employees</th>
          <th onclick="sortBy('revenue')">Revenue (MNOK)</th>
          <th onclick="sortBy('operatingResult')">Op. result</th>
          <th onclick="sortBy('equity')">Equity</th>
          <th onclick="sortBy('assets')">Assets</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const c of rows) {
    html += `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${formatNumber(c.employees)}</td>
        <td>${formatMNOK(c.financials?.revenue)}</td>
        <td>${formatMNOK(c.financials?.operatingResult)}</td>
        <td>${formatMNOK(c.financials?.equity)}</td>
        <td>${formatMNOK(c.financials?.assets)}</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  document.getElementById("tableContent").innerHTML = html;

  document.getElementById(
    "pagination"
  ).innerHTML = `<button disabled>Page ${page} / 1</button>`;
}

// ==============================
// INIT
// ==============================
window.addEventListener("load", loadCompanies);
