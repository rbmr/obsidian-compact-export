// solver.ts
import { CompactExportSettings } from './settings';

export interface SolverResult {
	fontSize: number;
	columnCount: number;
}

export async function findOptimalSettings(
	settings: CompactExportSettings,
	getPageCount: (fontSize: number, cols: number) => Promise<number>
): Promise<SolverResult> {
	let bestFontSize = settings.minFontSize;
	let bestCols = settings.minColumns;

	// Exhaustive search over columns
	for (let cols = settings.minColumns; cols <= settings.maxColumns; cols++) {

		// Binary search for the largest font size that fits the page limit
		let low = settings.minFontSize;
		let high = settings.maxFontSize;
		let optimalForThisCol = settings.minFontSize;

		while (high - low > 0.5) {
			const midExact = (low + high) * 0.5;
			const mid = Math.round(midExact * 8) * 0.125;
			const pages = await getPageCount(mid, cols);

			if (pages <= settings.maxPageCount) {
				optimalForThisCol = mid;
				low = mid; // Try larger
			} else {
				high = mid; // Too smaller
			}
		}

		if (optimalForThisCol > bestFontSize) {
			bestFontSize = optimalForThisCol;
			bestCols = cols;
		}
	}

	return { fontSize: bestFontSize, columnCount: bestCols };
}
