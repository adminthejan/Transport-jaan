const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

console.log('Testing jsPDF helper readiness...');
const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
doc.text('Test', 10, 10);
const buf = Buffer.from(doc.output('arraybuffer'));
console.log('Buffer bytes:', buf.length);
