import { PDFParse } from './node_modules/pdf-parse/dist/pdf-parse/esm/index.js';
import fs from 'fs';

const data = fs.readFileSync('Synthetic_Monitoring.pdf');

const parser = new PDFParse({ data });
const result = await parser.getText();
console.log(result.text);
fs.writeFileSync('pdf_content.txt', result.text);
console.log('\n\n--- Saved to pdf_content.txt ---');
