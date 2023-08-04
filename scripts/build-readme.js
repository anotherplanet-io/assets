import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { markdownTable } from 'markdown-table'


// Register Handlebars helpers
Handlebars.registerHelper('heading', function (level, text) {
  return `#${'#'.repeat(level)} ${text}\n`;
});

Handlebars.registerHelper('bold', function (text) {
  return `**${text}**`;
});

Handlebars.registerHelper('italic', function (text) {
  return `*${text}*`;
});

Handlebars.registerHelper('listItem', function (text) {
  return `- ${text}\n`;
});

Handlebars.registerHelper('codeBlock', function (code, language = 'javascript') {
  const codeBlock = language ? `\`\`\`${language}\n${code}\n\`\`\`` : `\`\`\`\n${code}\n\`\`\``;
  return `${codeBlock}\n`;
});

Handlebars.registerHelper('table', function (headersJson, rows, alignJson) {
  const headers = JSON.parse(headersJson);
  const align = JSON.parse(alignJson);
  let option = {};
  let data = [];

  if (typeof rows[0] === 'object' && !Array.isArray(rows[0]) && rows[0] !== null) {
    const arr = rows.map(obj => {
      return headers.map(key => obj[key] || '');
    });
    data = [headers, ...arr];
  } else {
    console.log(rows);
    data = [headers,...rows];
  }

  if (align) {
    option = { align };
  }

  return markdownTable(data, option)
});

Handlebars.registerHelper('link', function (url, text) {
  return `[${text}](${url})\n`;
});

Handlebars.registerHelper('image', function (url, text) {
  return `![${text}](${url})\n`;
});

Handlebars.registerHelper('currentDateTime', function(format) {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  // Replace the placeholders in the format string with the current date and time values
  const dateTime = format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);

  return dateTime;
});

// Read the Handlebars template file
const templateFile = 'scripts/README_template.md';
const templateContent = fs.readFileSync(templateFile, 'utf8');

// Compile the Handlebars template
const template = Handlebars.compile(templateContent);

const fontsPath = 'src/fonts.json';

let fonts = {};

try {
  fonts = JSON.parse(fs.readFileSync(fontsPath, 'utf8'));
} catch (err) {
  console.error('Error reading or parsing JSON:', err);
}

// Provide context data
const context = {
  title: 'My Markdown Document',
  items: ['Item 1', 'Item 2', 'Item 3'],
  code: 'const message = "Hello World";',
  fonts,
  rows: [
    ['John Doe', '30', 'New York'],
    ['Jane Smith', '25', 'Los Angeles'],
    ['Mike Johnson', '35', 'Chicago']
  ]
};

// Generate Markdown content
const markdownContent = template(context);

// Write the Markdown content to a file
const outputFileName = 'README.md';
fs.writeFileSync(outputFileName, markdownContent);

console.log(`Markdown file '${outputFileName}' has been generated.`);
