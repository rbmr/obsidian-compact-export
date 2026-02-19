import {Plugin, Notice, TFile, App, PluginSettingTab, Setting, Component, MarkdownRenderer} from 'obsidian';
import { DEFAULT_SETTINGS, CompactExportSettings } from './settings';
import {findOptimalSettings} from "./solver";

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

	private preprocessMarkdown(content: string): string {
		let processed = content;
		if (this.settings.makeBlockFormulasInline) {
			processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
				return `$${formula.trim()}$`;
			});
		}
		return processed;
	}

	private getStyles(fontSize: number, cols: number, mode: 'measure' | 'print'): string {
		// TODO: implement this. This should be the single source of truth for styling.
		return ""
	}

	async runExport(file: TFile) {
		const notice = new Notice("Calculating optimal layout...", 0);
		const rawContent = await this.app.vault.read(file);
		const processedContent = this.preprocessMarkdown(rawContent);
		// TODO: implement this
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
