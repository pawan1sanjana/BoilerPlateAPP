const fs = require('fs');
let goods = fs.readFileSync('c:/xampp/htdocs/ESPN/src/pages/inventory/GoodsInventoryTab.tsx', 'utf8');
let history = fs.readFileSync('c:/xampp/htdocs/ESPN/src/pages/inventory/IssueHistoryTab.tsx', 'utf8');

// Fix GoodsInventoryTab.tsx
let gParts = goods.split('<p className="text-2xl font-black text-slate-900 dark:text-white"></p>');
if (gParts.length === 5) {
    goods = gParts[0] + '<p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalItems}</p>'
          + gParts[1] + '<p className="text-2xl font-black text-slate-900 dark:text-white"><span className="text-[10px] text-slate-400 font-bold mr-1">LKR</span>{(stats.totalValue / 1000).toFixed(1)}K</p>'
          + gParts[2] + '<p className="text-2xl font-black text-slate-900 dark:text-white">{stats.lowStock}</p>'
          + gParts[3] + '<p className="text-2xl font-black text-slate-900 dark:text-white">{stats.categoriesCount}</p>'
          + gParts[4];
}
let gPartsP = goods.split('<p className="text-xs text-slate-500 dark:text-slate-400 font-medium"></p>');
if (gPartsP.length === 5) {
    goods = gPartsP[0] + '<p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total SKUs</p>'
          + gPartsP[1] + '<p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Asset Value</p>'
          + gPartsP[2] + '<p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Low Stock</p>'
          + gPartsP[3] + '<p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estate Segments</p>'
          + gPartsP[4];
}
fs.writeFileSync('c:/xampp/htdocs/ESPN/src/pages/inventory/GoodsInventoryTab.tsx', goods);

// Fix IssueHistoryTab.tsx
let hParts = history.split('<p className="text-2xl font-black text-slate-900 dark:text-white"></p>');
if (hParts.length === 4) {
    history = hParts[0] + '<p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalIssuance}</p>'
            + hParts[1] + '<p className="text-2xl font-black text-slate-900 dark:text-white">{stats.recentIssuance}</p>'
            + hParts[2] + '<p className="text-2xl font-black text-slate-900 dark:text-white">{stats.majorRecipients}</p>'
            + hParts[3];
}
// The label wasn't empty in IssueHistoryTab because it used a different original class for the label! 
// Let's check if the label was empty. My regex was matching:
// /<p className="text-xs[^>]*>([^<]+)<\/p>\s*<h3/g
// But IssueHistoryTab originally didn't use h3 for values, it used <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight"> ! Wait, I replaced h3 in my fix_cards.cjs for GoodsInventoryTab, but what about IssueHistoryTab?
// If it didn't match the label regex, the label is still there! We saw earlier:
// <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 leading-none">Global Issues</p>
// So only the value needs fixing in IssueHistoryTab! Let's also fix the label styling in IssueHistoryTab to match the common one!
history = history.replace(/<p className="text-\[10px\] text-slate-500 font-bold uppercase tracking-widest mb-1 leading-none">([^<]+)<\/p>/g, '<p className="text-xs text-slate-500 dark:text-slate-400 font-medium"></p>');
fs.writeFileSync('c:/xampp/htdocs/ESPN/src/pages/inventory/IssueHistoryTab.tsx', history);
