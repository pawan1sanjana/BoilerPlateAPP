const fs = require('fs');
const path = require('path');
const dir = 'c:/xampp/htdocs/ESPN/src/pages/inventory';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.forEach(f => {
    let content = fs.readFileSync(path.join(dir, f), 'utf8');
    content = content.replace(/blue- /g, 'blue-500 ');
    content = content.replace(/blue-"/g, 'blue-500"');
    content = content.replace(/blue- dark/g, 'blue-500 dark');
    content = content.replace(/blue-500100/g, 'blue-100'); // if tea-100 got replaced with blue-100
    // Actually we need to fix the statcards to match common statcards
    // The previous common statcards had:
    // <Card className=" flex items-center gap-4 shadow-sm">
    // <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
    // <Box size={22} className="text-blue-600 dark:text-blue-400" />
    // </div>
    // <div>
    // <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider leading-none mb-1">Total SKUs</p>
    // <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{stats.totalItems}</h3>
    // </div>
    // </Card>
    // We should replace that structure with the Dashboard StatCard structure!
    fs.writeFileSync(path.join(dir, f), content);
});
