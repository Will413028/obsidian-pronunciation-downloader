# Obsidian Pronunciation Downloader

A plugin for Obsidian that allows you to download pronunciations directly in your notes. This plugin integrates with Forvo's API to provide authentic pronunciations from native speakers in multiple languages.

## Features

- Download pronunciations for words in English, Japanese, and Mandarin Chinese
- Quick access through ribbon icon or command palette
- Automatically embeds audio files in your notes
- Customizable download location for audio files
- Simple language selection interface

## Setup

1. Have Obsidian downloaded
2. Search the 'Community plugins' list for this plugin and 
3. Install the plugin
4. Enable the plugin in your Community Plugins list
5. Get a Forvo API key from [Forvo's API page](https://api.forvo.com/)
6. Open Obsidian Settings
7. Go to "Pronunciation Downloader" settings
8. Enter your Forvo API key
9. (Optional) Customize the download path for pronunciation files

## Usage

### Method 1: Using the Ribbon Icon

1. Select a word in your note
2. Click the sound icon in the left ribbon
3. Choose the desired language
4. The pronunciation will be downloaded and automatically embedded in your note

### Method 2: Using the Command Palette

1. Select a word in your note
2. Open the Command Palette (Ctrl/Cmd + P)
3. Search for "Download pronunciation for selected word"
4. Choose the desired language
5. The pronunciation will be downloaded and automatically embedded in your note

## Supported Languages

- English
- Japanese
- Mandarin Chinese

## Configuration

In the plugin settings, you can configure:

- **Forvo API Key**: Your API key from Forvo
- **Download Path**: The folder where pronunciation files will be saved (relative to your vault)

## Notes

- An active internet connection is required to download pronunciations
- A valid Forvo API key is required for the plugin to work
- Audio files are saved in MP3 format
- Files are saved in the specified download path with the format: `word_id.mp3`

## Support

If you encounter any issues or have suggestions, please visit the [GitHub repository](https://github.com/Will413028/obsidian-pronunciation-downloader) to file an issue.
