import { Plugin, Notice, TFile } from 'obsidian';
import { LayoutSolver } from './solver';
import { DEFAULT_SETTINGS, CompactExportSettings } from './settings';

export default class CompactExportPlugin extends Plugin {
	settings: CompactExportSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'compact-export-pdf',
			name: 'Compact Export to PDF',
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) {
					new Notice("No active file selected");
					return;
				}
				await this.runExport(file);
			}
		});
	}

	async runExport(file: TFile) {
		new Notice(`Optimizing layout for ${file.basename}...`);

		const solver = new LayoutSolver(this.app, this.settings);
		console.time("Solver Duration");
		const bestParams = await solver.solve(file);
		console.timeEnd("Solver Duration");

		if (!bestParams) {
			new Notice("Could not fit content within page limits even at minimum settings.");
			return;
		}

		new Notice(`Found optimal settings: ${bestParams.fontSize.toFixed(1)}pt, ${bestParams.columns} cols.`);

		// 3. Apply the styles globally (temporarily)
		const styleEl = document.createElement('style');
		styleEl.id = 'compact-export-styles';
		styleEl.innerHTML = this.createPrintStyle(bestParams);
		document.head.appendChild(styleEl);

		// 4. Trigger Print
		// We wait a moment for styles to apply
		setTimeout(() => {
			window.print();

			// 5. Cleanup (runs after print dialog closes)
			// Note: window.print() blocks JS execution in many browsers until closed,
			// but in Electron it might behave differently.
			// A safer bet is checking 'onafterprint' or setting a timeout.
			// For now, we remove it after a delay or on an event.
			const cleanup = () => { styleEl.remove(); };
			window.addEventListener('afterprint', cleanup, { once: true });

			// Fallback cleanup if event doesn't fire
			setTimeout(cleanup, 5000);
		}, 100);
	}

	/**
	 * Creates the @media print CSS block that overrides Obsidian's defaults
	 */
	createPrintStyle(params: { fontSize: number, columns: number }): string {
		return `
            @media print {
                /* Force the body/article to use our settings */
                .markdown-preview-view, 
                .markdown-rendered, 
                .print {
                    font-size: ${params.fontSize}pt !important;
                    line-height: ${this.settings.lineHeight} !important;
                }
                
                /* Column Layout */
                .markdown-preview-view > div,
                .markdown-rendered > div {
                    column-count: ${params.columns} !important;
                    column-gap: ${this.settings.columnGap}em !important;
                }

                /* Margins - Applied to @page */
                @page {
                    margin: ${this.settings.pageMargin}mm !important;
                    size: auto; 
                }

                /* Block Math Inline Override (Visual only) */
                ${this.settings.makeBlockFormulasInline ? `
                .MathJax_Display {
                    display: inline-block !important;
                    margin: 0 !important;
                    width: auto !important;
                }
                ` : ''}
            }
        `;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
}
