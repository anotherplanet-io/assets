import fs from 'fs';
import * as fontkit from 'fontkit';
import axesTags from './axesTags.js';
import { camelCase } from "change-case";
import { camelCaseTransformMerge } from "camel-case";
import { createStyleObject, createStyleString, createFontStack, precomputeValues } from '@capsizecss/core';

import helveticaNeue from '@capsizecss/metrics/helveticaNeue.js';
import arial from '@capsizecss/metrics/arial.js';



// const CSS_URL_STRING = `url('font-files/${filename}?v=${font_v}') format('${type}')`;
// //  template for CSS
// const CSS_TEMPLATE = `
// /* “${comment} */
// @font-face {{
//   font-family: '${family}';
//   font-style: ${style};
//   font-weight: ${weight ? weight : 'normal'};
//   font-display: swap;
//   src: ${src};
//   unicode-range: {unicode_range};{extra}
// }}`;


/*
   Rounding all values to a precision of `4` based on discovering that browser
   implementations of layout units fall between 1/60th and 1/64th of a pixel.

   Reference: https://trac.webkit.org/wiki/LayoutUnit
   (above wiki also mentions Mozilla - https://trac.webkit.org/wiki/LayoutUnit#Notes)
*/
const round = (value) => parseFloat(value.toFixed(4));


// const unicodeRanges = generateUnicodeRange(latin);
// console.log(unicodeRanges.join(', ')); // Outputs the formatted Unicode range strings


const pgtsFontSize = {
  "Editorial Mega Display": { fontSize: 112, leading: 128 },
  "Editorial Dominant Display": { fontSize: 96, leading: 112 },
  "Display large": { fontSize: 80, leading: 96 },
  "Display": { fontSize: 64, leading: 72 },
  "Display small": { fontSize: 48, leading: 56 },
  "Headline large": { fontSize: 37, leading: 44 },
  "Headline": { fontSize: 32, leading: 36 },
  "Headline small": { fontSize: 29, leading: 32 },
  "Title large": { fontSize: 24, leading: 28 },
  "Title": { fontSize: 21, leading: 24 },
  "Title small": { fontSize: 19, leading: 24 },
  "Body": { fontSize: 16, leading: 20 },
  "Body small": { fontSize: 15, leading: 20 },
  "Footnote": { fontSize: 13, leading: 20 },
  "Caption large": { fontSize: 12, leading: 16 },
  "Caption": { fontSize: 11, leading: 16 },
  "Caption small": { fontSize: 9, leading: 12 },
  "Legal large": { fontSize: 8, leading: 12 },
  "Legal": { fontSize: 7, leading: 12 },
  "Legal small": { fontSize: 6, leading: 8 },
}

// Ref: https://en.wikipedia.org/wiki/Letter_frequency#Relative_frequencies_of_letters_in_other_languages
const weightings = {
  a: 0.0668,
  b: 0.0122,
  c: 0.0228,
  d: 0.0348,
  e: 0.1039,
  f: 0.0182,
  g: 0.0165,
  h: 0.0499,
  i: 0.057,
  j: 0.0013,
  k: 0.0063,
  l: 0.0329,
  m: 0.0197,
  n: 0.0552,
  o: 0.0614,
  p: 0.0158,
  q: 0.0008,
  r: 0.049,
  s: 0.0518,
  t: 0.0741,
  u: 0.0226,
  v: 0.008,
  w: 0.0193,
  x: 0.0012,
  y: 0.0162,
  z: 0.0006,
  ' ': 0.1818,
};
const sampleString = Object.keys(weightings).join('');
const weightingForCharacter = (character) => {
  if (!Object.keys(weightings).includes(character)) {
    throw new Error(`No weighting specified for character: “${character}”`);
  }
  return weightings[character];
};

function getxWidthAvg(font) {

  const glyphs = font.glyphsForString(sampleString);
  const weightedWidth = glyphs.reduce((sum, glyph, index) => {
    const character = sampleString.charAt(index);

    let charWidth = font['OS/2'].xAvgCharWidth;
    try {
      charWidth = glyph.advanceWidth;
    } catch (e) {
      console.warn(
        `Couldn’t read 'advanceWidth' for character “${character === ' ' ? '<space>' : character
        }” from “${familyName}”. Falling back to “xAvgCharWidth”.`,
      );
    }

    return sum + charWidth * weightingForCharacter(character);
  }, 0);

  return Math.round(weightedWidth)
}


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

    console.log(' ');
    console.log('--------------------------------');
    console.log(`Loaded font file ${fontinfo['infile']}`);
    console.log(font.postscriptName);


    const metadata = {}

    metadata[fontinfo['name']] = {
      postscriptName: font.postscriptName,
      familyName: font.familyName, // familyName Font metrics
      category: fontinfo['category'],
      subfamilyName: font.subfamilyName,
      copyright: font.copyright,
      version: font.version,
      versionDisplay: font.version.split(';')[0],
      outpath: fontinfo['outpath'],
    }

    // variations axes

    if (font.namedVariations) {
      metadata.namedVariations = font.namedVariations;
    }

    if (Object.keys(font.variationAxes).length > 0) {
      // variable font 
      const variationAxes = validateVariationAxes(font.variationAxes);
      metadata.variationAxes = variationAxes;
    }

    // metrics

    if (font.unitsPerEm) {
      metadata.unitsPerEm = font.unitsPerEm;
    }

    if (font.ascent) {
      metadata.ascent = font.ascent;
    }

    if (font.descent) {
      metadata.descent = font.descent;
    }

    if (font.lineGap) {
      metadata.lineGap = font.lineGap;
    }

    if (font.underlinePosition && font.underlineThickness) {
      metadata.underlinePosition = font.underlinePosition;
      metadata.underlineThickness = font.underlineThickness;
    }

    if (font.italicAngle) {
      metadata.italicAngle = font.italicAngle;
    }

    if (font.capHeight) {
      metadata.capHeight = font.capHeight;
    }

    if (font.xHeight) {
      metadata.xHeight = font.xHeight;
    }

    if (font.bbox) {
      metadata.bbox = font.bbox;
    }

    // Glyphs

    if (font.characterSet) {
      metadata.characterSet = font.characterSet;
    }

    if (font.numGlyphs) {
      metadata.numGlyphs = font.numGlyphs;
    }

    if (font.availableFeatures) {
      metadata.availableFeatures = font.availableFeatures;
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
    } else {
      console.log("GitHub URL not found.");
    }

    const xWidthAvg = getxWidthAvg(font);

    if (xWidthAvg) {
      metadata.xWidthAvg = xWidthAvg;
    }

    const styles = Object.keys(pgtsFontSize).reduce((acc, key) => {
      const { fontSize, leading } = pgtsFontSize[key];
      const capsizeStyles = createStyleObject({
        fontSize,
        leading, // = lineHeight
        fontMetrics: font,
      });

      const capsizedStyleRule = createStyleString(camelCase(key, { transform: camelCaseTransformMerge }), {
        fontSize,
        leading, // = lineHeight
        fontMetrics: font,
      });

      const { fontFamily, fontFaces } = createFontStack([
        font,
        helveticaNeue,
        arial,
      ], {
        fontFaceProperties: {
          fontDisplay: 'swap',
        },
      });

      const capsizeValues = precomputeValues({
        fontSize,
        leading, // = lineHeight
        fontMetrics: font,
      });

      acc[key] = {
        ...capsizeStyles,
        capsizedStyleRule,
        lineHeightRem: parseFloat(capsizeStyles.lineHeight) / 16,
        fontSizeRem: fontSize / 16,
        fontFamily,
        fontFaces,
        capsizeValues,
      };
      return acc;
    }, {});

    if (styles) {
      metadata.pgts = styles;
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
    console.log(' ');

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