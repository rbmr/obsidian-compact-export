export interface CompactExportSettings {
	maxPageCount: number;

	// Layout Constraints
	minColumns: number;
	maxColumns: number;
	minFontSize: number;
	maxFontSize: number;

	// Spacing (Relative units, e.g., '1.2' means 1.2em)
	lineHeight: number;       // e.g., 1.2
	columnGap: number;        // e.g., 2 (2em)
	pageMargin: number;       // e.g., 20 (mm)

	// Compact Options
	makeBlockFormulasInline: boolean;
}

export const DEFAULT_SETTINGS: CompactExportSettings = {
	maxPageCount: 2,
	minColumns: 1,
	maxColumns: 3,
	minFontSize: 8,
	maxFontSize: 14,
	lineHeight: 1.2,
	columnGap: 2.0,
	pageMargin: 15, // mm
	makeBlockFormulasInline: true,
};
