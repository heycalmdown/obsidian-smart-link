import SmartLinkPlugin from '../main'
import { Editor, TFile } from './mocks/obsidian'
import { SmartLinkCore } from '../src/smartLink'
import type { Editor as ObsidianEditor, App, PluginManifest } from 'obsidian'

// <CHORUS_TAG>test</CHORUS_TAG>
describe('SmartLinkPlugin Integration Tests', () => {
  const mockApp = {
    vault: {
      getMarkdownFiles: jest.fn(() => [
        new TFile('React'),
        new TFile('JavaScript'),
        new TFile('TypeScript'),
        new TFile('인공지능'),
        new TFile('머신러닝'),
        new TFile('Claude Code'),
        new TFile('Visual Studio Code'),
      ]),
    },
    metadataCache: {
      unresolvedLinks: {},
      resolvedLinks: {},
    },
  }

  const mockManifest: PluginManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    author: 'Test Author',
    version: '1.0.0',
    minAppVersion: '0.15.0',
    description: 'Test plugin',
  }

  let plugin: SmartLinkPlugin
  let editor: Editor

  beforeEach(() => {
    // Reset mockApp to default files before each test
    mockApp.vault.getMarkdownFiles = jest.fn(() => [
      new TFile('React'),
      new TFile('JavaScript'),
      new TFile('TypeScript'),
      new TFile('인공지능'),
      new TFile('머신러닝'),
      new TFile('Claude Code'),
      new TFile('Visual Studio Code'),
    ])

    plugin = new SmartLinkPlugin(mockApp as unknown as App, mockManifest)
    plugin.settings = { caseSensitive: false, excludeDirectories: [], excludeNotes: [] }
    plugin.app = mockApp as unknown as App
    plugin['smartLinkCore'] = new SmartLinkCore(plugin.settings)
  })

  describe('createAllSmartLinks command', () => {
    test('Should create all smart links in English sentence', () => {
      const content = 'I love React and JavaScript programming'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('I love [[React]] and [[JavaScript]] programming')
    })

    test('Korean: Should create all smart links with particles', () => {
      const content = '인공지능과 머신러닝을 공부한다'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('[[인공지능]]과 [[머신러닝]]을 공부한다')
    })

    test('Should handle mixed language content', () => {
      const content = 'Claude Code는 인공지능이다'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('[[Claude Code]]는 [[인공지능]]이다')
    })

    test('Should prioritize longer matches', () => {
      mockApp.vault.getMarkdownFiles = jest.fn(() => [
        new TFile('Visual Studio'),
        new TFile('Visual Studio Code'),
      ])

      const content = 'I use Visual Studio Code for development'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('I use [[Visual Studio Code]] for development')
    })

    test('Should skip existing wiki links', () => {
      const content = 'I love [[React]] and JavaScript programming'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('I love [[React]] and [[JavaScript]] programming')
    })

    test('Should work with cursor at different positions', () => {
      const content = 'I love React and JavaScript programming'
      const positions = [0, 10, 20, 30]

      positions.forEach((position) => {
        editor = new Editor(content, { line: 0, ch: position })
        plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)
        expect(editor.getLineContent(0)).toBe('I love [[React]] and [[JavaScript]] programming')
      })
    })
  })

  describe('Command differences', () => {
    test('createSmartLink vs createAllSmartLinks', () => {
      const content = 'I love React and JavaScript programming'

      // Test createAllSmartLinks
      editor = new Editor(content, { line: 0, ch: 10 })
      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)
      expect(editor.getLineContent(0)).toBe('I love [[React]] and [[JavaScript]] programming')
    })
  })

  describe('Error handling', () => {
    test('Should handle empty line', () => {
      const content = ''
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('')
    })

    test('Should handle line with no matches', () => {
      const content = 'I love programming with various tools'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('I love programming with various tools')
    })

    test('Should handle malformed existing links gracefully', () => {
      const content = 'I love [[React and JavaScript programming'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toContain('[[JavaScript]]')
    })
  })

  describe('Settings integration', () => {
    test('Should respect case sensitivity setting', () => {
      plugin.settings = { caseSensitive: true, excludeDirectories: [], excludeNotes: [] }
      plugin['smartLinkCore'] = new SmartLinkCore(plugin.settings)

      mockApp.vault.getMarkdownFiles = jest.fn(() => [new TFile('JavaScript')])

      const content = 'I love javascript programming'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('I love javascript programming')
    })

    test('Should work with case insensitive setting (default)', () => {
      plugin.settings = { caseSensitive: false, excludeDirectories: [], excludeNotes: [] }
      plugin['smartLinkCore'] = new SmartLinkCore(plugin.settings)

      mockApp.vault.getMarkdownFiles = jest.fn(() => [new TFile('JavaScript')])

      const content = 'I love javascript programming'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe('I love [[JavaScript]] programming')
    })
  })

  describe('File discovery', () => {
    test('Should work with different file configurations', () => {
      mockApp.vault.getMarkdownFiles = jest.fn(() => [
        new TFile('Python'),
        new TFile('Django'),
        new TFile('FastAPI'),
      ])

      const content = 'Python with Django and FastAPI is powerful'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe(
        '[[Python]] with [[Django]] and [[FastAPI]] is powerful'
      )
    })

    test('Should handle unresolvedLinks and resolvedLinks from metadataCache', () => {
      mockApp.metadataCache.unresolvedLinks = {
        'note1.md': { UnresolvedNote: 1 },
      }
      mockApp.metadataCache.resolvedLinks = {
        'note2.md': { 'ResolvedNote.md': 1 },
      }

      const content = 'UnresolvedNote and ResolvedNote are interesting'
      editor = new Editor(content, { line: 0, ch: 0 })

      plugin['createAllSmartLinks'](editor as unknown as ObsidianEditor)

      expect(editor.getLineContent(0)).toBe(
        '[[UnresolvedNote]] and [[ResolvedNote]] are interesting'
      )
    })
  })
})
