import { Editor, TFile } from './mocks/obsidian'
import SmartLinkPlugin from '../main'
import { SmartLinkCore } from '../src/smartLink'
import type { Editor as ObsidianEditor, App, PluginManifest } from 'obsidian'

// Mock Obsidian App and Vault
interface MockApp {
  vault: {
    getMarkdownFiles: jest.Mock
  }
  metadataCache: {
    unresolvedLinks: Record<string, unknown>
    resolvedLinks: Record<string, unknown>
  }
  loadData: jest.Mock
  saveData: jest.Mock
  addCommand: jest.Mock
  addSettingTab: jest.Mock
}

const mockApp: MockApp = {
  vault: {
    getMarkdownFiles: jest.fn(),
  },
  metadataCache: {
    unresolvedLinks: {},
    resolvedLinks: {},
  },
  loadData: jest.fn(),
  saveData: jest.fn(),
  addCommand: jest.fn(),
  addSettingTab: jest.fn(),
}

const mockManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  author: 'Test Author',
  version: '1.0.0',
  minAppVersion: '0.15.0',
  description: 'Test plugin',
}

describe('Filtering Integration Tests', () => {
  let plugin: SmartLinkPlugin
  let mockFiles: TFile[]

  beforeEach(() => {
    plugin = new SmartLinkPlugin(mockApp as unknown as App, mockManifest)
    plugin.app = mockApp as unknown as App
    plugin.settings = {
      caseSensitive: false,
      excludeDirectories: [],
      excludeNotes: [],
    }

    // Reset mocks
    jest.clearAllMocks()

    // Default mock files
    mockFiles = [
      new TFile('My Note'),
      new TFile('Template'),
      new TFile('Daily Template'),
      new TFile('Project Note'),
      new TFile('Archive Note'),
    ]

    // Override paths for some files
    mockFiles[1].path = 'Templates/Template.md' // Template
    mockFiles[2].path = 'Templates/Daily Template.md' // Daily Template
    mockFiles[3].path = 'Projects/Project Note.md' // Project Note
    mockFiles[4].path = 'Archive/Old/Archive Note.md' // Archive Note

    mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles)
  })

  describe('excludeNotes integration', () => {
    test('Should exclude specific notes from smart link creation', () => {
      // Setup: exclude specific notes
      plugin.settings.excludeNotes = ['Template', 'Daily Template', 'Project Note']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('I need a template for my project', { line: 0, ch: 10 })

      // Call createSmartLinks - should not find "Template" or "Project Note" because they're excluded
      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      // Should not create any links since both matches are excluded
      expect(editor.getContent()).toBe('I need a template for my project')
    })

    test('Should allow non-excluded notes to be linked', () => {
      // Setup: exclude only specific notes
      plugin.settings.excludeNotes = ['Template']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('I need project note details', { line: 0, ch: 10 })

      // Call createSmartLinks - should find "Project Note" since it's not excluded
      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      // Should create a link for "Project Note"
      expect(editor.getContent()).toContain('[[Project Note]]')
    })

    test('Should work with createSmartLinks command', () => {
      // Setup: exclude specific notes
      plugin.settings.excludeNotes = ['Template']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('My Note and Project Note are important', { line: 0, ch: 0 })

      // Call createSmartLinks
      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      // Should create links for non-excluded notes
      const result = editor.getContent()
      expect(result).toContain('[[My Note]]')
      expect(result).toContain('[[Project Note]]')
      expect(result).not.toContain('[[Template]]')
    })
  })

  describe('excludeDirectories integration', () => {
    test('Should exclude files from specific directories', () => {
      // Setup: exclude Templates directory
      plugin.settings.excludeDirectories = ['Templates']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('I need a template for my work', { line: 0, ch: 10 })

      // Call createSmartLinks - should not find templates in Templates directory
      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      // Should not create a link since files in Templates are excluded
      expect(editor.getContent()).toBe('I need a template for my work')
    })

    test('Should exclude nested directories', () => {
      // Setup: exclude nested Archive/Old directory
      plugin.settings.excludeDirectories = ['Archive/Old']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('Check the archive note', { line: 0, ch: 10 })

      // Call createSmartLinks
      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      // Should not create link since Archive Note is in Archive/Old
      expect(editor.getContent()).toBe('Check the archive note')
    })

    test('Should handle directory exclusion with trailing slash', () => {
      // Setup: exclude Templates directory with trailing slash
      plugin.settings.excludeDirectories = ['Templates/']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('I need a template', { line: 0, ch: 10 })

      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      // Should not create link since Templates files are excluded
      expect(editor.getContent()).toBe('I need a template')
    })

    test('Should allow files from non-excluded directories', () => {
      // Setup: exclude only Templates
      plugin.settings.excludeDirectories = ['Templates']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('Check my note, project note and archive note', { line: 0, ch: 0 })

      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      const result = editor.getContent()
      expect(result).toContain('[[My Note]]')
      expect(result).toContain('[[Project Note]]')
      // Should not exclude Archive Note since Archive/Old is not in excludeDirectories
      expect(result).toContain('[[Archive Note]]')
    })
  })

  describe('Combined exclusions integration', () => {
    test('Should apply both directory and note exclusions', () => {
      // Setup: exclude Templates directory AND specific note
      plugin.settings.excludeDirectories = ['Templates']
      plugin.settings.excludeNotes = ['Archive Note']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor(
        'My Note, Template, Daily Template, Project Note, and Archive Note',
        { line: 0, ch: 0 }
      )

      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      const result = editor.getContent()
      expect(result).toContain('[[My Note]]') // Should be linked
      expect(result).toContain('[[Project Note]]') // Should be linked
      expect(result).not.toContain('[[Template]]') // Excluded by directory
      expect(result).not.toContain('[[Daily Template]]') // Excluded by directory
      expect(result).not.toContain('[[Archive Note]]') // Excluded by note name
    })

    test('Should handle file excluded by both methods', () => {
      // Setup: Template is excluded both by directory AND by note name
      plugin.settings.excludeDirectories = ['Templates']
      plugin.settings.excludeNotes = ['Template']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('I need a template', { line: 0, ch: 10 })

      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      // Should not create link (excluded by both methods)
      expect(editor.getContent()).toBe('I need a template')
    })
  })

  describe('Edge cases', () => {
    test('Should handle empty exclude lists', () => {
      // Setup: empty exclusion lists (default)
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('My Note and Template work', { line: 0, ch: 0 })

      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      const result = editor.getContent()
      expect(result).toContain('[[My Note]]')
      expect(result).toContain('[[Template]]')
    })

    test('Should handle files with no path information', () => {
      // Setup mock files without complete path info
      const filesWithoutPaths = [{ basename: 'No Path Note' } as TFile, new TFile('Regular Note')]
      mockApp.vault.getMarkdownFiles.mockReturnValue(filesWithoutPaths)

      plugin.settings.excludeDirectories = ['Templates']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      const editor = new Editor('No Path Note and Regular Note', { line: 0, ch: 0 })

      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      const result = editor.getContent()
      expect(result).toContain('[[No Path Note]]') // Should work even without path
      expect(result).toContain('[[Regular Note]]')
    })

    test('Should handle case sensitivity with exclusions', () => {
      plugin.settings.caseSensitive = true
      plugin.settings.excludeNotes = ['template'] // lowercase
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      // Mock files with mixed case
      const mixedCaseFiles = [
        new TFile('Template'), // uppercase T
        new TFile('template'), // lowercase t
      ]
      mockApp.vault.getMarkdownFiles.mockReturnValue(mixedCaseFiles)

      const editor = new Editor('Template and template', { line: 0, ch: 0 })

      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      const result = editor.getContent()
      expect(result).toContain('[[Template]]') // Should be linked (not excluded)
      expect(result).not.toContain('[[template]]') // Should be excluded
    })
  })

  describe('Real-world scenarios', () => {
    test('Should handle complex exclusion scenarios', () => {
      // Simulate a typical user setup
      plugin.settings.excludeDirectories = ['Templates', 'Archive/Old', 'Drafts']
      plugin.settings.excludeNotes = ['TODO Template', 'Daily Note Template']
      plugin.smartLinkCore = new SmartLinkCore(plugin.settings)

      // Add more diverse mock files
      const complexMockFiles = [
        { basename: 'Important Note', path: 'Important Note.md' },
        { basename: 'TODO Template', path: 'Templates/TODO Template.md' },
        { basename: 'Meeting Notes', path: 'Work/Meeting Notes.md' },
        { basename: 'Old Project', path: 'Archive/Old/Old Project.md' },
        { basename: 'Draft Article', path: 'Drafts/Draft Article.md' },
      ] as TFile[]
      mockApp.vault.getMarkdownFiles.mockReturnValue(complexMockFiles)

      const editor = new Editor(
        'Important Note, TODO Template, Meeting Notes, Old Project, Draft Article',
        { line: 0, ch: 0 }
      )

      plugin['createSmartLinks'](editor as unknown as ObsidianEditor)

      const result = editor.getContent()
      expect(result).toContain('[[Important Note]]') // Should be linked
      expect(result).toContain('[[Meeting Notes]]') // Should be linked
      expect(result).not.toContain('[[TODO Template]]') // Excluded by both directory and note name
      expect(result).not.toContain('[[Old Project]]') // Excluded by directory
      expect(result).not.toContain('[[Draft Article]]') // Excluded by directory
    })
  })
})
