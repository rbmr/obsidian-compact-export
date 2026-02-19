Specification for the "obsidian-compact-export" plugin.

"obsidian-compact-export", or "compact-export" in the obsidian plugin library is a plugin for Obsidian.md that converts the current note into a compact `.pdf` cheat sheet.

We treat the problem as a constraint satisfaction problem. 
- Variables:
  - columnCount
  - fontSize
  - (derived: pageCount)
- Constraints:
  - pageCount <= maxPageCount
  - minColumns <= columnCount <= maxColumns
  - minFontSize <= pageCount <= maxFontSize
- Objective function:
  - maximize fontSize.

The styling (and consequently the page count) is determined in the following order of precedence:
- the .css snippets from obsidian.
- the settings from the plugin: lineHeight (determines gap between lines), columnGap (gap between the columns), and the pageMargin (for printing).
- the variables: columnCount, and fontSize.

Ideally we have a single source of truth for the styling. Something like a function that takes in all the parameters, and outputs the .css.

The process is defined as follows:
1. Markdown preprocessing (currently only impacted by the makeBlockFormulasInline setting).
2. Convert Markdown to HTML (done once).
3. Running the solver to find the optimal variable values. Reuses the same HTML many times, only changes the CSS.
4. Rendering the actual PDF using the optimal variable values.

We MUST ensure that the styling used for the PDF generation is the same as the styling used by the solver. This way we guarantee that the solution found by the solver still matches the constraints when rendered to PDF.

Implementation details:
- We must use obsidian's renderer as much as possible, this way we ensure that what we see in the editor is what we see in the PDF.
- In order to not have to re-render the HTML to PDF in the solver we may use something like Paged.js, but it is critical the page limit is still met in the final render.
- Since columnCount are integers, we go over them exhaustively, in the inner loop we do a binary search over the fontSize to find the optimal fontSize.
- Add plenty of logging to help debug later on.

