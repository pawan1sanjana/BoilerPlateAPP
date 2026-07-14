const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansSinhala/NotoSansSinhala-Regular.ttf';

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.log('Failed to download, status:', res.statusCode);
    return;
  }
  const data = [];
  res.on('data', (chunk) => {
    data.push(chunk);
  });
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    const base64 = buffer.toString('base64');
    const tsCode = `export const NotoSansSinhalaBase64 = "${base64}";\n`;
    fs.writeFileSync('src/lib/sinhalaFont.ts', tsCode);
    console.log('Font downloaded and converted to base64.');
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
