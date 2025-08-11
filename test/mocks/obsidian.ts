export class TFile {
  basename: string
  extension: string
  path: string

  constructor(basename: string, extension = 'md') {
    this.basename = basename
    this.extension = extension
    this.path = `${basename}.${extension}`
  }
}

export class Editor {
  private content: string
  private cursor: { line: number; ch: number }
  private lines: string[]

  constructor(content: string, cursorPosition: { line: number; ch: number }) {
    this.content = content
    this.cursor = cursorPosition
    this.lines = content.split('\n')
  }

  getCursor() {
    return this.cursor
  }

  getLine(line: number) {
    return this.lines[line]
  }

  replaceRange(
    replacement: string,
    from: { line: number; ch: number },
    to: { line: number; ch: number }
  ) {
    const line = this.lines[from.line]
    const before = line.substring(0, from.ch)
    const after = line.substring(to.ch)
    this.lines[from.line] = before + replacement + after
    this.content = this.lines.join('\n')
  }

  getContent() {
    return this.content
  }

  getLineContent(line: number) {
    return this.lines[line]
  }
}

export class Plugin {
  app: unknown

  async loadData(): Promise<Record<string, unknown>> {
    return {}
  }

  async saveData(_data: unknown): Promise<void> {}

  addCommand(_command: unknown): void {}
}

export interface MarkdownView {}
export interface MarkdownFileInfo {}
export interface EventRef {}
