const XLSX = require('xlsx');
const wb = XLSX.readFile('C:\\Users\\gabryel.silva\\Downloads\\dashboard_v2 (2)\\dashboard_v2\\Danos Origem.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { defval: "", header: 1 });
console.log("Headers:", JSON.stringify(data[0]));
console.log("First 10 rows:");
for(let i = 1; i < Math.min(11, data.length); i++) {
    console.log(JSON.stringify(data[i]));
}
console.log("Total rows:", data.length - 1);
