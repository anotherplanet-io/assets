
// https://learn.microsoft.com/en-us/typography/opentype/spec/dvaraxisreg

const axesTags = {
    opsz: { name: 'Optical size', range: { min: 10, max: 16 }, valid: (range) => (range.min <= range.max && range.min > 0), },
    wdth: { name: 'Width', range: { min: 0, max: 1000 }, valid: (range) => (range.min <= range.max && range.min > 0 && range.min <= 100 && range.max >= 100), },
    wght: { name: 'Weight', range: { min: 0, max: 1000 }, valid: (range) => (range.min <= range.max && range.min > 0 && range.min <= 400 && range.max >= 400 && range.max <= 1000), },
    ital: { name: 'Italic', range: { min: 0, max: 1 }, valid: (range) => (range.min <= range.max && range.min >= 0 && range.max <= 1), },
    slnt: { name: 'Italic', range: { min: -90, max: 90 }, valid: (range) => (range.min <= range.max && range.min >= -90 && range.max <= 90), },
};

export default axesTags;