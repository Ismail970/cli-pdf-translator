# PDF Translator

This is a command-line tool for translating PDF documents.

## Installation

To install the PDF Translator tool, you can use npm:

```
npm install -g pdf-translator
```

or get it direcly from Github

## Usage

After installation, you can run the tool using the following command:

```
pdf-translator
```

or

```
pdf-translator <PAHT TO PDF>
```

The tool will guide you through the process of selecting a PDF file, choosing translation options, and specifying the output format.

## Configuration

Set up API keys for translation engines (Google, Libre, Deepl, Yandex) in environment variables (LIBRE_KEY, DEEPL_KEY, YANDEX_KEY).

Customize the translation process and output format as needed.

## Dependencies

- `pdf-parse`: For parsing text content from PDF files.
- `languagedetect`: For language detection of the input text.
- `translate`: For translating text using various translation engines.
- `inquirer`: For creating interactive command-line prompts.
- `figlet`: For generating ASCII art headers.
- `gradient-string`: For styling text with gradients.
- `nanospinner`: For displaying spinner animations.
- `cli-file-select`: For selecting PDF files from the system.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
