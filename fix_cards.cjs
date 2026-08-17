const fs = require('fs');
const path = require('path');
const dir = 'c:/xampp/htdocs/ESPN/src/pages/inventory';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
    let content = fs.readFileSync(path.join(dir, f), 'utf8');

    // Fix the blue- bugs
    content = content.replace(/blue- /g, 'blue-500 ');
    content = content.replace(/blue- dark/g, 'blue-500 dark');
    content = content.replace(/blue-"/g, 'blue-500"');
    content = content.replace(/blue-:/g, 'blue-500:');
    
    // Sometimes it became text-blue- dark:text-blue-
    content = content.replace(/text-blue-\s/g, 'text-blue-500 ');
    content = content.replace(/bg-blue-\s/g, 'bg-blue-500 ');
    
    const cardRegex = /<Card className=" flex items-center gap-4 shadow-sm">([\s\S]*?)<\/Card>/g;
    content = content.replace(cardRegex, (match, innerContent) => {
        let newInner = innerContent.replace(/<div className="p-3 rounded-2xl([^"]*)">/g, '<div className="p-3 rounded-2xl shrink-0">');
        
        newInner = newInner.replace(/<p className="text-xs[^>]*>([^<]+)<\/p>\s*<h3/g, '<p className="text-xs text-slate-500 dark:text-slate-400 font-medium"></p>\n            <h3');
        
        newInner = newInner.replace(/<h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">([\s\S]*?)<\/h3>/g, '<p className="text-2xl font-black text-slate-900 dark:text-white"></p>');

        return "<div className=\"bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm\">\n          <div className=\"flex items-center gap-4\">" + newInner + "</div>\n        </div>";
    });

    fs.writeFileSync(path.join(dir, f), content);
});
