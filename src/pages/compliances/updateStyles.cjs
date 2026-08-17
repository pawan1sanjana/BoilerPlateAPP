const fs = require('fs');
const path = require('path');

const files = [
  'c:\\xampp\\htdocs\\ESPN\\src\\pages\\compliances\\RevenueLicenseManagement.tsx',
  'c:\\xampp\\htdocs\\ESPN\\src\\pages\\compliances\\InsuranceManagement.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace tea colors with blue
  content = content.replace(/tea-/g, 'blue-');

  // Replace header 1 classes
  content = content.replace(/text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-outfit tracking-tight/g, 'text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic');

  // Replace header p classes
  content = content.replace(/text-slate-500 text-sm font-medium flex items-center gap-2 mt-1/g, 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2');

  // Remove any remaining font-outfit
  content = content.replace(/font-outfit/g, '');

  fs.writeFileSync(file, content);
}
console.log('Done replacing styles.');
