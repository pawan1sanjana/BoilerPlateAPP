const fs = require('fs');
const p = 'c:\\xampp\\htdocs\\ESPN\\src\\pages\\muster\\WorkerEnrollment.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync(p, c);
