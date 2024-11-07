require('dotenv').config();
const { zerox } = require('./node-zerox/dist');
const path = require('path');
const fs = require('fs');

async function test() {
    try {
        // Clean up previous output
        if (fs.existsSync('./output')) {
            fs.rmSync('./output', { recursive: true, force: true });
        }
        fs.mkdirSync('./output');

        // Test with generali test.pdf - first 3 pages only
        const pdfPath = path.resolve(__dirname, 'examples', 'generali test.pdf');
        console.log("\nProcessing PDF...");
        console.log("Full path:", pdfPath);
        console.log("File exists:", fs.existsSync(pdfPath));
        console.log("File stats:", fs.statSync(pdfPath));

        const result = await zerox({
            filePath: pdfPath,
            openaiAPIKey: process.env.OPENAI_API_KEY,
            cleanup: false,
            concurrency: 1,
            maintainFormat: false,
            model: 'gpt-4o-mini',
            outputDir: './output',
            tempDir: path.join(__dirname, 'temp'),
            pagesToConvertAsImages: [1, 2, 3] // Process only first 3 pages
        });

        console.log('Success! Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Detailed error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            syscall: error.syscall,
            path: error.path,
            details: error
        });
    }
}

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

console.log("Script started");
test();
