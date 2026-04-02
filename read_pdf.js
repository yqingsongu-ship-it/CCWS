const fs = require('fs');
const pdf = require('pdf-parse');

const data = fs.readFileSync('Synthetic_Monitoring.pdf');

pdf(data).then(function(result) {
    console.log(result.text);
    fs.writeFileSync('pdf_content.txt', result.text);
    console.log('\n\n--- Saved to pdf_content.txt ---');
}).catch(function(err) {
    console.error('Error:', err);
});
