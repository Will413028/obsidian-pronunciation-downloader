import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface PronunciationDownloaderSettings {
	apiKey: string;
	downloadPath: string;
}

const DEFAULT_SETTINGS: PronunciationDownloaderSettings = {
	apiKey: '',
	downloadPath: 'pronunciations'
}

class ForvoAPI {
	private apiKey: string;
	private baseUrl = 'https://apifree.forvo.com';

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async searchWord(word: string, language: string = 'en') {
		const url = `${this.baseUrl}/key/${this.apiKey}/format/json/action/word-pronunciations/word/${encodeURIComponent(word)}/language/${language}`;
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch pronunciations: ${response.statusText}`);
		}
		return await response.json();
	}

	async downloadPronunciation(url: string): Promise<ArrayBuffer> {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to download pronunciation: ${response.statusText}`);
		}
		return await response.arrayBuffer();
	}
}

export default class PronunciationDownloader extends Plugin {
	settings: PronunciationDownloaderSettings;
	private forvoApi: ForvoAPI;

	async downloadPronunciation(word: string) {
		try {
			const result = await this.forvoApi.searchWord(word);
			if (result.items && result.items.length > 0) {
				const pronunciation = result.items[0];
				const audioData = await this.forvoApi.downloadPronunciation(pronunciation.pathmp3);
				
				// Save the file in the vault
				const fileName = `${this.settings.downloadPath}/${word}_${pronunciation.id}.mp3`;
				await this.app.vault.createBinary(fileName, audioData);
				
				new Notice(`Downloaded pronunciation for "${word}"`);
			} else {
				new Notice(`No pronunciation found for "${word}"`);
			}
		} catch (error) {
			console.error('Error downloading pronunciation:', error);
			new Notice(`Failed to download pronunciation: ${error.message}`);
		}
	}

	async onload() {
		await this.loadSettings();

		this.forvoApi = new ForvoAPI(this.settings.apiKey);

		// Add ribbon icon for quick access
		this.addRibbonIcon('sound', 'Download Pronunciation', () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const selection = activeView.editor.getSelection();
				if (selection) {
					this.downloadPronunciation(selection);
				} else {
					new Notice('Please select a word to download its pronunciation');
				}
			}
		});

		// Add command to download pronunciation
		this.addCommand({
			id: 'download-pronunciation',
			name: 'Download pronunciation for selected word',
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				if (selection) {
					this.downloadPronunciation(selection);
				} else {
					new Notice('Please select a word to download its pronunciation');
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new PronunciationSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class PronunciationSettingTab extends PluginSettingTab {
	plugin: PronunciationDownloader;

	constructor(app: App, plugin: PronunciationDownloader) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Forvo API Key')
			.setDesc('Enter your Forvo API key')
			.addText(text => text
				.setPlaceholder('Enter API key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Download Path')
			.setDesc('Path where pronunciation files will be saved (relative to vault)')
			.addText(text => text
				.setPlaceholder('pronunciations')
				.setValue(this.plugin.settings.downloadPath)
				.onChange(async (value) => {
					this.plugin.settings.downloadPath = value;
					await this.plugin.saveSettings();
				}));
	}
}
