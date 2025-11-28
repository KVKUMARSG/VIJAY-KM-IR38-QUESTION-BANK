const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const ASSETS_DIR = path.join(__dirname, '../assets');

async function debugFile(filename) {
    const filePath = path.join(ASSETS_DIR, filename);
    let text = '';

    console.log(`\n--- DEBUGGING ${filename} ---`);
    if (filename.endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        text = data.text;
    } else if (filename.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
    }

    console.log(text.substring(0, 2000)); // Print first 2000 chars
}

async function runDebug() {
    await debugFile('ambitious_baba.pdf');
    await debugFile('IRDA_EXAM_01.docx');
    await debugFile('Life-Question Bank_28032023.pdf');
    await debugFile('mock_01_on_20Nov2025_V3_with_Answers.pdf');
}

runDebug();
