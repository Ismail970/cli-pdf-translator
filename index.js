#!/usr/bin/env node

import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import pdfParse from "pdf-parse";
import { PDFDocument, rgb } from "pdf-lib";
import { createCanvas } from "canvas";
import translate from "translate";
import LanguageDetect from "languagedetect";
import figlet from "figlet";
import { createSpinner } from "nanospinner";
import gradient from "gradient-string";
import chalk from "chalk";
import { selectFile } from "cli-file-select";

// Clear console before script starts
console.clear();
async function processPDF() {
    const tSpinner = createSpinner('Translating...')
    const fSpinner = createSpinner('One sec...')

    try {
        console.log(gradient.pastel.multiline(figlet.textSync('PDF Translator', { horizontalLayout: 'full' })));
        console.log(); // Empty line for space

        const pdfFilePath = await selectPDFFilePath();

        const { data, textLanguage, targetLanguage } = await prepareTranslation(pdfFilePath);
        console.log();

        tSpinner.start();
        const translatedText = await translateText(data.text, { from: textLanguage, to: targetLanguage });
        tSpinner.success({ text: chalk.green('Translation completed.'), mark: ':)', color: 'green' });
        console.log();

        const formatChoice = await selectOutputFormat();
        console.log();

        fSpinner.start();
        await saveTranslatedFile(pdfFilePath, translatedText, formatChoice);
        fSpinner.success({ text: gradient.pastel.multiline('Your file is ready.'), mark: '', color: '' });

    } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        tSpinner.stop({ text: chalk.red('Translation failed.'), mark: ':o', color: 'red' });
        fSpinner.stop({ text: chalk.red('Sorry something happened.'), mark: ':o', color: 'red' });

        // Restart on error
        processPDF();
    }
}
processPDF()

async function detectLanguage(text) {
    const lngDetector = new LanguageDetect();
    const [result] = lngDetector.detect(text, 1);
    return result ? result[0] : null;
}

async function selectItem(message) {
    const { item } = await inquirer.prompt([
        {
            type: 'input',
            name: 'item',
            message: chalk.yellow(message),
        }
    ]);

    return item
}

async function selectTranslationEngine() {
    console.log(chalk.grey("Select Translation Engine (You need to add your own API keys to use any of the engines below):"));
    console.log("1. Libre");
    console.log("2. Deepl");
    console.log("3. Yandex");
    const choice = await selectItem("Enter the number corresponding to your choice (leave empty for Google): ");

    switch (choice.trim() === '' ? 'google' : parseInt(choice)) {
        case 1:
            translate.engine = "libre";
            translate.key = process.env.LIBRE_KEY;
            break;
        case 2:
            translate.engine = "deepl";
            translate.key = process.env.DEEPL_KEY;
            break;
        case 3:
            translate.engine = "yandex";
            translate.key = process.env.YANDEX_KEY;
            break;
        case 'google':
            translate.engine = "google";
            break;
        default:
            throw new Error(chalk.red('Error: Invalid choice. Please choose a number between 1 and 3.'));
    }

    // API key validation check
    if (!translate.key && translate.engine !== "google") {
        throw new Error(chalk.red('Your engine of choice requires an API key. Please provide a valid API key.'));
    }
}

async function translateText(text, options) {
    try {
        return await translate(text, options, translate.engine);
    } catch (error) {
        console.error(chalk.red('\nTranslation Error:'), error.message);
        throw new Error('Translation failed. Please try again.');
    }
}

// Function to calculate the font size that will fit the text within the page width
function calculateFontSize(text, pageWidth, margin) {
    const maxWidth = pageWidth - 2 * margin;
    const initialFontSize = 12;
    let fontSize = initialFontSize;

    const canvas = createCanvas(1000, 1000); // Create a canvas to measure text width
    const ctx = canvas.getContext('2d');

    while (ctx.measureText(text).width > maxWidth) {
        fontSize -= 1; // Reduce font size until text fits within the page width
        ctx.font = `${fontSize}px Helvetica`; // Update font size for measurement
    }

    return fontSize;
}

async function selectPDFFilePath() {
    try {
        const filePath = await selectFile();
        return filePath;
    } catch (error) {
        console.error(chalk.red("Error selecting PDF file:"), error.message);
        throw error;
    }
}

async function selectOutputFormat() {
    const formatChoice = await inquirer.prompt([
        {
            type: 'list',
            name: 'format',
            message: chalk.yellow('Select output format (Text recommended):'),
            choices: ['PDF', 'Text'],
        }
    ]);
    return formatChoice;
}

async function prepareTranslation(pdfFilePath) {
    const pdfFile = fs.readFileSync(pdfFilePath);
    const data = await pdfParse(pdfFile);

    console.log(chalk.grey("Language code: e.g. 'es' for Spanish."));
    let textLanguage = await selectItem("Enter the language code of your PDF (leave empty for auto detection): ");
    console.log();

    let targetLanguage = await selectItem("Enter the language code for translation (leave empty for English): ");
    if (!targetLanguage) targetLanguage = 'en';

    if (!textLanguage) {
        textLanguage = await detectLanguage(data.text);
        if (!textLanguage) throw new Error(chalk.red("Unable to detect language of the text."));
        console.log(chalk.grey("Detected language:"), textLanguage);
    }
    console.log();

    await selectTranslationEngine();

    return { data, textLanguage, targetLanguage };
}

async function saveTranslatedFile(pdfFilePath, translatedText, formatChoice) {
    const originalFileName = path.basename(pdfFilePath);
    const originalFileDir = path.dirname(pdfFilePath);

    if (formatChoice.format === 'PDF') {
        // Save as PDF
        const pdfFilePath = await saveAsPDF(translatedText, originalFileDir, originalFileName);
        console.log(chalk.green("\nTranslated PDF saved to:"), pdfFilePath);
    } else if (formatChoice.format === 'Text') {
        // Save as text
        const txtFilePath = await saveAsText(translatedText, originalFileDir, originalFileName);
        console.log(chalk.green("\nTranslated text saved to:"), txtFilePath);
    }
}

async function saveAsPDF(translatedText, documentsPath, originalFileName) {
    const PAGE_HEIGHT = 792; // Standard page height (11 inches * 72)
    const MARGIN = 50; // Margin from top of the page
    const PAGE_WIDTH = 612; // Standard page width (8.5 inches * 72)

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    let y = PAGE_HEIGHT - MARGIN;

    const translatedTextLines = translatedText.split("\n");
    for (const line of translatedTextLines) {
        let fontSize = calculateFontSize(line, PAGE_WIDTH, MARGIN);

        // Check if the text exceeds the bounds of the current page
        if (y - fontSize < 0) {
            page = pdfDoc.addPage();
            y = PAGE_HEIGHT - MARGIN;
        }

        page.drawText(line, {
            y,
            size: fontSize,
            color: rgb(0, 0, 0),
        });

        y -= fontSize * 1.2; // Move to the next line
    }

    const filePath = path.join(documentsPath, `translated_${originalFileName}`);
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);
    return filePath;
}

async function saveAsText(translatedText, documentsPath, originalFileName) {
    const filePath = path.join(documentsPath, `translated_${path.parse(originalFileName).name}.txt`);
    fs.writeFileSync(filePath, translatedText);
    return filePath;
}
