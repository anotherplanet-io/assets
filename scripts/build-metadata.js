import fs from 'fs';
import { glob } from 'glob';
import * as fontkit from 'fontkit';
import axesTags from './axesTags.js';

function validateVariationAxes(axes) {
  const validAxes = Object.keys(axes).reduce((acc, key) => {
    acc[key] = validateVariationAxis(key, axes[key])
    return acc;
  }, {});
  return validAxes;
}

function validateVariationAxis(key, data) {
  if (axesTags[key] && axesTags[key].valid(data)) {
    return { ...data, valid: true };
  }
  return data;
}

async function generateMetaData(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const jsonData = fs.readFileSync(filePath, 'utf8');
  const fonts = JSON.parse(jsonData);

  fonts.forEach(async fontinfo => {
    const font = await fontkit.open(fontinfo['infile']);
    console.log(`Loaded font file ${fontinfo['infile']}`);
    console.log(font.postscriptName);
    console.log('--------------------------------');

    const metadata = {}

    metadata[fontinfo['name']] = {
      postscriptName: font.postscriptName,
      familyName: font.familyName,
      subfamilyName: font.subfamilyName,
      copyright: font.copyright,
      version: font.version,
      versionDisplay: font.version.split(';')[0],
    }

    if (Object.keys(font.variationAxes).length > 0) {
      // variable font 
      const variationAxes = validateVariationAxes(font.variationAxes);
      metadata.variationAxes = variationAxes;
    }

    if (font.unitsPerEm) {
      metadata.unitsPerEm = font.unitsPerEm;
    }

    const versionMatch = font.version.match(/\d+\.\d+/);
    if (versionMatch) {
      const versionNumber = versionMatch[0];
      metadata.versionNumber = versionNumber;
    }

    const githubUrlMatch = font.copyright.match(/\(https:\/\/github\.com\/[^)]+\)/);

    if (githubUrlMatch) {
      const githubUrl = githubUrlMatch[0].slice(1, -1); // Remove parentheses
      metadata.copyrightUrl = githubUrl;
      console.log(githubUrl); // Output: "https://github.com/clauseggers/Playfair"
    } else {
      console.log("GitHub URL not found.");
    }

    const filePath = `${fontinfo['outpath']}/metadata.json`;

    try {
      // Load the existing JSON data from the file 
      let existingData = {};

      // Check if the file exists
      if (fs.existsSync(filePath)) {
        // Load the existing JSON data from the file
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }

      // Merge the objects
      const mergedData = { ...existingData, ...metadata };

      // Save the merged data back to the JSON file
      fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2));

      console.log('Data merged and saved successfully.');
    } catch (error) {
      console.error('Error merging and saving data:', error);
    }

  });
}

// const fontsFiles = await glob(['build/fonts/**/*.ttf'])

/* fontsFiles.forEach(filePath => {
  fs.readFile(filePath, (readErr, buffer) => {
    console.log('filePath', filePath);
    if (readErr) {
      console.error(`Error reading font file ${filePath}:`, readErr);
    } else {
      // Process the font buffer
      console.log(`Loaded font file ${filePath}`);
      const font = fontkit.create(buffer);
      console.log(font.postscriptName);
      console.log(font.familyName);
      console.log(font.subfamilyName);
      console.log(font.copyright);
      console.log(font.version);
      console.log(font.unitsPerEm);
      // console.log(font.variationAxes);
    }
  });
}); */




// Path to your JSON file
const filePath = 'src/fonts.json';

generateMetaData(filePath);