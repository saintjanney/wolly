# Fonts bundled with the Wolly press

These files are embedded into every PDF the press produces. They are checked in
deliberately: the press must typeset a book identically on a developer's laptop
and in the serverless container, and naming a font the container does not have
produces a wrong book rather than a failed one. See `../src/fonts.ts`.

| File | Family | Source | Licence |
| --- | --- | --- | --- |
| `EBGaramond-Regular.woff2` | EB Garamond 400 | Google Fonts v33, Latin subset, instanced | SIL Open Font License 1.1 |
| `EBGaramond-Bold.woff2` | EB Garamond 700 | Google Fonts v33, Latin subset, instanced | SIL Open Font License 1.1 |
| `EBGaramond-Italic.woff2` | EB Garamond 400 italic | Google Fonts v33, Latin subset | SIL Open Font License 1.1 |
| `Inter-Regular.woff2` | Inter 400 | Google Fonts v20, Latin subset, instanced | SIL Open Font License 1.1 |
| `Inter-Bold.woff2` | Inter 700 | Google Fonts v20, Latin subset, instanced | SIL Open Font License 1.1 |

## Why static instances

Google Fonts now ships EB Garamond and Inter only as weight-variable files.
Chromium writes a variable face into a PDF as a **Type 3** font: still
selectable, but procedural rather than a real embedded outline font, and
rejected by PDF/X preflight in print workflows. Instancing each family at a
fixed weight before embedding produces ordinary CID TrueType output, which is
what `test/pdf.test.js` asserts.

The instanced files were produced with fontTools:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

f = TTFont('EBGaramond-variable.woff2')
instancer.instantiateVariableFont(f, {'wght': 400}, inplace=True, updateFontNames=True)
f.flavor = 'woff2'
f.save('EBGaramond-Regular.woff2')
```

`EBGaramond-Italic.woff2` is already static upstream and is unchanged.

## What the licence allows

The SIL OFL 1.1 permits embedding these fonts in documents, subsetting them,
and using the results commercially, including for books Wolly sells. The licence
does not require Wolly to publish the source of books that embed them.

Two conditions do apply:

- The fonts may not be sold on their own.
- A **modified** font may not be distributed under a name containing a Reserved
  Font Name. EB Garamond and Inter are the reserved names here. These files are
  unmodified Google Fonts Latin subsets, so nothing is triggered today, but
  re-subsetting or re-hinting them means renaming them.

The CSS families are called `Wolly Serif` and `Wolly Sans`. That is an internal
alias for the stylesheet, not a renamed font: the embedded font data still
identifies itself as EB Garamond and Inter, which is what a PDF reader reports
and what `pdffonts` shows.

## Latin only

These are the Latin subsets. A manuscript in Greek, Cyrillic or Vietnamese will
fall through to a container font, and to a missing-glyph box if there is none.
Widening the corpus means adding the corresponding subsets here and a fixture in
that script, not changing code.
