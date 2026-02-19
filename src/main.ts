import {Plugin, Notice, TFile, App, PluginSettingTab, Setting, MarkdownRenderer, Component} from 'obsidian';
import { LayoutSolver } from './solver';
import { DEFAULT_SETTINGS, CompactExportSettings } from './settings';

export default class CompactExportPlugin extends Plugin {
	settings: CompactExportSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new CompactExportSettingTab(this.app, this));

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
		const bestParams = await solver.solve(file);

		if (!bestParams) {
			new Notice("Could not fit content within page limits even at minimum settings.");
			return;
		}

		const printContainer = document.body.createDiv('compact-export-container');
		const component = new Component();

		const markdown = await this.app.vault.read(file);
		const processedMarkdown = this.settings.makeBlockFormulasInline
			? solver.compactFormulas(markdown)
			: markdown;

		await MarkdownRenderer.render(this.app, processedMarkdown, printContainer, file.path, component);

		const styleEl = document.createElement('style');
		styleEl.id = 'compact-export-styles';

		styleEl.innerHTML = `
			/* Hide on screen: Use off-screen positioning instead of visibility:hidden 
			   to ensure internal layout engines render the content properly before print. */
			.compact-export-container {
				position: absolute;
				top: 0;
				left: -9999px;
				width: 100%;
				z-index: -1;
				background-color: white;
			}

			@media print {
				/* 1. Reset Global Styles to allow full-page printing */
				html, body {
					height: auto !important;
					overflow: visible !important;
					margin: 0 !important;
					padding: 0 !important;
					background: white !important;
				}

				/* 2. Hide the standard Obsidian Interface */
				body > *:not(.compact-export-container) {
					display: none !important;
				}

				/* 3. Setup the Print Container */
				.compact-export-container {
					position: static !important; /* Bring back into flow */
					display: block !important;
					left: 0 !important;
					z-index: 9999;
					
					/* Force Black on White (Fixes Dark Mode blank pages) */
					color: black !important;
					background-color: white !important;
					
					/* Apply the calculated compact settings */
					font-size: ${bestParams.fontSize}pt !important;
					line-height: ${this.settings.lineHeight} !important;
					column-count: ${bestParams.columns} !important;
					column-gap: ${this.settings.columnGap}em !important;
					
					/* Reset heights to ensure full print */
					height: auto !important;
					overflow: visible !important;
				}

				/* Ensure child elements inherit the high contrast color */
				.compact-export-container * {
					color: inherit;
				}

				/* Page Margins */
				@page {
					margin: ${this.settings.pageMargin}mm !important;
					size: auto; 
				}

				/* Prevent page breaks inside critical elements */
				p, h1, h2, h3, h4, h5, li {
					break-inside: avoid;
				}

				/* MathJax Tweaks */
				${this.settings.makeBlockFormulasInline ? `
				.MathJax_Display {
					display: inline-block !important;
					margin: 0 !important;
					width: auto !important;
				}
				` : ''}
			}
		`;
		document.head.appendChild(styleEl);

		setTimeout(() => {
			window.print();

			const cleanup = () => {
				styleEl.remove();
				printContainer.remove();
				component.unload();
			};

			window.addEventListener('afterprint', cleanup, { once: true });

			setTimeout(cleanup, 2000);

		}, 1000);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CompactExportSettingTab extends PluginSettingTab {
	plugin: CompactExportPlugin;

	constructor(app: App, plugin: CompactExportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Compact Export Settings' });

		new Setting(containerEl)
			.setName('Max Page Count')
			.setDesc('The maximum number of pages allowed for the export.')
			.addText(text => text
				.setPlaceholder('2')
				.setValue(String(this.plugin.settings.maxPageCount))
				.onChange(async (value) => {
					this.plugin.settings.maxPageCount = Number(value);
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Layout Constraints' });

		new Setting(containerEl)
			.setName('Minimum Columns')
			.setDesc('Start searching from this number of columns.')
			.addText(text => text
				.setValue(String(this.plugin.settings.minColumns))
				.onChange(async (value) => {
					this.plugin.settings.minColumns = Number(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Maximum Columns')
			.setDesc('Do not exceed this number of columns.')
			.addText(text => text
				.setValue(String(this.plugin.settings.maxColumns))
				.onChange(async (value) => {
					this.plugin.settings.maxColumns = Number(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Minimum Font Size')
			.setDesc('Smallest acceptable font size (pt).')
			.addText(text => text
				.setValue(String(this.plugin.settings.minFontSize))
				.onChange(async (value) => {
					this.plugin.settings.minFontSize = Number(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Maximum Font Size')
			.setDesc('Largest acceptable font size (pt).')
			.addText(text => text
				.setValue(String(this.plugin.settings.maxFontSize))
				.onChange(async (value) => {
					this.plugin.settings.maxFontSize = Number(value);
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Spacing & Margins' });

		new Setting(containerEl)
			.setName('Line Height')
			.setDesc('Relative line height (e.g. 1.2).')
			.addText(text => text
				.setValue(String(this.plugin.settings.lineHeight))
				.onChange(async (value) => {
					this.plugin.settings.lineHeight = Number(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Column Gap')
			.setDesc('Space between columns in em (e.g. 2.0).')
			.addText(text => text
				.setValue(String(this.plugin.settings.columnGap))
				.onChange(async (value) => {
					this.plugin.settings.columnGap = Number(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Page Margin')
			.setDesc('Page margins in mm.')
			.addText(text => text
				.setValue(String(this.plugin.settings.pageMargin))
				.onChange(async (value) => {
					this.plugin.settings.pageMargin = Number(value);
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Compact Options' });

		new Setting(containerEl)
			.setName('Inline Block Formulas')
			.setDesc('Convert block formulas to inline to save vertical space.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.makeBlockFormulasInline)
				.onChange(async (value) => {
					this.plugin.settings.makeBlockFormulasInline = value;
					await this.plugin.saveSettings();
				}));
	}
}
