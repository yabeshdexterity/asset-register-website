// ============================================================
// SHARED DATA & CONFIGURATION
// ============================================================
let data = [];
let extraAssets = { cpu: [], monitor: [], keyboard: [], mouse: [] };
let rentalItems = [];
let pmData = [];

let currentSeat = null;
let editingRentalIndex = -1;

const FIELDS = [
  {key:"seating_id", label:"Seating ID"}, {key:"seating_availability", label:"Status"}, 
  {key:"employee_name", label:"Employee Name"}, {key:"employee_id", label:"Employee ID"},
  {key:"employment_type", label:"Employment Type"}, {key:"intercom_number", label:"Intercom Number"}, 
  {key:"desktop_name", label:"Desktop Name"}, {key:"ip_address", label:"IP Address"},
  {key:"processor", label:"Processor"}, {key:"ram", label:"RAM"}, {key:"graphics_card", label:"Graphics Card"},
  {key:"ssd", label:"SSD"}, {key:"hard_disk", label:"Hard Disk"}, {key:"keyboard_brand", label:"Keyboard Brand"},
  {key:"mouse_brand", label:"Mouse Brand"}, {key:"cpu_cabinet_brand", label:"CPU Cabinet Brand"}, 
  {key:"cpu_cabinet_id", label:"CPU Cabinet ID"}, {key:"monitor1_brand", label:"Monitor 1 Brand"},
  {key:"monitor1_id", label:"Monitor 1 ID"}, {key:"monitor1_inches", label:"Monitor 1 Inches"},
  {key:"monitor2_brand", label:"Monitor 2 Brand"}, {key:"monitor2_id", label:"Monitor 2 ID"},
  {key:"monitor2_inches", label:"Monitor 2 Inches"}, {key:"ownership_cpu", label:"CPU Ownership"},
  {key:"ownership_monitor1", label:"Monitor 1 Ownership"}, {key:"ownership_monitor2", label:"Monitor 2 Ownership"},
  {key:"ownership_keyboard", label:"Keyboard Ownership"}, {key:"ownership_mouse", label:"Mouse Ownership"}
];

const BRAND_OPTIONS = {
  cpu: ['ACER', 'DELL', 'ZEBRONICS', 'COOLER MASTER', 'POWER X'],
  monitor: ['ACER', 'DELL', 'ZEBSTER', 'ZEBRONICS', 'THINK VISION', 'HP', 'KRYSTAA', 'VIEWSONIC', 'LENOVO', 'LG'],
  keyboard: ['DELL', 'LOGITECH', 'HP', 'PORTRONIC', 'ZEBRONICS'],
  mouse: ['DELL', 'LOGITECH', 'PORTRONICS', 'ZEBRONICS']
};

const ASSET_LABELS = { cpu: 'CPU Units', monitor: 'Monitors', keyboard: 'Keyboards', mouse: 'Mice' };

// ============================================================
// CLOUD API (JSONBin)
// ============================================================
function loadSettings() {
  const apiKey = localStorage.getItem('webApiKey');
  const binId = localStorage.getItem('webBinId');
  return { apiKey, binId };
}

async function apiRequest(method, path, body = null) {
  const { apiKey, binId } = loadSettings();
  if (!apiKey || !binId) return null;
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey },
      body: body ? JSON.stringify(body) : null
    });
    if (method === 'GET') {
      const result = await response.json();
      return result.record;
    }
    return true;
  } catch (e) { console.error(e); return null; }
}

async function loadAllData() {
  const cloudData = await apiRequest('GET', '/latest');
  if (cloudData) {
    if (cloudData.assets) data = cloudData.assets;
    if (cloudData.extraAssets) extraAssets = cloudData.extraAssets;
    if (cloudData.rentalItems) rentalItems = cloudData.rentalItems;
    if (cloudData.paths) pmData = cloudData.paths;
  }
  return cloudData;
}

async function autoSyncToCloud() {
  const allData = { assets: data, extraAssets: extraAssets, rentalItems: rentalItems, paths: pmData };
  await apiRequest('PUT', '', allData);
}

// ============================================================
// HELPERS
// ============================================================
function normalizePath(path) {
  if (!path) return "";
  path = path.trim().replace(/\//g, "\\");
  if (path.startsWith("\\") && !path.startsWith("\\\\")) path = "\\" + path;
  return path;
}

function autoFormatDate(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length > 8) value = value.substring(0, 8);
  if (value.length > 4) input.value = value.substring(0, 2) + '-' + value.substring(2, 4) + '-' + value.substring(4, 8);
  else if (value.length > 2) input.value = value.substring(0, 2) + '-' + value.substring(2, 4);
  else input.value = value;
}

function calculateIdealDays() {
  const p = document.getElementById('rentalProblemDate').value;
  const rep = document.getElementById('rentalReplacementDate').value;
  const ret = document.getElementById('rentalReturnDate').value;
  const end = rep || ret;
  if (p && end) {
    const p1 = p.split('-'), p2 = end.split('-');
    const d1 = new Date(p1[2], p1[1] - 1, p1[0]);
    const d2 = new Date(p2[2], p2[1] - 1, p2[0]);
    if (d1 <= d2) document.getElementById('rentalIdealDays').value = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    else document.getElementById('rentalIdealDays').value = '';
  } else document.getElementById('rentalIdealDays').value = '';
}

function setTodayDate(id) {
  const d = new Date();
  document.getElementById(id).value = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}

// ============================================================
// UI FUNCTIONS
// ============================================================
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function openSettings() {
  const s = loadSettings();
  document.getElementById('webApiKey').value = s.apiKey || '';
  document.getElementById('webBinId').value = s.binId || '';
  document.getElementById('settingsModal').classList.add('active');
}
function closeSettings() { document.getElementById('settingsModal').classList.remove('active'); }
function saveSettings() {
  const apiKey = document.getElementById('webApiKey').value.trim();
  const binId = document.getElementById('webBinId').value.trim();
  if (!apiKey || !binId) { showToast('❌ Please enter both API Key and Bin ID'); return; }
  localStorage.setItem('webApiKey', apiKey);
  localStorage.setItem('webBinId', binId);
  closeSettings();
  showToast('✅ Settings saved!');
  location.reload();
}

async function exportReport() {
  showToast('📊 Generating report...');
  const workbook = new ExcelJS.Workbook();
  const ws1 = workbook.addWorksheet('Asset Details');
  const ws2 = workbook.addWorksheet('Rental Systems');
  const ws3 = workbook.addWorksheet('Extra Assets');
  const ws4 = workbook.addWorksheet('Summary');

  // Sheet 1
  const columns = FIELDS.map(f => ({ header: f.label, key: f.key }));
  ws1.columns = columns;
  data.forEach(row => ws1.addRow(row));

  // Sheet 2
  ws2.addRow(['S.No', 'Batch No', 'CPU', 'Monitor', 'CPU Spec', 'Service Tag']);
  rentalItems.forEach((r, i) => ws2.addRow([i+1, r.batchNo, r.cpu, r.monitor, r.cpuSpec, r.serviceTag]));

  // Sheet 3
  ws3.addRow(['Category', 'Brand', 'Quantity']);
  Object.keys(extraAssets).forEach(cat => (extraAssets[cat] || []).forEach(item => ws3.addRow([cat, item.brand, item.quantity])));

  // Sheet 4
  ws4.addRow(['Total Seats', data.length]);
  ws4.addRow(['Total Rentals', rentalItems.length]);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `asset_register_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('✅ Report exported!');
}
