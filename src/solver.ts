import { App, MarkdownRenderer, Component, TFile } from 'obsidian';
import { CompactExportSettings } from './settings';

interface RenderParams {
	fontSize: number;
	columns: number;
}

interface SearchResult {
	params: RenderParams;
	pageCount: number;
	isValid: boolean; // True if pageCount <= maxPageCount
}

export class LayoutSolver {
	app: App;
	settings: CompactExportSettings;
	container: HTMLElement;

	constructor(app: App, settings: CompactExportSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * The main entry point. Finds the best layout configuration.
	 */
	async solve(file: TFile): Promise<RenderParams | null> {
		const markdown = await this.app.vault.read(file);

		// 1. Pre-process markdown (e.g., compacting formulas)
		const processedMarkdown = this.settings.makeBlockFormulasInline
			? this.compactFormulas(markdown)
			: markdown;

		let bestResult: SearchResult | null = null;

		// 2. Outer Loop: Iterate Columns (Min -> Max)
		// We prefer fewer columns if font size is comparable, or max columns?
		// Usually, we iterate columns and find the max font size for each,
		// then pick the global winner.
		for (let cols = this.settings.minColumns; cols <= this.settings.maxColumns; cols++) {

			const result = await this.binarySearchFontSize(processedMarkdown, cols);

			if (result.isValid) {
				// If we haven't found a result yet, or this one allows a larger font, take it.
				if (!bestResult || result.params.fontSize > bestResult.params.fontSize) {
					bestResult = result;
				}
			}
		}

		return bestResult ? bestResult.params : null;
	}

	/**
	 * Binary search for the maximum font size that fits in the page limit.
	 */
	async binarySearchFontSize(markdown: string, columns: number): Promise<SearchResult> {
		let low = this.settings.minFontSize;
		let high = this.settings.maxFontSize;
		let bestParams: RenderParams = { fontSize: low, columns };
		let bestPageCount = Infinity;
		let foundValid = false;

		// Precision of 0.5pt is usually enough
		while (high - low > 0.5) {
			const mid = (low + high) / 2;
			const params = { fontSize: mid, columns };

			const pageCount = await this.measurePageCount(markdown, params);

			if (pageCount <= this.settings.maxPageCount) {
				// It fits! Try to go bigger.
				foundValid = true;
				bestParams = params;
				bestPageCount = pageCount;
				low = mid;
			} else {
				// Too big, shrink it.
				high = mid;
			}
		}

		return {
			params: bestParams,
			pageCount: bestPageCount,
			isValid: foundValid
		};
	}

	/**
	 * Renders the content into a hidden container and calculates physical pages.
	 */
	async measurePageCount(markdown: string, params: RenderParams): Promise<number> {
		// Create a sandbox container
		const sandbox = document.body.createDiv();
		sandbox.style.position = 'absolute';
		sandbox.style.visibility = 'hidden';
		sandbox.style.left = '-9999px';
		sandbox.style.top = '0';

		// A4 Dimensions (approximate for calculation) in Pixels (96 DPI)
		// A4 is 210mm x 297mm.
		// 1mm approx 3.78px
		const MM_TO_PX = 3.78;
		const PAGE_HEIGHT_MM = 297;
		const PAGE_WIDTH_MM = 210;

		const marginPx = this.settings.pageMargin * MM_TO_PX;
		const printWidth = (PAGE_WIDTH_MM * MM_TO_PX) - (2 * marginPx);
		const printHeight = (PAGE_HEIGHT_MM * MM_TO_PX) - (2 * marginPx);

		sandbox.style.width = `${printWidth}px`;

		// Apply Dynamic CSS for this test
		const css = this.generateCSS(params);
		sandbox.setAttribute('style', sandbox.getAttribute('style') + css);

		// Render Markdown
		// We use a Component to manage the lifecycle of the render
		const component = new Component();
		await MarkdownRenderer.render(this.app, markdown, sandbox, '/', component);

		// Measure
		// We look at scrollHeight to see total vertical length
		const totalHeight = sandbox.scrollHeight;

		// Cleanup
		component.unload();
		sandbox.remove();

		// Calculate Pages
		return Math.ceil(totalHeight / printHeight);
	}

	generateCSS(params: RenderParams): string {
		// NOTE: We inline the styles to the sandbox for measurement
		// In the real export, we will inject a <style> tag.

		// Convert font size to CSS value
		const fSize = `${params.fontSize}pt`;

		return `
            font-size: ${fSize} !important;
            line-height: ${this.settings.lineHeight} !important;
            column-count: ${params.columns} !important;
            column-gap: ${this.settings.columnGap}em !important;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            overflow: visible;
            display: block;
            
            /* Ensure images/tables don't overflow columns */
            img, table { max-width: 100%; }
        `;
	}

	/**
	 * Regex hack to turn block math $$...$$ into inline math $...$
	 * This saves significant vertical space.
	 */
	compactFormulas(markdown: string): string {
		// This is a naive regex. Be careful with escaped signs.
		// It replaces $$ with $ for display math.
		return markdown.replace(/\$\$/g, '$');
	}
}
