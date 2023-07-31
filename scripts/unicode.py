import unicodedata2 as unicodedata

unicode_range = "U+0000-007F,U+00A0-00B5,U+00B6-0100,U+0131,U+0152-0154,U+02BB-02BD,U+02C6,U+02DA,U+02DC,U+2002-2008,U+2009-200C,U+2010,U+2013-2016,U+2018-201B,U+201C-201F,U+2020-2023,U+2026,U+202F-2031,U+2032-2035,U+2039-203B,U+2044,U+2052,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+FEFF"

# Function to get the description of a character
def get_character_description(char):
    try:
        return unicodedata.name(char)
    except ValueError:
        return "Unknown"

# Print the table header
print("{: <10} {: <8} {}".format("Unicode", "Glyph", "Description"))
print("=" * 30)

# Parse the Unicode range and print the table
for range_str in unicode_range.split(","):
    codepoint = range_str[2:]  # Remove the "U+" prefix
    if "-" in codepoint:
        start, end = codepoint.split("-")
        for code in range(int(start, 16), int(end, 16) + 1):
            char = chr(code)
            description = get_character_description(char)
            print("{: <10} {: <8} {}".format(f"U+{code:04X}", char, description))
    else:
        char = chr(int(codepoint, 16))
        description = get_character_description(char)
        print("{: <10} {: <8} {}".format(f"U+{code:04X}", char, description))

