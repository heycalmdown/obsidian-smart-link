import { Editor, MarkdownView, MarkdownFileInfo, Plugin, TFile } from 'obsidian'
import { SmartLinkCore, SmartLinkSettings, FileInfo } from './src/smartLink'

const DEFAULT_SETTINGS: SmartLinkSettings = {
  caseSensitive: false,
}

export default class SmartLinkPlugin extends Plugin {
  settings: SmartLinkSettings = DEFAULT_SETTINGS
  private smartLinkCore!: SmartLinkCore

  async onload() {
    await this.loadSettings()
    this.smartLinkCore = new SmartLinkCore(this.settings)

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

    // Convert to FileInfo array
    return Array.from(allLinkNames).map((name) => ({
      basename: name,
    }))
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
