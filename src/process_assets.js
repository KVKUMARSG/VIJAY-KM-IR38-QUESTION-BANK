const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const ASSETS_DIR = path.join(__dirname, '../assets');
const OUTPUT_FILE = path.join(__dirname, '../data/questions.json');

// Regex patterns for different file formats
const PATTERNS = {
    // Standard: "1. Question ... a) Option ... Ans: a"
    standard: {
        question: /^\s*(\d+)[\.\)]\s*(.+)/,
        option: /^\s*([a-d]|[A-D])[\.\)]\s*(.+)/,
        answer: /(?:Ans|Answer|Correct Option)\s*[:\-]\s*([a-d]|[A-D])/i
    },
    // Roman: "Q1: Question ... I. Option ... II. Option" (No explicit answer key in text usually, or at end)
    roman: {
        question: /^\s*Q?(\d+)[:\.]\s*(.+)/i,
        option: /^\s*([IVX]+)[\.\)]\s*(.+)/,
        answer: /(?:Ans|Answer)\s*[:\-]\s*([IVX]+|[a-d])/i
    }
};

async function extractTextFromPdf(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    try {
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (e) {
        console.error(`Error reading PDF ${filePath}:`, e);
        return '';
    }
}

async function extractTextFromDocx(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    } catch (e) {
        console.error(`Error reading DOCX ${filePath}:`, e);
        return '';
    }
}

function parseQuestions(text, sourceName) {
    const lines = text.split('\n');
    const questions = [];
    let currentQuestion = null;
    let currentPattern = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Try to detect start of a new question using all patterns
        let qMatch = null;
        let detectedPattern = null;

        // Check Standard
        if (!currentQuestion || currentPattern === 'standard') {
            const m = line.match(PATTERNS.standard.question);
            if (m) { qMatch = m; detectedPattern = 'standard'; }
        }
        // Check Roman (if standard didn't match or we are in roman mode)
        if (!qMatch && (!currentQuestion || currentPattern === 'roman')) {
            const m = line.match(PATTERNS.roman.question);
            if (m) { qMatch = m; detectedPattern = 'roman'; }
        }

        if (qMatch) {
            // Save previous
            if (currentQuestion && currentQuestion.options.length >= 2) {
                if (currentQuestion.correctIndex === -1) currentQuestion.correctIndex = 0;
                questions.push(currentQuestion);
            }

            currentQuestion = {
                id: questions.length + 1,
                question: qMatch[2],
                options: [],
                correctIndex: -1,
                explanation: `Source: ${sourceName}`,
                chartData: null
            };
            currentPattern = detectedPattern;
            continue;
        }

        if (!currentQuestion) continue;

        // Try to match options based on current pattern
        let optMatch = null;
        if (currentPattern === 'standard') {
            optMatch = line.match(PATTERNS.standard.option);
        } else if (currentPattern === 'roman') {
            optMatch = line.match(PATTERNS.roman.option);
        }

        if (optMatch) {
            currentQuestion.options.push(optMatch[2]);
            continue;
        }

        // Try to match Answer
        let ansMatch = null;
        if (currentPattern === 'standard') {
            ansMatch = line.match(PATTERNS.standard.answer);
            if (ansMatch) {
                currentQuestion.correctIndex = ansMatch[1].toLowerCase().charCodeAt(0) - 97;
            }
        }

        // Append text if not an option/answer
        if (currentQuestion.options.length === 0 && !line.match(/^(Page|Chapter|Section|ambitiousbaba)/i)) {
            currentQuestion.question += " " + line;
        }
    }

    // Push last
    if (currentQuestion && currentQuestion.options.length >= 2) {
        if (currentQuestion.correctIndex === -1) currentQuestion.correctIndex = 0;
        questions.push(currentQuestion);
    }

    return questions;
}

async function processAll() {
    const files = fs.readdirSync(ASSETS_DIR);
    let allQuestions = [];

    console.log(`Found ${files.length} files in assets.`);

    for (const file of files) {
        const filePath = path.join(ASSETS_DIR, file);
        let text = '';

        console.log(`Processing ${file}...`);

        if (file.endsWith('.pdf')) {
            text = await extractTextFromPdf(filePath);
        } else if (file.endsWith('.docx')) {
            text = await extractTextFromDocx(filePath);
        } else if (file.endsWith('.txt')) {
            text = fs.readFileSync(filePath, 'utf-8');
        }

        if (text) {
            const extracted = parseQuestions(text, file);
            console.log(`  -> Extracted ${extracted.length} questions.`);
            allQuestions = allQuestions.concat(extracted);
        }
    }

    // Validation and Deduplication
    const uniqueQuestions = [];
    const seenQuestions = new Set();

    // Helper to normalize text for comparison
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    console.log(`\nValidating ${allQuestions.length} raw questions...`);

    for (const q of allQuestions) {
        // 1. Basic Validation
        if (!q.question || q.question.length < 10) continue; // Too short
        if (q.options.length < 4) continue; // Not enough options
        if (q.correctIndex < 0 || q.correctIndex >= q.options.length) continue; // Invalid answer index

        // 2. Deduplication
        const qKey = normalize(q.question);
        if (seenQuestions.has(qKey)) {
            continue;
        }

        seenQuestions.add(qKey);

        // 3. Ensure Explanation
        if (!q.explanation || q.explanation.startsWith("Source:")) {
            q.explanation = `Correct Answer: ${String.fromCharCode(65 + q.correctIndex)}. ${q.explanation}`;
        }

        uniqueQuestions.push(q);
    }

    // Re-index
    const finalQuestions = uniqueQuestions.map((q, i) => ({ ...q, id: i + 1 }));

    console.log(`Total valid unique questions: ${finalQuestions.length}`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalQuestions, null, 4));
    console.log(`Saved to ${OUTPUT_FILE}`);
}

processAll();
