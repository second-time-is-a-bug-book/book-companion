# Figures

Full versions of figures that the book prints in a simplified form.

## ch07-seeded-matrix-full.svg

The second run of drill D16 (Chapter 7) as a grid: the nine seeded
defects in `drills/D16-seeded-defect/with-hidden-button.json`, one per
row, against the fourteen gate checks in run order (`CHECKS` in
`guards/gate.ts`), one per column. A filled dot means that check failed
with the defect planted. Every row has at least one dot except
hidden-button, which escapes; five checks catch none of the nine.

The book's Figure 7.3 shows the same run with only the checks that
caught something, split into the gate's fast and slow checks, so its
labels can stay horizontal at print size.

The data is the "After" output of D16 in `DRILLS.md`. To produce it
again:

```sh
node guards/seeded-defects.ts --defects drills/D16-seeded-defect/with-hidden-button.json
```

If you change the gate's checks or the defect list, compare the output
with this figure; the figure is not regenerated automatically.

The SVG names the book's fonts and falls back to Inter and JetBrains
Mono, then to your system's sans-serif and monospace fonts.
