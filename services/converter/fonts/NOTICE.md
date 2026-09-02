# Fonts bundled with the Wolly press

These files are embedded into every PDF the press produces. They are checked in
deliberately: the press must typeset a book identically on a developer's laptop
and in the serverless container, and naming a font the container does not have
produces a wrong book rather than a failed one. See `../src/fonts.ts`.

| File | Family | Source | Licence |
| --- | --- | --- | --- |
| `EBGaramond-Regular.woff2` | EB Garamond 400 | upstream variable, instanced + subset | SIL Open Font License 1.1 |
| `EBGaramond-Bold.woff2` | EB Garamond 700 | upstream variable, instanced + subset | SIL Open Font License 1.1 |
| `EBGaramond-Italic.woff2` | EB Garamond 400 italic | upstream variable, instanced + subset | SIL Open Font License 1.1 |
| `Inter-Regular.woff2` | Inter 400 | upstream variable, instanced + subset | SIL Open Font License 1.1 |
| `Inter-Bold.woff2` | Inter 700 | upstream variable, instanced + subset | SIL Open Font License 1.1 |

Sources are the full families from `github.com/google/fonts`, **not** the
`latin` subsets `fonts.googleapis.com` serves. That distinction is the whole
point of the section below.

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
  Font Name. EB Garamond and Inter are the reserved names here.

  These files **are** modified: they are weight instances of the upstream
  variable fonts, re-subset to the range below. They still carry the upstream
  family names internally (`EB Garamond`, `Inter`), which is what `pdffonts`
  reports. That matches what Google's own CDN serves and is the common reading
  of the clause for subsetting, but it is a question for counsel rather than one
  engineering should settle: if Wolly ever needs to be conservative here, rename
  the internal family (`instancer` takes a name override) and update
  `test/pdf.test.js`, which currently asserts on `EBGaramond` and `Inter`.

The CSS families are called `Wolly Serif` and `Wolly Sans`. That is an internal
alias for the stylesheet, not a renamed font: the embedded font data still
identifies itself as EB Garamond and Inter, which is what a PDF reader reports
and what `pdffonts` shows.

## Coverage, and why it is wider than Latin-1

The first version of these files carried Google's `latin` subset, about 230
glyphs each. That silently excluded **every character Ghanaian orthographies
need** and the currency the product prices in:

    ɛ ɔ ŋ ɖ ƒ ʋ ɣ   Ɛ Ɔ Ŋ   ₵

An author writing Twi, Ewe, Ga or Dagbani got a row of `.notdef` boxes in the
book Wolly typeset for them, and a price could not render the cedi sign.
Nothing failed and no test caught it, because the pipeline was only ever
exercised with English fixtures.

The subset range is now explicit:

| Range | Why |
| --- | --- |
| `U+0000-00FF` | Basic Latin and Latin-1 Supplement |
| `U+0100-017F` | Latin Extended-A (`ŋ Ŋ`) |
| `U+0180-024F` | Latin Extended-B (`ƒ`, `Ɛ Ɔ`) |
| `U+0250-02AF` | IPA Extensions (`ɛ ɔ ɖ ʋ ɣ`) |
| `U+0300-036F` | Combining diacritics, for tone marks |
| `U+2000-206F` | General punctuation |
| `U+20A0-20BF` | Currency symbols (`₵` U+20B5) |

`test/pdf.test.js` presses a Twi, Ewe, Ga and Dagbani fixture and asserts every
one of those characters round-trips out of the finished PDF. Widening to another
script means extending the range here **and** adding words to that fixture; a
range without a fixture is how this broke the first time.

**Known gap:** EB Garamond Italic has no `ʋ` (U+028B) upstream, so an italicised
Ewe word containing it falls back. The roman and bold faces are complete.

## Regenerating

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

RANGES = ("U+0000-00FF,U+0100-017F,U+0180-024F,"
          "U+0250-02AF,U+0300-036F,U+2000-206F,U+20A0-20BF")

f = TTFont('EBGaramond[wght].ttf')                      # the FULL upstream file
instancer.instantiateVariableFont(f, {'wght': 400}, inplace=True, updateFontNames=True)
opts = subset.Options(); opts.layout_features = ['*']; opts.notdef_outline = True
s = subset.Subsetter(options=opts)
s.populate(unicodes=subset.parse_unicodes(RANGES)); s.subset(f)
f.flavor = 'woff2'; f.save('EBGaramond-Regular.woff2')
```

Instancing before subsetting is deliberate: Chromium writes a *variable* face
into a PDF as a Type 3 font, which is rejected by PDF/X preflight.
