"""Subset for web fonts."""

import sys
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset


def read_charlist(filename):
    """Returns a list of characters read from a charset text file."""
    with open(filename) as datafile:
        charlist = []
        for line in datafile:
            if '#' in line:
                line = line[:line.index('#')]
            line = line.strip()
            if not line:
                continue
            if line.startswith('U+'):
                line = line[2:]
            char = int(line, 16)
            charlist.append(char)
        return charlist


def main(argv):

    target_charset = read_charlist(os.path.join(os.path.dirname(__file__), 'web_fr_subset.txt'))
    # Add private use characters for legacy reasons
    target_charset += [0x20AC] # 0x20AC = Euro

    print(target_charset)

    opt = subset.Options()

    opt.name_IDs = ["*"]
    opt.name_legacy = True
    opt.name_languages = ["*"]
    opt.layout_features = ["*"]
    opt.notdef_outline = True
    opt.recalc_bounds = True
    opt.recalc_timestamp = True
    opt.canonical_order = True
    opt.drop_tables = ["+TTFA"]

    source_filename = argv[1]
    target_filename = argv[2]

    font = subset.load_font(source_filename, opt)
    subsetter = subset.Subsetter(options=opt)
    # subsetter.populate(unicodes=[int(g.replace('U+', ''), 16) for g in glyphs.split()])
    subsetter.populate(unicodes=target_charset)
    subsetter.subset(font)
    subset.save_font(font, target_filename, opt)

    web_ttfont = TTFont(target_filename)


if __name__ == '__main__':
    main(sys.argv)