import fs from 'fs';
import path from 'path';
import * as fontkit from 'fontkit';
import axesTags from './axesTags.js';
import { camelCase } from "change-case";
import { camelCaseTransformMerge } from "camel-case";
import { createStyleObject, createStyleString, createFontStack, precomputeValues } from '@capsizecss/core';
import Handlebars from 'handlebars';
import delimiters from 'handlebars-delimiters';
import helveticaNeue from '@capsizecss/metrics/helveticaNeue.js';
import arial from '@capsizecss/metrics/arial.js';
import { compactRanges, convertToUnicodeString, flattenNestedArray, getArrayIntersection, range as unicodeRange } from '@ap.cx/unicode-range';

// Set the new delimiters to use python template delimiters
delimiters(Handlebars, ['{', '}']);

const cssUrlString = ({ filename, font_v, type }) => `url('${filename}?v=${font_v}') format('${type}')`;
//  template for CSS
const cssTemplate = ({ comment, family, style, weight, src, unicode_range, extra }) => `
/* subset: “${comment}” */
@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight ? weight : 'normal'};
  font-display: swap;
  src: ${src};
  unicode-range: ${unicode_range}; 
  ${extra}
}`;


/*
   Rounding all values to a precision of `4` based on discovering that browser
   implementations of layout units fall between 1/60th and 1/64th of a pixel.

   Reference: https://trac.webkit.org/wiki/LayoutUnit
   (above wiki also mentions Mozilla - https://trac.webkit.org/wiki/LayoutUnit#Notes)
*/
const round = (value) => parseFloat(value.toFixed(4));


// const unicodeRanges = generateUnicodeRange(latin);
// console.log(unicodeRanges.join(', ')); // Outputs the formatted Unicode range strings


const pgtsDesktopFontSize = {
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

const SUBSET = {
  latin: [  // Latin & ASCII
    ...unicodeRange(0x0000, 0x00FF),
    0x0131,
    ...unicodeRange(0x0152, 0x0153),
    ...unicodeRange(0x02BB, 0x02BC),
    0x02C6,
    0x02DA,
    0x02DC,
    ...unicodeRange(0x2000, 0x206F),
    0x2074,
    0x20AC,
    0x2122,
    0x2191,
    0x2193,
    0x2212,
    0x2215,
    0xFEFF,
    0xFFFD,
  ],

  'latin-ext': [  // Latin extended A & B
    ...unicodeRange(0x0100, 0x024F),
    0x0259,
    ...unicodeRange(0x1E00, 0x1EFF),
    0x2020,
    ...unicodeRange(0x20A0, 0x20AB),
    ...unicodeRange(0x20AD, 0x20CF),
    0x2113,
    ...unicodeRange(0x2C60, 0x2C7F),
    ...unicodeRange(0xA720, 0xA7FF),
  ],

  vietnamese: [
    ...unicodeRange(0x0102, 0x0103),
    ...unicodeRange(0x0110, 0x0111),
    ...unicodeRange(0x0128, 0x0129),
    ...unicodeRange(0x0168, 0x0169),
    ...unicodeRange(0x01A0, 0x01A1),
    ...unicodeRange(0x01AF, 0x01B0),
    ...unicodeRange(0x1EA0, 0x1EF9),
    0x20AB,
  ],

  greek: [
    ...unicodeRange(0x0370, 0x03FF),
    ...unicodeRange(0x1F00, 0x1FFF),  // extended
  ],

  cyrillic: [
    ...unicodeRange(0x0400, 0x045F),
    ...unicodeRange(0x0490, 0x0491),
    ...unicodeRange(0x04B0, 0x04B1),
    0x2116,
    // extended:
    ...unicodeRange(0x0460, 0x052F),
    ...unicodeRange(0x1C80, 0x1C88),
    0x20B4,
    ...unicodeRange(0x2DE0, 0x2DFF),
    ...unicodeRange(0xA640, 0xA69F),
    ...unicodeRange(0xFE2E, 0xFE2F),
  ],

  symbols: [],
  //*genCompactIntRanges(SYMBOL_UNICODES)

};

const sampleString = Object.keys(weightings).join('');

const weightingForCharacter = (character) => {
  if (!Object.keys(weightings).includes(character)) {
    throw new Error(`No weighting specified for character: “${character}”`);
  }
  return weightings[character];
};

function getFontType(extension) {
  console.log(extension);
  switch (extension) {
    case 'woff':
      return 'woff';
    case 'woff2':
      return 'woff2';
    case 'ttf':
      return 'truetype';
    case 'eot':
      return 'embedded-opentype';
    case 'otf':
      return 'opentype';
    case 'svg':
      return 'svg';
    default:
      return 'truetype';
  }
}

function generateFontfaceCssFiles(fontinfo, metadata, font) {

  const src = fontinfo['outfile'].map((filePath) => {
    const extension = path.extname(filePath);
    const type = getFontType(extension.slice(1));

    return cssUrlString({
      filename: path.relative(fontinfo['outpath'], filePath),
      font_v: encodeURIComponent(camelCase(metadata.versionDisplay)),
      type
    })
  }).join(',\n       ');

  const cssString = fontinfo['subset'].map((subset) => {
    if (!SUBSET[subset]) {
      throw new Error(`No font subset specified: “${subset}”`);
    }
    const currentSubset = getArrayIntersection(SUBSET[subset], metadata.characterSet);
    const compactSubset = compactRanges(currentSubset);
    const compiledTemplate = Handlebars.compile(src);
    const srcString = compiledTemplate({ subset });
    // ignore empty subsets
    if (compactSubset.length === 0) {
      return '';
    }
    return cssTemplate({
      comment: subset,
      family: fontinfo['css_family'],
      style: fontinfo['css_style'],
      weight: fontinfo['css_weight'],
      src: srcString,
      unicode_range: convertToUnicodeString(compactSubset),
      extra: fontinfo['css_extra']
    });
  }).join('\n');

  const filePath = path.join(fontinfo['outpath'], 'css', camelCase(fontinfo['name'], { transform: camelCaseTransformMerge }) + '.css');

  try {
    // Save css to file
    fs.writeFileSync(filePath, cssString);
    console.log('CSS fontface saved successfully.');
  } catch (error) {
    console.error('CSS fontface saving data:', error);
  }

  
  // console.log(font);
}

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

    const fontMetadata = metadata[fontinfo['name']];

    // variations axes

    if (font.namedVariations) {
      fontMetadata.namedVariations = font.namedVariations;
    }

    if (Object.keys(font.variationAxes).length > 0) {
      // variable font 
      const variationAxes = validateVariationAxes(font.variationAxes);
      fontMetadata.variationAxes = variationAxes;
    }

    // metrics

    if (font.unitsPerEm) {
      fontMetadata.unitsPerEm = font.unitsPerEm;
    }

    if (font.ascent) {
      fontMetadata.ascent = font.ascent;
    }

    if (font.descent) {
      fontMetadata.descent = font.descent;
    }

    if (font.lineGap) {
      fontMetadata.lineGap = font.lineGap;
    }

    if (font.underlinePosition && font.underlineThickness) {
      fontMetadata.underlinePosition = font.underlinePosition;
      fontMetadata.underlineThickness = font.underlineThickness;
    }

    if (font.italicAngle) {
      fontMetadata.italicAngle = font.italicAngle;
    }

    if (font.capHeight) {
      fontMetadata.capHeight = font.capHeight;
    }

    if (font.xHeight) {
      fontMetadata.xHeight = font.xHeight;
    }

    if (font.bbox) {
      fontMetadata.bbox = font.bbox;
    }

    // Glyphs

    if (font.characterSet) {
      let characterSet = font.characterSet;
      // the "base" (latin) subset < 0x0030. extend it to include control codepoints.
      if (Math.min(...font.characterSet) < 0x0030) {
        characterSet = [...new Set([...unicodeRange(0x0000, 0x001F), ...characterSet])]
      }
      fontMetadata.characterSet = characterSet;
    }

    if (font.numGlyphs) {
      fontMetadata.numGlyphs = font.numGlyphs;
    }

    if (font.availableFeatures) {
      fontMetadata.availableFeatures = font.availableFeatures;
    }

    const versionMatch = font.version.match(/\d+\.\d+/);
    if (versionMatch) {
      const versionNumber = versionMatch[0];
      fontMetadata.versionNumber = versionNumber;
    }

    const githubUrlMatch = font.copyright.match(/\(https:\/\/github\.com\/[^)]+\)/);

    if (githubUrlMatch) {
      const githubUrl = githubUrlMatch[0].slice(1, -1); // Remove parentheses
      fontMetadata.copyrightUrl = githubUrl;
    }

    const xWidthAvg = getxWidthAvg(font);

    if (xWidthAvg) {
      fontMetadata.xWidthAvg = xWidthAvg;
    }

    const desktopStyles = Object.keys(pgtsDesktopFontSize).reduce((acc, key) => {
      const { fontSize, leading } = pgtsDesktopFontSize[key];
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

    const mobileStyles = null;

    fontMetadata.pgts = {}

    if (desktopStyles) {
      fontMetadata.pgts['desktop'] = desktopStyles;
    }

    if (mobileStyles) {
      fontMetadata.pgts['mobile'] = mobileStyles;
    }

    // generate  css files

    generateFontfaceCssFiles(fontinfo, fontMetadata, font);

    // generate typography css files


    // Save the JSON data back to the file

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

// Path to your JSON file
const filePath = 'src/fonts.json';

generateMetaData(filePath);
