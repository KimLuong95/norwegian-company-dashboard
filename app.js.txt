const companies = [
  {name:"Equinor ASA",orgNr:"923609016",industry:"Extraction of crude petroleum",type:"ASA",employees:21000,city:"Stavanger"},
  {name:"DNB Bank ASA",orgNr:"984851006",industry:"Monetary intermediation",type:"ASA",employees:9500,city:"Oslo"},
  {name:"Telenor ASA",orgNr:"976820037",industry:"Wireless telecommunications",type:"ASA",employees:7200,city:"Oslo"},
  {name:"Norsk Hydro ASA",orgNr:"914778270",industry:"Aluminium production",type:"ASA",employees:35000,city:"Oslo"},
  {name:"Mowi ASA",orgNr:"914778271",industry:"Marine aquaculture",type:"ASA",employees:15000,city:"Bergen"},
  {name:"Yara International ASA",orgNr:"992886371",industry:"Manufacture of fertilizers",type:"ASA",employees:17000,city:"Oslo"},
  {name:"Orkla ASA",orgNr:"910747711",industry:"Manufacture of food products",type:"ASA",employees:18000,city:"Oslo"},
  {name:"Norgesgruppen ASA",orgNr:"912255692",industry:"Retail sale in stores",type:"ASA",employees:32000,city:"Oslo"}
];

let filtered = [...companies];
let page = 1;
const perPage = 10;
let chart;

function init() {
  populateFilters();
  updateAll();
}

function populateFilters() {
  const industries = [...new Set(companies.map(c => c.industry))];
  const types = [...new Set(companies.map(c => c.type))];

  industries.forEach(i =>
    industryFilter.innerHTML += `<option value="${i}">${i}</option>`
  );

  types.forEach(t =>
    typeFilter.innerHTML += `<option value="${t}">${t}</option>`
  );
}

function applyFilters() {
  const name = searchName.value.toLowerCase();
  const industry = industryFilter.value;
  const type = typeFilter.value;
  const minEmp = parseInt(minEmployees.value) || 0;

  filtered = companies.filter(c =>
    (!name || c.name.toLowerCase().includes(name)) &&
    (!industry || c.industry === industry) &&
    (!type || c.type === type) &&
    c.employees >= minEmp
  );

  page = 1;
  updateAll();
}

function resetFilters() {
  searchName.value = '';
  industryFilter.value = '';
  typeFilter.value = '';
  minEmployees.value = '';
  filtered = [...companies];
  page = 1;
  updateAll();
}

function updateAll() {
  updateStats();
  updateChart();
  updateTable();
}

function updateStats() {
  totalCompanies.textContent = filtered.length;
  largeCompanies.textContent = filtered.filter(c => c.employees >= 1000).length;
  totalEmployees.textContent =
    Math.round(filtered.reduce((s,c)=>s+c.employees,0)/1000) + 'K';
  totalIndustries.textContent =
    new Set(filtered.map(c=>c.industry)).size;
}

function updateChart() {
  const counts = {};
  filtered.forEach(c => counts[c.industry] = (counts[c.industry]||0)+1);

  const labels = Object.keys(counts);
  const data = Object.values(counts);

  if (chart) chart.destroy();

  chart = new Chart(industryChart, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: 'rgba(102,126,234,.8)'
      }]
    },
    options: { plugins:{ legend:{display:false} } }
  });
}

function updateTable() {
  const start = (page-1)*perPage;
  const rows = filtered.slice(start,start+perPage);

  if (!rows.length) {
    tableContent.innerHTML = '<div class="no-results">No results</div>';
    pagination.innerHTML = '';
    return;
  }

  tableContent.innerHTML =
    `<table><thead><tr>
      <th>OrgNr</th><th>Name</th><th>Industry</th>
      <th>Type</th><th>Employees</th><th>City</th>
    </tr></thead><tbody>` +
    rows.map(c => `
      <tr>
        <td>${c.orgNr}</td>
        <td>${c.name}</td>
        <td>${c.industry}</td>
        <td>${c.type}</td>
        <td>${c.employees}</td>
        <td>${c.city}</td>
      </tr>`).join('') +
    '</tbody></table>';

  const pages = Math.ceil(filtered.length/perPage);
  pagination.innerHTML =
    `${page>1?`<button onclick="page--,updateTable()">Prev</button>`:''}
     <button disabled>Page ${page} / ${pages}</button>
     ${page<pages?`<button onclick="page++,updateTable()">Next</button>`:''}`;
}

window.onload = init;
