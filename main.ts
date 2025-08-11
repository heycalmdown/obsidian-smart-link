import {
  Editor,
  MarkdownView,
  MarkdownFileInfo,
  Plugin,
  TFile,
  App,
  PluginSettingTab,
  Setting,
} from 'obsidian'
import { SmartLinkCore, SmartLinkSettings, FileInfo } from './src/smartLink'

const DEFAULT_SETTINGS: SmartLinkSettings = {
  caseSensitive: false,
  excludeDirectories: [],
  excludeNotes: [],
}

export default class SmartLinkPlugin extends Plugin {
  settings: SmartLinkSettings = DEFAULT_SETTINGS
  smartLinkCore!: SmartLinkCore

  async onload() {
    await this.loadSettings()
    this.smartLinkCore = new SmartLinkCore(this.settings)

    this.addSettingTab(new SmartLinkSettingTab(this.app, this))

    this.addCommand({
      id: 'smart-link',
      name: 'Create smart link',
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        this.createSmartLink(editor)
      },
    })

    this.addCommand({
      id: 'smart-link-all',
      name: 'Create all smart links in line',
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        this.createAllSmartLinks(editor)
      },
    })
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  private getAllLinkableFiles(): FileInfo[] {
    // Get existing files
    const allFiles = this.app.vault.getMarkdownFiles()
    const existingFiles: FileInfo[] = allFiles.map((file: TFile) => ({
      basename: file.basename,
      path: file.path,
    }))

    // Get all link references (including non-existent files)
    const allLinkNames = new Set<string>()

    // Add existing files
    existingFiles.forEach((file) => allLinkNames.add(file.basename))

    // Get unresolved links (links that don't have corresponding files)
    const unresolvedLinks = this.app.metadataCache.unresolvedLinks

    // Extract link names from unresolved links
    Object.values(unresolvedLinks).forEach((linkMap) => {
      Object.keys(linkMap).forEach((linkName) => {
        // Remove .md extension and path if present
        const basename = linkName.replace(/\.md$/, '').split('/').pop()
        if (basename) {
          allLinkNames.add(basename)
        }
      })
    })

    // Also check resolved links to catch any we might have missed
    const resolvedLinks = this.app.metadataCache.resolvedLinks

    Object.values(resolvedLinks).forEach((linkMap) => {
      Object.keys(linkMap).forEach((linkName) => {
        const basename = linkName.replace(/\.md$/, '').split('/').pop()
        if (basename) {
          allLinkNames.add(basename)
        }
      })
    })

    // Convert to FileInfo array and apply filtering
    const allFileInfos = Array.from(allLinkNames).map((name) => {
      // Try to find the actual file to get its path
      const actualFile = allFiles.find((f) => f.basename === name)
      return {
        basename: name,
        path: actualFile?.path,
      }
    })

    // Filter files based on exclude settings
    return this.smartLinkCore.filterFiles(allFileInfos)
  }

  private createSmartLink(editor: Editor) {
    const cursor = editor.getCursor()
    const line = editor.getLine(cursor.line)
    const fileInfos = this.getAllLinkableFiles()

    const result = this.smartLinkCore.processSmartLink(line, cursor.ch, fileInfos)

    if (!result) {
      return
    }

    editor.replaceRange(
      result.result,
      { line: cursor.line, ch: result.start },
      { line: cursor.line, ch: result.end }
    )
  }

  private createAllSmartLinks(editor: Editor) {
    const cursor = editor.getCursor()
    const line = editor.getLine(cursor.line)
    const fileInfos = this.getAllLinkableFiles()

    const newLine = this.smartLinkCore.processAllSmartLinks(line, fileInfos)

    // Replace the entire line with the new line containing all smart links
    editor.replaceRange(
      newLine,
      { line: cursor.line, ch: 0 },
      { line: cursor.line, ch: line.length }
    )
  }
}

class SmartLinkSettingTab extends PluginSettingTab {
  plugin: SmartLinkPlugin

  constructor(app: App, plugin: SmartLinkPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    containerEl.createEl('h2', { text: 'Smart Link Settings' })

    // Case sensitivity setting
    new Setting(containerEl)
      .setName('Case sensitive matching')
      .setDesc('Enable case-sensitive matching for smart links')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.caseSensitive).onChange(async (value) => {
          this.plugin.settings.caseSensitive = value
          await this.plugin.saveSettings()
          this.plugin.smartLinkCore = new SmartLinkCore(this.plugin.settings)
        })
      )

    // Exclude directories section
    containerEl.createEl('h3', { text: 'Exclude Directories' })
    containerEl.createEl('p', {
      text: 'Files in these directories will not be included in smart link suggestions. Enter directory paths relative to vault root.',
      cls: 'setting-item-description',
    })

    // Add directory input
    const addDirSetting = new Setting(containerEl)
      .setName('Add directory to exclude')
      .setDesc('Enter a directory path (e.g., "Templates" or "Archive/Old")')

    let dirInput: HTMLInputElement
    addDirSetting
      .addText((text) => {
        dirInput = text.inputEl
        text.setPlaceholder('Enter directory path')
      })
      .addButton((button) =>
        button
          .setButtonText('Add')
          .setCta()
          .onClick(async () => {
            const dirPath = dirInput.value.trim()
            if (dirPath && !this.plugin.settings.excludeDirectories.includes(dirPath)) {
              this.plugin.settings.excludeDirectories.push(dirPath)
              await this.plugin.saveSettings()
              this.plugin.smartLinkCore = new SmartLinkCore(this.plugin.settings)
              dirInput.value = ''
              this.display() // Refresh to show the new item
            }
          })
      )

    // List current excluded directories
    this.plugin.settings.excludeDirectories.forEach((dir, index) => {
      new Setting(containerEl).setName(dir).addButton((button) =>
        button
          .setButtonText('Remove')
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.excludeDirectories.splice(index, 1)
            await this.plugin.saveSettings()
            this.plugin.smartLinkCore = new SmartLinkCore(this.plugin.settings)
            this.display() // Refresh to remove the item
          })
      )
    })

    // Exclude notes section
    containerEl.createEl('h3', { text: 'Exclude Notes' })
    containerEl.createEl('p', {
      text: 'These specific notes will not be included in smart link suggestions. Enter note names without the .md extension. Supports regular expressions (e.g., "^Draft.*" to exclude all notes starting with "Draft").',
      cls: 'setting-item-description',
    })

    // Add note input
    const addNoteSetting = new Setting(containerEl)
      .setName('Add note to exclude')
      .setDesc('Enter a note name or regex pattern (e.g., "Daily Notes Template" or "^Draft.*")')

    let noteInput: HTMLInputElement
    addNoteSetting
      .addText((text) => {
        noteInput = text.inputEl
        text.setPlaceholder('Enter note name')
      })
      .addButton((button) =>
        button
          .setButtonText('Add')
          .setCta()
          .onClick(async () => {
            const noteName = noteInput.value.trim()
            if (noteName && !this.plugin.settings.excludeNotes.includes(noteName)) {
              this.plugin.settings.excludeNotes.push(noteName)
              await this.plugin.saveSettings()
              this.plugin.smartLinkCore = new SmartLinkCore(this.plugin.settings)
              noteInput.value = ''
              this.display() // Refresh to show the new item
            }
          })
      )

    // List current excluded notes
    this.plugin.settings.excludeNotes.forEach((note, index) => {
      new Setting(containerEl).setName(note).addButton((button) =>
        button
          .setButtonText('Remove')
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.excludeNotes.splice(index, 1)
            await this.plugin.saveSettings()
            this.plugin.smartLinkCore = new SmartLinkCore(this.plugin.settings)
            this.display() // Refresh to remove the item
          })
      )
    })
  }
}
