import fs from 'fs';
import { glob } from 'glob';
import * as fontkit from 'fontkit';

const fontsFiles = await glob(['build/fonts/**/*.ttf'])

fontsFiles.forEach(filePath => {
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
      console.log(font.variationAxes);
    }
  });
});