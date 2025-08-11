import { SmartLinkCore, SmartLinkSettings, FileInfo } from '../src/smartLink'

// <CHORUS_TAG>test</CHORUS_TAG>
describe('SmartLinkCore Unit Tests', () => {
  let smartLink: SmartLinkCore
  let files: FileInfo[]

  beforeEach(() => {
    smartLink = new SmartLinkCore({
      caseSensitive: false,
      excludeDirectories: [],
      excludeNotes: [],
    })
    files = []
  })

  describe('Korean particle handling', () => {
    test('Korean particles: 쌀떡이를 -> [[쌀떡이]]를', () => {
      files = [{ basename: '쌀떡이' }]
      const line = '쌀떡이를 먹었다'
      const cursorPos = 3

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[쌀떡이]]를')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(4)
    })

    test('Korean particles: 서울특별시에서 -> [[서울특별시]]에서', () => {
      files = [{ basename: '서울특별시' }]
      const line = '서울특별시에서 만났다'
      const cursorPos = 5

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[서울특별시]]에서')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(7)
    })

    test('Korean particles: 인공지능이 -> [[인공지능]]이', () => {
      files = [{ basename: '인공지능' }]
      const line = '인공지능이 발전하고 있다'
      const cursorPos = 3

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[인공지능]]이')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(5)
    })

    test('Korean particles with mixed languages: Claude Code가 -> [[Claude Code]]가', () => {
      files = [{ basename: 'Claude Code' }]
      const line = 'claude code가 좋다'
      const cursorPos = 5

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Claude Code]]가')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(12)
    })
  })

  describe('Priority matching', () => {
    test('Should prefer longer matches: "2022 FIFA World Cup" over "World Cup"', () => {
      files = [{ basename: 'World Cup' }, { basename: '2022 FIFA World Cup' }]
      const line = 'The 2022 FIFA World Cup was held in Qatar'
      const cursorPos = 20

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[2022 FIFA World Cup]] was')
      expect(result?.start).toBe(4)
      expect(result?.end).toBe(35)
    })

    test('Korean priority matching: "생성형 인공지능" over "인공지능"', () => {
      files = [{ basename: '인공지능' }, { basename: '생성형 인공지능' }]
      const line = '생성형 인공지능이 화제다'
      const cursorPos = 6

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[생성형 인공지능]]이')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(13)
    })
  })

  describe('Basic matching', () => {
    test('Should match basic English text', () => {
      files = [{ basename: 'Project Management' }]
      const line = 'I need to improve my project management skills'
      const cursorPos = 30

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Project Management]]')
      expect(result?.start).toBe(21)
      expect(result?.end).toBe(46)
    })

    test('Should handle text with brackets', () => {
      files = [{ basename: 'React' }]
      const line = 'I love [React] framework'
      const cursorPos = 10

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[React]]')
      expect(result?.start).toBe(8)
      expect(result?.end).toBe(13)
    })

    test('Should handle multiple words', () => {
      files = [{ basename: 'Visual Studio Code' }]
      const line = 'I use Visual Studio Code for development'
      const cursorPos = 15

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Visual Studio Code]]')
      expect(result?.start).toBe(6)
      expect(result?.end).toBe(24)
    })
  })

  describe('Edge cases', () => {
    test('Should return null when no files match', () => {
      files = [{ basename: 'JavaScript' }]
      const line = 'I love Python'
      const cursorPos = 10

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).toBeNull()
    })

    test('Should return null for empty line', () => {
      files = [{ basename: 'Test' }]
      const line = ''
      const cursorPos = 0

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).toBeNull()
    })

    test('Should handle cursor at line boundaries', () => {
      files = [{ basename: 'Hello' }]
      const line = 'Hello world'

      // Test at start
      const resultStart = smartLink.processSmartLink(line, 0, files)
      expect(resultStart).not.toBeNull()
      expect(resultStart?.result).toBe('[[Hello]]')

      // Test at end
      files = [{ basename: 'world' }]
      const resultEnd = smartLink.processSmartLink(line, 11, files)
      expect(resultEnd).not.toBeNull()
      expect(resultEnd?.result).toBe('[[world]]')
    })
  })

  describe('Case sensitivity', () => {
    test('Should match case-insensitively by default', () => {
      files = [{ basename: 'JavaScript' }]
      const line = 'I love javascript'
      const cursorPos = 10

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[JavaScript]]')
    })

    test('Should match case-sensitively when enabled', () => {
      smartLink = new SmartLinkCore({
        caseSensitive: true,
        excludeDirectories: [],
        excludeNotes: [],
      })
      files = [{ basename: 'JavaScript' }]

      // Should not match different case
      const result1 = smartLink.processSmartLink('I love javascript', 10, files)
      expect(result1).toBeNull()

      // Should match exact case
      const result2 = smartLink.processSmartLink('I love JavaScript', 10, files)
      expect(result2).not.toBeNull()
      expect(result2?.result).toBe('[[JavaScript]]')
    })
  })

  describe('Bug fix: multiline boundary handling', () => {
    test('Should not delete lines after partial match', () => {
      const files = [{ basename: 'Life Interviewer' }]
      const line = 'life interview'
      const cursorPos = 10
      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.result).toContain('[[Life Interviewer]]')
        expect(result.start).toBe(0)
        expect(result.end).toBe(14)
      }
    })

    test('Should not delete lines after exact match', () => {
      const files = [{ basename: 'Life Interviewer' }]
      const line = 'life interviewer'
      const cursorPos = 10
      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.result).toBe('[[Life Interviewer]]')
        expect(result.start).toBe(0)
        expect(result.end).toBe(16)
      }
    })

    test('Should handle text with suffix correctly', () => {
      const files = [{ basename: 'Life Interviewer' }]
      const line = 'Life Interviewer 파일'
      const cursorPos = 10
      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.result).toContain('[[Life Interviewer]]')
        expect(result.start).toBe(0)
        expect(result.end).toBeLessThanOrEqual(line.length)
      }
    })

    test('Should preserve text boundaries correctly', () => {
      const files = [{ basename: 'Life Interviewer' }]
      const line = 'life interviewer'
      const nextLine = 'This should not be deleted'
      const cursorPos = 10

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.result).toBe('[[Life Interviewer]]')
        expect(result.start).toBe(0)
        expect(result.end).toBe(16)

        // Simulate replacement
        const newLine = line.substring(0, result.start) + result.result + line.substring(result.end)
        expect(newLine).toBe('[[Life Interviewer]]')

        // Next line should remain unchanged
        expect(nextLine).toBe('This should not be deleted')
      }
    })
  })

  describe('Priority matching edge cases', () => {
    test('Should prioritize longer match over shorter match when cursor is outside main match', () => {
      // Edge case: files "2025-08" and "2025-08-09-Sat"
      // Line: "2025-08-09 test" with cursor on "test"
      // Should match "2025-08-09-Sat", not "2025-08"
      const files = [{ basename: '2025-08' }, { basename: '2025-08-09-Sat' }]
      const line = '2025-08-09 test'
      const cursorPos = 11 // Cursor on "test"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.result).toBe('[[2025-08-09-Sat]]')
        expect(result.start).toBe(0)
        expect(result.end).toBe(10) // Should include "2025-08-09"
      }
    })

    test('Should prioritize longer match when cursor is within main match', () => {
      // Same files but cursor within the date range
      const files = [{ basename: '2025-08' }, { basename: '2025-08-09-Sat' }]
      const line = '2025-08-09 test'
      const cursorPos = 5 // Cursor within "2025-08-09"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.result).toBe('[[2025-08-09-Sat]]')
        expect(result.start).toBe(0)
        expect(result.end).toBe(10) // Should include "2025-08-09"
      }
    })

    test('Should handle partial matches correctly with priority', () => {
      // Test with files that have partial matches
      const files = [{ basename: 'React' }, { basename: 'React Native' }]
      const line = 'React Native development'
      const cursorPos = 15 // Cursor on "development"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.result).toBe('[[React Native]]')
        expect(result.start).toBe(0)
        expect(result.end).toBe(12) // Should include "React Native"
      }
    })
  })

  describe('Filtering functionality', () => {
    describe('excludeNotes filtering', () => {
      test('Should exclude notes by basename', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: [],
          excludeNotes: ['Template', 'Daily Note Template'],
        })

        const testFiles: FileInfo[] = [
          { basename: 'My Note', path: 'My Note.md' },
          { basename: 'Template', path: 'Templates/Template.md' },
          { basename: 'Daily Note Template', path: 'Templates/Daily Note Template.md' },
          { basename: 'Project Notes', path: 'Projects/Project Notes.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles.map((f) => f.basename)).toEqual(['My Note', 'Project Notes'])
        expect(filteredFiles.map((f) => f.basename)).not.toContain('Template')
        expect(filteredFiles.map((f) => f.basename)).not.toContain('Daily Note Template')
      })

      test('Should handle empty excludeNotes array', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: [],
          excludeNotes: [],
        })

        const testFiles: FileInfo[] = [
          { basename: 'Note 1', path: 'Note 1.md' },
          { basename: 'Note 2', path: 'Note 2.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles).toEqual(testFiles)
      })

      test('Should handle case when excludeNotes is undefined', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
        } as Partial<SmartLinkSettings> as SmartLinkSettings)

        const testFiles: FileInfo[] = [
          { basename: 'Note 1', path: 'Note 1.md' },
          { basename: 'Note 2', path: 'Note 2.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles).toEqual(testFiles)
      })
    })

    describe('excludeDirectories filtering', () => {
      test('Should exclude files from specified directories', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: ['Templates', 'Archive/Old'],
          excludeNotes: [],
        })

        const testFiles: FileInfo[] = [
          { basename: 'My Note', path: 'My Note.md' },
          { basename: 'Template', path: 'Templates/Template.md' },
          { basename: 'Daily Template', path: 'Templates/Daily Template.md' },
          { basename: 'Old Note', path: 'Archive/Old/Old Note.md' },
          { basename: 'Current Note', path: 'Archive/Current Note.md' },
          { basename: 'Project Note', path: 'Projects/Project Note.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(3)
        expect(filteredFiles.map((f) => f.basename)).toEqual([
          'My Note',
          'Current Note',
          'Project Note',
        ])
        expect(filteredFiles.map((f) => f.basename)).not.toContain('Template')
        expect(filteredFiles.map((f) => f.basename)).not.toContain('Daily Template')
        expect(filteredFiles.map((f) => f.basename)).not.toContain('Old Note')
      })

      test('Should handle directories with trailing slash', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: ['Templates/'],
          excludeNotes: [],
        })

        const testFiles: FileInfo[] = [
          { basename: 'My Note', path: 'My Note.md' },
          { basename: 'Template', path: 'Templates/Template.md' },
          { basename: 'Nested Template', path: 'Templates/Nested/Template.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(1)
        expect(filteredFiles[0].basename).toBe('My Note')
      })

      test('Should handle exact directory matches', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: ['Templates'],
          excludeNotes: [],
        })

        const testFiles: FileInfo[] = [
          { basename: 'My Note', path: 'My Note.md' },
          { basename: 'Templates Note', path: 'Templates Note.md' }, // Not in Templates directory
          { basename: 'Template', path: 'Templates/Template.md' }, // In Templates directory
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles.map((f) => f.basename)).toContain('My Note')
        expect(filteredFiles.map((f) => f.basename)).toContain('Templates Note')
        expect(filteredFiles.map((f) => f.basename)).not.toContain('Template')
      })

      test('Should handle files without path', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: ['Templates'],
          excludeNotes: [],
        })

        const testFiles: FileInfo[] = [
          { basename: 'My Note' }, // No path property
          { basename: 'Template', path: 'Templates/Template.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(1)
        expect(filteredFiles[0].basename).toBe('My Note')
      })

      test('Should handle empty excludeDirectories array', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: [],
          excludeNotes: [],
        })

        const testFiles: FileInfo[] = [
          { basename: 'Note 1', path: 'Templates/Note 1.md' },
          { basename: 'Note 2', path: 'Archive/Note 2.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles).toEqual(testFiles)
      })

      test('Should handle case when excludeDirectories is undefined', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
        } as Partial<SmartLinkSettings> as SmartLinkSettings)

        const testFiles: FileInfo[] = [
          { basename: 'Note 1', path: 'Templates/Note 1.md' },
          { basename: 'Note 2', path: 'Archive/Note 2.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles).toEqual(testFiles)
      })
    })

    describe('Combined filtering', () => {
      test('Should apply both note and directory exclusions', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: ['Templates'],
          excludeNotes: ['Special Note'],
        })

        const testFiles: FileInfo[] = [
          { basename: 'My Note', path: 'My Note.md' },
          { basename: 'Special Note', path: 'Special Note.md' }, // Excluded by note name
          { basename: 'Template', path: 'Templates/Template.md' }, // Excluded by directory
          { basename: 'Project Note', path: 'Projects/Project Note.md' },
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles.map((f) => f.basename)).toEqual(['My Note', 'Project Note'])
      })

      test('Should handle priority when file is in both exclusion lists', () => {
        const smartLinkWithExcludes = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: ['Templates'],
          excludeNotes: ['Template'],
        })

        const testFiles: FileInfo[] = [
          { basename: 'My Note', path: 'My Note.md' },
          { basename: 'Template', path: 'Templates/Template.md' }, // Excluded by both
        ]

        const filteredFiles = smartLinkWithExcludes.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(1)
        expect(filteredFiles[0].basename).toBe('My Note')
      })
    })

    describe('excludeNotes regex support', () => {
      test('Should support regex patterns for exclude notes', () => {
        const smartLinkWithRegex = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: [],
          excludeNotes: ['^Draft.*', '.*Template$', 'Test\\d+'],
        })

        const testFiles: FileInfo[] = [
          { basename: 'Draft Note', path: 'Draft Note.md' },
          { basename: 'Draft Meeting', path: 'Draft Meeting.md' },
          { basename: 'Daily Template', path: 'Daily Template.md' },
          { basename: 'Meeting Template', path: 'Meeting Template.md' },
          { basename: 'Test1', path: 'Test1.md' },
          { basename: 'Test123', path: 'Test123.md' },
          { basename: 'My Note', path: 'My Note.md' },
          { basename: 'TestNote', path: 'TestNote.md' }, // Should not be excluded
          { basename: 'Template Draft', path: 'Template Draft.md' }, // Should not be excluded
        ]

        const filteredFiles = smartLinkWithRegex.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(3)
        expect(filteredFiles.map((f) => f.basename)).toEqual([
          'My Note',
          'TestNote',
          'Template Draft',
        ])
      })

      test('Should fall back to exact match for invalid regex', () => {
        const smartLinkWithInvalidRegex = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: [],
          excludeNotes: ['[invalid regex', 'My Note'], // Invalid regex + exact match
        })

        const testFiles: FileInfo[] = [
          { basename: 'My Note', path: 'My Note.md' }, // Excluded by exact match
          { basename: '[invalid regex', path: '[invalid regex.md' }, // Excluded by exact match fallback
          { basename: 'Other Note', path: 'Other Note.md' },
        ]

        const filteredFiles = smartLinkWithInvalidRegex.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(1)
        expect(filteredFiles[0].basename).toBe('Other Note')
      })

      test('Should handle case-sensitive regex patterns', () => {
        const smartLinkCaseSensitive = new SmartLinkCore({
          caseSensitive: true, // This doesn't affect regex filtering, just matching
          excludeDirectories: [],
          excludeNotes: ['^draft.*'], // lowercase pattern
        })

        const testFiles: FileInfo[] = [
          { basename: 'draft note', path: 'draft note.md' }, // Should be excluded
          { basename: 'Draft Note', path: 'Draft Note.md' }, // Should NOT be excluded (capital D)
          { basename: 'my note', path: 'my note.md' },
        ]

        const filteredFiles = smartLinkCaseSensitive.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles.map((f) => f.basename)).toEqual(['Draft Note', 'my note'])
      })

      test('Should support complex regex patterns', () => {
        const smartLinkComplex = new SmartLinkCore({
          caseSensitive: false,
          excludeDirectories: [],
          excludeNotes: [
            '\\d{4}-\\d{2}-\\d{2}', // Date pattern
            '(TODO|DONE|PENDING)', // Status patterns
            '^_.*', // Files starting with underscore
          ],
        })

        const testFiles: FileInfo[] = [
          { basename: '2024-01-15', path: '2024-01-15.md' },
          { basename: '2024-12-31', path: '2024-12-31.md' },
          { basename: 'TODO List', path: 'TODO List.md' },
          { basename: 'DONE Items', path: 'DONE Items.md' },
          { basename: 'PENDING Review', path: 'PENDING Review.md' },
          { basename: '_private', path: '_private.md' },
          { basename: '_hidden', path: '_hidden.md' },
          { basename: 'Regular Note', path: 'Regular Note.md' },
          { basename: 'Not a date 2024', path: 'Not a date 2024.md' }, // Should not match date pattern
        ]

        const filteredFiles = smartLinkComplex.filterFiles(testFiles)

        expect(filteredFiles).toHaveLength(2)
        expect(filteredFiles.map((f) => f.basename)).toEqual(['Regular Note', 'Not a date 2024'])
      })
    })
  })
})
