# Attribution

- Source code: MIT, copyright 2026 LambertAlpha. See `LICENSE`.
- Caveat glyph geometry: copyright 2014 The Caveat Project Authors, [Caveat upstream](https://github.com/googlefonts/caveat), SIL Open Font License 1.1. See `licenses/Caveat-OFL.txt`. Derived virtual letterforms use the NaturalInk name; font geometry is not relicensed under MIT.
- NaturalInkCJK outlines: derived from [LXGW WenKai](https://github.com/lxgw/LxgwWenKai), itself based on Klee One. Copyright 2021–2026 LXGW; copyright 2020 The Klee Project Authors. SIL OFL 1.1, including the upstream additional permission. See `licenses/WenKai-OFL.txt`. The derivative uses the non-reserved NaturalInkCJK name.
- Chinese source font: LXGW WenKai Regular at revision `d582f24504099b8e6d161bdd5e8fd3ae3ab63462`, SHA-256 `bf73f995c05f3f7baf7840b9d76d8d9678c8b150a020946a394ca63c67ed1350`. The compressed, precomputed geometry in `font-data/` is distributable runtime data, not a local font cache. `font-data/manifest.json` records archive checksums; upstream font files are not needed to build this repository.
- Math templates and deformation logic originated in the Natural Ink handwriting project. No user handwriting samples, personal notes, or research PDFs are distributed.
- Regression fixtures in `tests/fixtures/python-reference.json` record deterministic results from the original Python implementation (seeded randomness, math curves and glyph outlines). Running these tests does not require Python.
- Marked and pdf-lib retain their MIT notices and dependency notices. Mozilla PDF.js is Apache-2.0; its CMap/font data retain their bundled notices. See `THIRD_PARTY.md`; PDF.js notices also ship under `assets/pdfjs/`.

This browser project does not include the original Python CLI, PDF tracing or Goodnotes adapter. Code licensing does not override font or third-party dependency licenses.
