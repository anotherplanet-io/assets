import fs from 'fs';
import path from 'path';
import * as fontkit from 'fontkit';
import axesTags from './axesTags.js';
import { camelCase, paramCase, sentenceCase } from "change-case";
import { camelCaseTransformMerge } from "camel-case";
import { createStyleObject, createStyleString, createFontStack, precomputeValues } from '@capsizecss/core';
import Handlebars from 'handlebars';
import delimiters from 'handlebars-delimiters';
import helveticaNeue from '@capsizecss/metrics/helveticaNeue.js';
import arial from '@capsizecss/metrics/arial.js';
import timesNewRoman from '@capsizecss/metrics/timesNewRoman.js';
import georgia from '@capsizecss/metrics/georgia.js';
import courierNew from '@capsizecss/metrics/courierNew.js';
import { compactRanges, convertToUnicodeString, getMissingValues, getArrayIntersection, range as unicodeRange } from '@ap.cx/unicode-range';
import { format } from 'prettier'

// Set the new delimiters to use python template delimiters
delimiters(Handlebars, ['{', '}']);

const buildFolder = 'build';
const ScreenWidthInRem = 120;

const cssUrlString = ({ path, filename, font_v, type }) => `url('${path}/${filename}?v=${font_v}') format('${type}')`;
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
}
`;

const cssTypographyTemplate = ({ desktop, mobile, fontFamily, className }) => `

.${className} {
  font-family: ${fontFamily};
}

/* Default font size for mobile devices */
${mobile.join('\n\n')}

/* Media query for devices with a viewport width greater than 768px (desktop) */
@media (min-width: 768px) {
  ${desktop.join('\n\n')}
}

`;

const cssVariablesTemplate = ({ cssVarByProperty, fontFamily, className, fontVar }) => `

/* ${sentenceCase(className)} */

:root {
  --typography-${paramCase(className)}-font-family: ${fontFamily};
  ${fontVar}: var(--typography-${paramCase(className)}-font-family);

  ${cssVarByProperty.join('\n  ')}

}

.${className} {
  font-family: var(--typography-${paramCase(className)}-font-family);
}

`;

/*
   Rounding all values to a precision of `4` based on discovering that browser
   implementations of layout units fall between 1/60th and 1/64th of a pixel.

   Reference: https://trac.webkit.org/wiki/LayoutUnit
   (above wiki also mentions Mozilla - https://trac.webkit.org/wiki/LayoutUnit#Notes)
*/
const round = (v) => parseFloat(v.toFixed(4));

const remToPx = (v, b = 16) => v * b;

// const unicodeRanges = generateUnicodeRange(latin);
// console.log(unicodeRanges.join(', ')); // Outputs the formatted Unicode range strings


const headingFontStyle = [
  "Editorial Mega Display",
  "Editorial Dominant Display",
  "Display large",
  "Display",
  "Display small",
  "Headline large",
  "Headline",
  "Headline small",
  "Title large",
  "Title",
  "Title small"
];

const bodyFontStyle = [
  "Hero large",
  "Hero",
  "Body large",
  "Body",
  "Body small",
  "Footnote",
  "Caption large",
  "Caption",
  "Caption small",
  "Legal large",
  "Legal",
  "Legal small"
];

const printOnlyFontStyle = [
  "Legal large",
  "Legal",
  "Legal small"
];


const pgtsDesktopFontSize = {
  "Editorial Mega Display": { fontSize: 7, leading: 128 },
  "Editorial Dominant Display": { fontSize: 6, leading: 112 },
  "Display large": { fontSize: 5, leading: 96 },
  "Display": { fontSize: 4, leading: 72 },
  "Display small": { fontSize: 3, leading: 56 },
  "Headline large": { fontSize: 2.333, leading: 44 },
  "Headline": { fontSize: 2, leading: 36 },
  "Headline small": { fontSize: 1.833, leading: 32 },
  "Title large": { fontSize: 1.5, leading: 28 },
  "Title": { fontSize: 1.333, leading: 28 },
  "Title small": { fontSize: 1.167, leading: 24 },
  "Hero large": { fontSize: 1.5, leading: 28 },
  "Hero": { fontSize: 1.333, leading: 28 },
  "Body large": { fontSize: 1.167, leading: 24 },
  "Body": { fontSize: 1, leading: 20 },
  "Body small": { fontSize: 0.917, leading: 20 },
  "Footnote": { fontSize: 0.833, leading: 20 },
  "Caption large": { fontSize: 0.75, leading: 16 },
  "Caption": { fontSize: 0.667, leading: 16 },
  "Caption small": { fontSize: 0.583, leading: 12 },
  "Legal large": { fontSize: 0.5, leading: 12 },
  "Legal": { fontSize: 0.417, leading: 12 },
  "Legal small": { fontSize: 0.375, leading: 8 },
}

const pgtsMobileFontSize = {
  "Editorial Mega Display": { fontSize: 5, leading: 96 },
  "Editorial Dominant Display": { fontSize: 4.333, leading: 72 },
  "Display large": { fontSize: 3.667, leading: 64 },
  "Display": { fontSize: 3, leading: 56 },
  "Display small": { fontSize: 2.333, leading: 44 },
  "Headline large": { fontSize: 2, leading: 36 },
  "Headline": { fontSize: 1.625, leading: 32 },
  "Headline small": { fontSize: 1.5, leading: 28 },
  "Title large": { fontSize: 1.333, leading: 28 },
  "Title": { fontSize: 1.167, leading: 28 },
  "Title small": { fontSize: 1.083, leading: 24 },
  "Hero large": { fontSize: 1.333, leading: 28 },
  "Hero": { fontSize: 1.167, leading: 28 },
  "Body large": { fontSize: 1.083, leading: 24 },
  "Body": { fontSize: 1, leading: 20 },
  "Body small": { fontSize: 0.917, leading: 20 },
  "Footnote": { fontSize: 0.833, leading: 20 },
  "Caption large": { fontSize: 0.75, leading: 16 },
  "Caption": { fontSize: 0.667, leading: 16 },
  "Caption small": { fontSize: 0.583, leading: 12 },
  "Legal large": { fontSize: 0.5, leading: 12 },
  "Legal": { fontSize: 0.417, leading: 12 },
  "Legal small": { fontSize: 0.375, leading: 8 },
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

/**
 * Axis
 * 
 *| Axis tag        | Name         | CSS Attribute       |
 *| --------------- | ------------ | ------------------- |
 *| 'ital'          | Italic       | font-style          |
 *| 'opsz'          | Optical size | font-optical-sizing |
 *| 'slnt'          | Slant        | font-style          |
 *| 'wdth'          | Width        | font-stretch        |
 *| 'wght'          | Weight       | font-weight         |
 *
 */

const axisCssKey = {
  'ital': 'font-style',
  'opsz': 'font-optical-sizing',
  'slnt': 'font-style',
  'wdth': 'font-stretch',
  'wght': 'font-weight',
}


// codepoints of "extra" glyphs that should end up in a separate extra set as "symbols"
// Listed here as codepoints rather than ranges to that copy-pasting from e.g. Glyphs app
// is easier. just copy and paste.
const SYMBOL_UNICODES = [
  0x2190, 0x27F5, 0x1F850, 0x21D0, 0x27F8, 0x2192, 0x27F6, 0x1F852, 0x21D2,
  0x27F9, 0x2196, 0x2197, 0x2198, 0x2199, 0x2194, 0x27F7, 0x21D4, 0x27FA, 0x2191,
  0x2193, 0x2195, 0x21A9, 0x21AA, 0x2713, 0x2717, 0x25BC, 0x25B2, 0x25C0, 0x25C4,
  0x25BA, 0x25B6, 0x25BD, 0x25B3, 0x25C1, 0x25C5, 0x25B7, 0x25BB, 0x26A0, 0x25CF,
  0x25CB, 0x25A0, 0x25A1, 0x25A2, 0x2B12, 0x2B13, 0x25C6, 0x2756, 0x25C7, 0xE000,
  0x263C, 0x2600, 0x2661, 0x2665, 0x2764, 0x2605, 0x2606, 0x2B06, 0x21E7, 0x21EA,
  0x2318, 0x2303, 0x2305, 0x2380, 0x2325, 0x2387, 0x238B, 0x21BA, 0x21BB, 0x232B,
  0x2326, 0x2327, 0x23CF, 0x23CE, 0x21B5, 0x21B3, 0x21B0, 0x21B1, 0x21B4, 0x21E4,
  0x21E5, 0x21DE, 0x21DF, 0x25EF, 0x2B1C, 0x20DD, 0x20DE, 0x24B6, 0x24B7, 0x24B8,
  0x24B9, 0x24BA, 0x24BB, 0x24BC, 0x24BD, 0x24BE, 0x24BF, 0x24C0, 0x24C1, 0x24C2,
  0x24C3, 0x24C4, 0x24C5, 0x24C6, 0x24C7, 0x24C8, 0x24C9, 0x24CA, 0x24CB, 0x24CC,
  0x24CD, 0x24CE, 0x24CF, 0x24EA, 0x2460, 0x2780, 0x2461, 0x2781, 0x2462, 0x2782,
  0x2463, 0x2783, 0x2464, 0x2784, 0x2465, 0x2785, 0x2466, 0x2786, 0x2467, 0x2787,
  0x2468, 0x2788, 0xE12B, 0xE12C, 0xE12D, 0xE12E, 0xE12F, 0xE130, 0xE131, 0xE132,
  0xE133, 0xE134, 0xE135, 0xE136, 0xE137, 0xE15F, 0xE160, 0xE161, 0xE162, 0xE138,
  0xE139, 0xE13A, 0xE13B, 0xE13C, 0xE13D, 0x1F130, 0x1F131, 0x1F132, 0x1F133,
  0x1F134, 0x1F135, 0x1F136, 0x1F137, 0x1F138, 0x1F139, 0x1F13A, 0x1F13B, 0x1F13C,
  0x1F13D, 0x1F13E, 0x1F13F, 0x1F140, 0x1F141, 0x1F142, 0x1F143, 0x1F144, 0x1F145,
  0x1F146, 0x1F147, 0x1F148, 0x1F149, 0xE13E, 0xE13F, 0xE140, 0xE141, 0xE142,
  0xE143, 0xE144, 0xE145, 0xE146, 0xE147, 0xE148, 0xE149, 0xE14A, 0xE14B, 0xE14C,
  0xE14D, 0xE14E, 0xE14F, 0xE150, 0xE151, 0xE152, 0xE153, 0xE154, 0xE155, 0xE156,
  0xE157, 0xE158, 0xE159, 0xE15A, 0xE15B, 0xE15C, 0xE15D, 0xE15E,
];

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

  symbols: SYMBOL_UNICODES,

};

const sampleString = Object.keys(weightings).join('');

const weightingForCharacter = (character) => {
  if (!Object.keys(weightings).includes(character)) {
    throw new Error(`No weighting specified for character: “${character}”`);
  }
  return weightings[character];
};

function getFontType(extension) {
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

async function generateFontfaceCssFiles(fontinfo, metadata) {

  const src = fontinfo['outfile'].map((filePath) => {
    const extension = path.extname(filePath);
    const type = getFontType(extension.slice(1));

    return cssUrlString({
      path: path.join('/', fontinfo['outpath']),
      filename: path.relative(fontinfo['outpath'], filePath),
      font_v: encodeURIComponent(camelCase(metadata.versionDisplay)),
      type
    })
  }).join(', \n       ');

  const accumulatedSubset = [];

  const cssData = fontinfo['subset'].map((subset) => {
    if (!SUBSET[subset]) {
      throw new Error(`No font subset specified: “${subset}”`);
    }

    const currentSubset = getArrayIntersection(SUBSET[subset], metadata.characterSet);
    accumulatedSubset.push(...currentSubset);
    const compactSubset = compactRanges(currentSubset);
    const compiledTemplate = Handlebars.compile(src);
    const srcString = compiledTemplate({ subset });
    // ignore empty subsets
    if (compactSubset.length === 0) {
      return '';
    }

    return cssTemplate({
      comment: subset,
      family: metadata.familyName,
      style: fontinfo['css_style'],
      weight: fontinfo['css_weight'],
      src: srcString,
      unicode_range: convertToUnicodeString(compactSubset),
      extra: fontinfo['css_extra']
    });
  });

  // set extra unicode ranges for the font
  const extraSubset = getMissingValues(metadata.characterSet, accumulatedSubset);

  const compiledTemplate = Handlebars.compile(src);
  const srcString = compiledTemplate({ subset: 'extra' });

  const cssExtraString = cssTemplate({
    comment: 'extra',
    family: metadata.familyName,
    style: fontinfo['css_style'],
    weight: fontinfo['css_weight'],
    src: srcString,
    unicode_range: convertToUnicodeString(compactRanges(extraSubset)),
    extra: fontinfo['css_extra']
  });

  // # From the CSS spec on unicode-range descriptor:
  // #   "If the Unicode ranges overlap for a set of @font-face rules with the same family
  // #    and style descriptor values, the rules are ordered in the reverse order they were
  // #    defined; the last rule defined is the first to be checked for a given character."
  // # https://www.w3.org/TR/css-fonts-4/#unicode-range-desc
  const cssFontFaces = [...cssData, cssExtraString].reverse();

  const filePath = path.join(buildFolder, fontinfo['outpath'], 'css', camelCase(metadata.fullName, { transform: camelCaseTransformMerge }) + '.css');

  const cssFontFacesAlternatives = `

/* Style definitions for local fallback fonts  ${metadata.fullName}*/
/* the font family is : ${metadata.fontStack.fontFamily} */

${metadata.fontStack.fontFaces}

`;

  const directory = path.dirname(filePath);
  const cssString = await format([...cssFontFaces, cssFontFacesAlternatives].join('\n'), { parser: 'css', printWidth: 500 });

  try {
    // Create path css to file
    fs.mkdirSync(directory, { recursive: true });
    // Save css to file
    fs.writeFileSync(filePath, cssString);
    console.log('CSS FontfaceCssFiles              saved successfully.' + filePath);
  } catch (error) {
    console.error('CSS FontfaceCssFiles saving data:', error);
  }
}

async function generateTypographyCssFiles(fontinfo, metadata) {

  const className = camelCase(metadata.fullName, { transform: camelCaseTransformMerge })
  const filePath = path.join(buildFolder, fontinfo['outpath'], 'css', className + '.typography.css');

  const desktop = Object.keys(metadata.pgts.desktop).map(key => metadata.pgts.desktop[key].capsizedStyleRule);
  const mobile = Object.keys(metadata.pgts.mobile).map(key => metadata.pgts.mobile[key].capsizedStyleRule);

  const directory = path.dirname(filePath);

  const fontFamily = metadata.fontStack.fontFamily;

  const cssString = await format(cssTypographyTemplate({ desktop, mobile, fontFamily, className }), { parser: 'css', printWidth: 500 });

  try {
    // Create path css to file
    fs.mkdirSync(directory, { recursive: true });
    // Save css to file
    fs.writeFileSync(filePath, cssString);
    console.log('CSS TypographyCssFiles            saved successfully.' + filePath);
  } catch (error) {
    console.error('CSS TypographyCssFiles saving data:', error);
  }
}

async function generateTypographyCssVarFiles(fontinfo, metadata) {

  const className = camelCase(metadata.fullName, { transform: camelCaseTransformMerge })
  const headingFilePath = path.join(buildFolder, fontinfo['outpath'], 'css', className + '.heading.variables.css');
  const bodyFilePath = path.join(buildFolder, fontinfo['outpath'], 'css', className + '.body.variables.css');

  const desktop = Object.keys(metadata.pgts.desktop).map(key => metadata.pgts.desktop[key].capsizedStyleRule);
  const mobile = Object.keys(metadata.pgts.mobile).map(key => metadata.pgts.mobile[key].capsizedStyleRule);

  const directory = path.dirname(filePath);

  const fontFamily = metadata.fontStack.fontFamily;

  // generate 'typography' css var files
  const byProperty = {};

  for (const device in metadata.pgts) {
    for (const property in metadata.pgts[device]) {
      if (!byProperty[property]) {
        byProperty[property] = {};
      }
      byProperty[property][device] = metadata.pgts[device][property];
    }
  }

  const getCssProperties = (acc, key) => {

    const v = byProperty[key];
    acc.push(`/* ---- ${paramCase(key)} ---- */`);
    acc.push(`--typography-${paramCase(key)}-font-size-min: ${v.mobile.fontSize}rem;`);
    acc.push(`--typography-${paramCase(key)}-font-size-max: ${v.desktop.fontSize}rem;`);
    acc.push(`--typography-${paramCase(key)}-line-height-min: ${v.mobile.lineHeight};`); // px
    acc.push(`--typography-${paramCase(key)}-line-height-max: ${v.desktop.lineHeight};`); // px
    acc.push(`/* margin-top for ::after */`);
    acc.push(`--typography-${paramCase(key)}-margin-top-min: ${v.mobile.capsizeStyles["::after"].marginTop};`); // em
    acc.push(`--typography-${paramCase(key)}-margin-top-max: ${v.desktop.capsizeStyles["::after"].marginTop};`); // em
    acc.push(`/* margin-bottom for ::before */`);
    acc.push(`--typography-${paramCase(key)}-margin-bottom-min: ${v.mobile.capsizeStyles["::before"].marginBottom};`); // em
    acc.push(`--typography-${paramCase(key)}-margin-bottom-max: ${v.desktop.capsizeStyles["::before"].marginBottom};`); // em
    acc.push(` `);
    acc.push(`/* fluid */`);
    acc.push(`--typography-${paramCase(key)}-font-size-fluid: ${round((v.desktop.fontSize / ScreenWidthInRem) * 100)}vw;`); // 768 / 16 = 48em
    acc.push(`--typography-${paramCase(key)}-font-size-fluid-max: ${round(v.desktop.fontSize * 2.5)}rem;`); // 1920 / 768
    acc.push(`--typography-${paramCase(key)}-line-height-fluid: ${round(parseFloat(v.desktop.lineHeight) / (v.desktop.fontSize * 16))}em;`); // 768 / 16 = 48em
    acc.push(`/* margin-top for ::after */`);
    acc.push(`--typography-${paramCase(key)}-margin-top-fluid: ${round((parseFloat(v.desktop.capsizeStyles["::after"].marginTop) / ScreenWidthInRem) * 100)}vw;`); // em
    acc.push(`/* margin-bottom for ::before */`);
    acc.push(`--typography-${paramCase(key)}-margin-bottom-fluid: ${round((parseFloat(v.desktop.capsizeStyles["::before"].marginBottom) / ScreenWidthInRem) * 100)}vw;`); // em
    acc.push(` `);
    acc.push(` `);

    return acc;
  }

  const headingFontStyles = headingFontStyle.reduce(getCssProperties, []);
  const bodyFontStyles = bodyFontStyle.reduce(getCssProperties, []);

  const headingCssString = await format(cssVariablesTemplate({ cssVarByProperty: headingFontStyles, fontFamily, className, fontVar: '--typography-heading-font-family' }), { parser: 'css', printWidth: 500 });
  const bodyCssString = await format(cssVariablesTemplate({ cssVarByProperty: bodyFontStyles, fontFamily, className, fontVar: '--typography-body-font-family' }), { parser: 'css', printWidth: 500 });

  try {
    // Create path css to file
    fs.mkdirSync(directory, { recursive: true });
    // Save css to file
    fs.writeFileSync(headingFilePath, headingCssString);
    console.log('CSS Heading TypographyCssVarFiles saved successfully.'+ headingFilePath);
  } catch (error) {
    console.error('CSS Heading TypographyCssVarFiles saving data:', error);
  }

  try {
    // Create path css to file
    fs.mkdirSync(directory, { recursive: true });
    // Save css to file
    fs.writeFileSync(bodyFilePath, bodyCssString);
    console.log('CSS Body TypographyCssVarFiles    saved successfully.' + bodyFilePath);
  } catch (error) {
    console.error('CSS Body TypographyCssVarFiles saving data:', error);
  }


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

function generateValue(key, axis) {
  const cssKey = axisCssKey[key];
  switch (key) {
    case 'opsz':
      return [cssKey, `${axis.min} ${axis.max}`];
    case 'slnt':
      return [cssKey, `oblique ${axis.min}deg ${axis.max}deg;`];
    case 'ital':
      return [cssKey, axis.default === 1 ? 'italic' : 'normal'];
    case 'wght':
      return [cssKey, `${axis.min} ${axis.max}`];
    case 'wdth':
      return [cssKey, `${axis.min}% ${axis.max}%`];
    default:
      return null;
  }
}

function getPGTSStyle(property, { fontSize, leading, fontFamily, fontMetrics }) {

  const capsizeStyles = createStyleObject({
    fontSize: round(remToPx(fontSize)),
    leading, // = lineHeight
    fontMetrics,
  });

  const capsizedStyleRule = createStyleString(property, {
    fontSize: round(remToPx(fontSize)),
    leading, // = lineHeight
    fontMetrics,
  });

  const capsizeValues = precomputeValues({
    fontSize: round(remToPx(fontSize)),
    leading, // = lineHeight
    fontMetrics,
  });

  const capsizedCssVariables = {
    fontSize: `${fontSize}rem`,
    lineHeight: capsizeStyles.lineHeight,
    marginBottom: capsizeStyles["::before"].marginBottom,
    marginTop: capsizeStyles["::after"].marginTop,
  };

  return {
    capsizeStyles,
    capsizedStyleRule,
    capsizedCssVariables,
    lineHeight: capsizeStyles.lineHeight,
    fontSize,
    fontFamily,
    capsizeValues,
  };
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
    console.log(`Loaded ${font.postscriptName} font file ${fontinfo['infile']}`);

    const variationAxes = Object.keys(font.variationAxes).reduce((acc, key) => {
      const v = font.variationAxes[key];
      if (acc[axisCssKey[key]]) {
        // console.log('!!!!!!!!', axisCssKey[key], v);
        return acc;
      }
      const [cssProperty, cssValue] = generateValue(key, v);
      acc[axisCssKey[key]] = { ...v[key], axis: key, 'value': { property: cssProperty, value: cssValue } };
      return acc;
    }, {});
    // get the font css-properties-name
    const metadata = {}

    metadata[fontinfo['name']] = {
      postscriptName: font.postscriptName,
      fullName: font.fullName, // fullName
      familyName: font.familyName, // familyName Font metrics
      cssFamily: fontinfo['css_family'], // get from the json to replace the font.familyName
      category: fontinfo['category'],
      subfamilyName: font.subfamilyName,
      copyright: font.copyright,
      version: font.version,
      versionDisplay: font.version.split(';')[0],
      outpath: fontinfo['outpath'],
      variationAxes,
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


    function getDefaultFonts(classification) {
      switch (classification) {
        case 'serif':
          return [timesNewRoman, georgia];
        case 'sans-serif':
          return [arial, helveticaNeue];
        case 'monospace':
          return [courierNew];
        /*
        case 'cursive':
          return ['Brush Script', 'Comic Sans MS', 'Lucida Handwriting', 'Zapfino'];
        case 'fantasy':
          return ['Curlz MT', 'Chiller', 'Viner Hand ITC', 'Impact'];
        case 'script':
          return ['Brush Script', 'Scriptina', 'Snell Roundhand', 'Great Vibes'];
        case 'display':
          return ['Playfair Display', 'Bebas Neue', 'Oswald', 'Montserrat'];
        case 'hybrid':
          return ['Times New Roman', 'Georgia', 'Arial', 'Helvetica'];
        case 'dingbat':
          return ['Wingdings', 'Webdings', 'Zapf Dingbats', 'Symbol']; */
        default:
          return [];
      }
    }


    /* fontFamily, fontFaces */
    fontMetadata.fontStack = createFontStack([
      font,
      ...getDefaultFonts(fontinfo['category'])
    ], {
      fontFaceProperties: {
        fontDisplay: 'swap',
      },
    });

    const desktopStyles = Object.keys(pgtsDesktopFontSize).reduce((acc, key) => {
      const { fontSize, leading } = pgtsDesktopFontSize[key];
      const fontFamily = fontMetadata.fontStack.fontFamily;
      acc[key] = getPGTSStyle(camelCase(key, { transform: camelCaseTransformMerge }), { fontSize, leading, fontFamily, fontMetrics: font });
      return acc;
    }, {});

    // pgtsMobileFontSize
    const mobileStyles = Object.keys(pgtsMobileFontSize).reduce((acc, key) => {
      const { fontSize, leading } = pgtsMobileFontSize[key];
      const fontFamily = fontMetadata.fontStack.fontFamily;
      acc[key] = getPGTSStyle(camelCase(key, { transform: camelCaseTransformMerge }), { fontSize, leading, fontFamily, fontMetrics: font });
      return acc;
    }, {});

    fontMetadata.pgts = {}

    if (desktopStyles) {
      fontMetadata.pgts['desktop'] = desktopStyles;
    }

    if (mobileStyles) {
      fontMetadata.pgts['mobile'] = mobileStyles;
    }

    // generate 'fontFace' css files

    generateFontfaceCssFiles(fontinfo, fontMetadata);

    // generate 'typography' css files

    generateTypographyCssFiles(fontinfo, fontMetadata);

    // generate 'variable' css files

    generateTypographyCssVarFiles(fontinfo, fontMetadata);

    // Save the JSON data back to the file

    const filePath = path.join(buildFolder, fontinfo['outpath'], 'metadata.json');
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
