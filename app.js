const API_BASE = "https://norwegian-company-dashboard.vercel.app";
const ENHETS_API = "https://data.brreg.no/enhetsregisteret/api/enheter";
const PER_PAGE = 20;

let companies = [];
let page = 1;

// --------------------
// Helpers
// --------------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const formatNumber = v =>
  v === null || v === undefined ? "–" : v.toLocaleString("no-NO");

const formatMNOK = v =>
  v === null || v === undefined ? "–" :
  Math.round(v / 1_000_000).toLocaleString("no-NO");

// --------------------
// Load companies (TOP 100 by employees)
// --------------------
async function loadCompanies() {
  companies = [];
  page = 1;

  const url =
    `${ENHETS_API}?size=100&sort=antallAnsatte,desc`;

  const res = await fetch(url);
  const data = await res.json();

  for (const e of data._embedded.enheter) {
    const company = {
      name: e.navn,
      orgnr: e.organisasjonsnummer,
      employees: e.antallAnsatte || 0,
      industry: e.naeringskode1?.beskrivelse || "–",
      type: e.organisasjonsform?.kode || "–",
      financials: null
    };

    companies.push(company);
  }

  await loadFinancials();
  render();
}

// --------------------
// Load financials (via proxy)
// --------------------
async function loadFinancials() {
  for (const c of companies) {
    try {
      const res = await fetch(
        `${API_BASE}/api/regnskap?orgnr=${c.orgnr}`
      );
      if (!res.ok) continue;

      const json = await res.json();
      const r = json.regnskap?.[0];
      if (!r) continue;

      c.financials = {
        year: r.regnskapsperiode?.aar ?? null,
        revenue:
          r.resultatregnskapResultat?.driftsinntekter?.sumDriftsinntekter ?? null,
        operatingResult:
          r.resultatregnskapResultat?.driftsresultat ?? null,
        equity:
          r.balanseEgenkapitalGjeld?.egenkapital ?? null,
        assets:
          r.balanseEiendeler?.sumEiendeler ?? null
      };
    } catch {}
    await sleep(250);
  }
}

// --------------------
// Render
// --------------------
function render() {
  renderStats();
  renderTable();
}

function renderStats() {
  document.getElementById("totalCompanies").textContent =
    companies.length;

  document.getElementById("largeCompanies").textContent =
    companies.filter(c => c.employees >= 1000).length;

  const totalEmp = companies.reduce((s, c) => s + c.employees, 0);
  document.getElementById("totalEmployees").textContent =
    formatNumber(totalEmp);

  document.getElementById("totalIndustries").textContent =
    new Set(companies.map(c => c.industry)).size;
}

// --------------------
// Table
// --------------------
function renderTable() {
  const start = (page - 1) * PER_PAGE;
  const rows = companies.slice(start, start + PER_PAGE);

  let html = `
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Employees</th>
          <th>Revenue (MNOK)</th>
          <th>Op. result</th>
          <th>Equity</th>
          <th>Assets</th>
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

  document.getElementById("pagination").innerHTML =
    `<button disabled>Page ${page} / ${Math.ceil(companies.length / PER_PAGE)}</button>`;
}

// --------------------
window.addEventListener("load", loadCompanies);
