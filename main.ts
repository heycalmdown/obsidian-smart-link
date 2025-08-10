import { Editor, MarkdownView, MarkdownFileInfo, Plugin } from 'obsidian'
import { SmartLinkCore, SmartLinkSettings } from './src/smartLink'

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
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 'k',
        },
      ],
    })
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  private createSmartLink(editor: Editor) {
    const cursor = editor.getCursor()
    const line = editor.getLine(cursor.line)
    const allFiles = this.app.vault.getMarkdownFiles()

    const result = this.smartLinkCore.processSmartLink(line, cursor.ch, allFiles)
    if (!result) {
      return
    }

    editor.replaceRange(
      result.result,
      { line: cursor.line, ch: result.start },
      { line: cursor.line, ch: result.end }
    )
  }
}
