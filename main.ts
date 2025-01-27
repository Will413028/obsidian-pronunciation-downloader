import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';

interface PronunciationDownloaderSettings {
	apiKey: string;
	downloadPath: string;
}

const DEFAULT_SETTINGS: PronunciationDownloaderSettings = {
	apiKey: '',
	downloadPath: 'pronunciations'
}

class LanguageSelectionModal extends Modal {
	private word: string;
	private editor?: Editor;
	private plugin: PronunciationDownloader;
	private languages = [
		{ code: '39', name: 'English' },
		{ code: '76', name: 'Japanese' },
		{ code: '186', name: 'Mandarin Chinese' }
	];

	constructor(app: App, plugin: PronunciationDownloader, word: string, editor?: Editor) {
		super(app);
		this.plugin = plugin;
		this.word = word;
		this.editor = editor;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Select Language' });
		
		const buttonsContainer = contentEl.createDiv({ cls: 'language-buttons' });
		
		this.languages.forEach(lang => {
			const btn = buttonsContainer.createEl('button', { text: lang.name });
			btn.onclick = async () => {
				await this.plugin.downloadPronunciationWithLanguage(this.word, lang.code, this.editor);
				this.close();
			};
		});

		contentEl.createEl('style', {
			text: `
				.language-buttons {
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: 10px;
					padding: 10px;
				}
				.language-buttons button {
					padding: 8px;
					cursor: pointer;
				}
			`
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ForvoAPI {
	private apiKey: string;
	private baseUrl = 'https://apifree.forvo.com';

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async searchWord(word: string, options: {
		language?: string;
		country?: string;
		username?: string;
		sex?: 'm' | 'f';
		rate?: number;
		order?: 'date-desc' | 'date-asc' | 'rate-desc' | 'rate-asc';
		limit?: number;
	} = {}) {
		let url = `${this.baseUrl}/action/word-pronunciations/format/json/word/${encodeURIComponent(word)}`;

		// Add optional parameters
		if (options.language) url += `/id_lang_speak/${options.language}`;
		if (options.username) url += `/username/${options.username}`;
		if (options.sex) url += `/sex/${options.sex}`;
		if (options.rate) url += `/rate/${options.rate}`;
		if (options.order) url += `/order/${options.order}`;
		if (options.limit) url += `/limit/${options.limit}`;

		// Add API key at the end
		url += `/key/${this.apiKey}`;

		try {
			const response = await requestUrl({
				url: url,
				method: 'GET'
			});
			
			const data = response.json;
			if (data.error) {
				throw new Error(`Forvo API error: ${data.error}`);
			}
			
			return data;
		} catch (error) {
			console.error('Error fetching pronunciations:', error);
			throw new Error(`Failed to fetch pronunciations: ${error.message}`);
		}
	}

	async downloadPronunciation(url: string): Promise<ArrayBuffer> {
		try {
			const response = await requestUrl({
				url: url,
				method: 'GET'
			});
			return response.arrayBuffer;
		} catch (error) {
			console.error('Error downloading pronunciation:', error);
			throw new Error(`Failed to download pronunciation: ${error.message}`);
		}
	}
}

export default class PronunciationDownloader extends Plugin {
	settings: PronunciationDownloaderSettings;
	private forvoApi: ForvoAPI;

	async downloadPronunciationWithLanguage(word: string, language: string, editor?: Editor) {
		try {
			const result = await this.forvoApi.searchWord(word, {
				language: language
			});
			if (result.items && result.items.length > 0) {
				const pronunciation = result.items[0];
				const audioData = await this.forvoApi.downloadPronunciation(pronunciation.pathmp3);
				
				// Save the file in the vault
				const fileName = `${this.settings.downloadPath}/${word}_${pronunciation.id}.mp3`;
				await this.app.vault.createBinary(fileName, audioData);
				
				// Insert file link in the note if editor is provided
				if (editor) {
					const cursor = editor.getCursor();
					const fileLink = `![[${fileName}]]`;
					editor.replaceRange(`\n${fileLink}\n`, cursor);
				}
				
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
					new LanguageSelectionModal(this.app, this, selection, activeView.editor).open();
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
					new LanguageSelectionModal(this.app, this, selection, editor).open();
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
