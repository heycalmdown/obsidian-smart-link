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

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[쌀떡이]]를 먹었다')
    })

    test('Korean particles: 서울특별시에서 -> [[서울특별시]]에서', () => {
      files = [{ basename: '서울특별시' }]
      const line = '서울특별시에서 만났다'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[서울특별시]]에서 만났다')
    })

    test('Korean particles: 인공지능이 -> [[인공지능]]이', () => {
      files = [{ basename: '인공지능' }]
      const line = '인공지능이 발전하고 있다'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[인공지능]]이 발전하고 있다')
    })

    test('Korean particles with mixed languages: Claude Code가 -> [[Claude Code]]가', () => {
      files = [{ basename: 'Claude Code' }]
      const line = 'claude code가 좋다'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Claude Code]]가 좋다')
    })
  })

  describe('Priority matching', () => {
    test('Should prefer longer matches: "2022 FIFA World Cup" over "World Cup"', () => {
      files = [{ basename: 'World Cup' }, { basename: '2022 FIFA World Cup' }]
      const line = 'The 2022 FIFA World Cup was held in Qatar'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('The [[2022 FIFA World Cup]] was held in Qatar')
    })

    test('Korean priority matching: "생성형 인공지능" over "인공지능"', () => {
      files = [{ basename: '인공지능' }, { basename: '생성형 인공지능' }]
      const line = '생성형 인공지능이 화제다'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[생성형 인공지능]]이 화제다')
    })

    test('Should prefer more exact prefix match: "2025-08-10-Sun" over "2022-03-08 Tech Report" for "2025-08-10"', () => {
      files = [
        { basename: '2025-08' },
        { basename: '2022-03-08 Tech Report' },
        { basename: '2025-08-10-Sun' },
      ]
      const line = '2025-08-10 test'

      const result = smartLink.processAllSmartLinks(line, files)

      // processAllSmartLinks should find the longest matching prefix
      // "2025-08-10-Sun" matches with 10 chars, better than "2025-08" with 7 chars
      expect(result).toBe('[[2025-08-10-Sun]] test')
    })
  })

  describe('Basic matching', () => {
    test('Should match basic English text', () => {
      files = [{ basename: 'Project Management' }]
      const line = 'I need to improve my project management skills'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I need to improve my [[Project Management]] skills')
    })

    test('Should handle text with brackets', () => {
      files = [{ basename: 'React' }]
      const line = 'I love [React] framework'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I love [[[React]]] framework')
    })

    test('Should handle multiple words', () => {
      files = [{ basename: 'Visual Studio Code' }]
      const line = 'I use Visual Studio Code for development'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I use [[Visual Studio Code]] for development')
    })
  })

  describe('Edge cases', () => {
    test('Should return unchanged line when no files match', () => {
      files = [{ basename: 'JavaScript' }]
      const line = 'I love Python'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I love Python')
    })

    test('Should return empty string for empty line', () => {
      files = [{ basename: 'Test' }]
      const line = ''

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('')
    })

    test('Should handle text at line boundaries', () => {
      files = [{ basename: 'Hello' }, { basename: 'world' }]
      const line = 'Hello world'

      const result = smartLink.processAllSmartLinks(line, files)
      expect(result).toBe('[[Hello]] [[world]]')
    })
  })

  describe('Case sensitivity', () => {
    test('Should match case-insensitively by default', () => {
      files = [{ basename: 'JavaScript' }]
      const line = 'I love javascript'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I love [[JavaScript]]')
    })

    test('Should match case-sensitively when enabled', () => {
      smartLink = new SmartLinkCore({
        caseSensitive: true,
        excludeDirectories: [],
        excludeNotes: [],
      })
      files = [{ basename: 'JavaScript' }]

      // Should not match different case
      const result1 = smartLink.processAllSmartLinks('I love javascript', files)
      expect(result1).toBe('I love javascript')

      // Should match exact case
      const result2 = smartLink.processAllSmartLinks('I love JavaScript', files)
      expect(result2).toBe('I love [[JavaScript]]')
    })
  })

  describe('Bug fix: multiline boundary handling', () => {
    test('Should not delete lines after partial match', () => {
      const files = [{ basename: 'Life Interviewer' }]
      const line = 'life interview'
      const result = smartLink.processAllSmartLinks(line, files)

      // processAllSmartLinks creates links for prefix matches too
      // "life interview" is a prefix of "Life Interviewer"
      expect(result).toBe('[[Life Interviewer]]')
    })

    test('Should not delete lines after exact match', () => {
      const files = [{ basename: 'Life Interviewer' }]
      const line = 'life interviewer'
      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Life Interviewer]]')
    })

    test('Should handle text with suffix correctly', () => {
      const files = [{ basename: 'Life Interviewer' }]
      const line = 'Life Interviewer 파일'
      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Life Interviewer]] 파일')
    })

    test('Should preserve text boundaries correctly', () => {
      const files = [{ basename: 'Life Interviewer' }]
      const line = 'life interviewer'
      const nextLine = 'This should not be deleted'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Life Interviewer]]')

      // Next line should remain unchanged
      expect(nextLine).toBe('This should not be deleted')
    })
  })

  describe('Priority matching edge cases', () => {
    test('Should prioritize longer match over shorter match', () => {
      // Edge case: files "2025-08" and "2025-08-09-Sat"
      // Line: "2025-08-09 test"
      // processAllSmartLinks should find the longest matching prefix
      const files = [{ basename: '2025-08' }, { basename: '2025-08-09-Sat' }]
      const line = '2025-08-09 test'

      const result = smartLink.processAllSmartLinks(line, files)

      // "2025-08-09-Sat" has the longest matching prefix (10 chars vs 7 chars)
      expect(result).toBe('[[2025-08-09-Sat]] test')
    })

    test('Should match exact text when available', () => {
      // Test with exact match in text
      const files = [{ basename: '2025-08-Month' }, { basename: '2025-08-09-Sat' }]
      const line = '2025-08-Month was a good month'

      const result = smartLink.processAllSmartLinks(line, files)

      // "2025-08-Month" matches exactly in the text
      expect(result).toBe('[[2025-08-Month]] was a good month')
    })

    test('Should handle partial matches correctly with priority', () => {
      // Test with files that have partial matches
      const files = [{ basename: 'React' }, { basename: 'React Native' }]
      const line = 'React Native development'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[React Native]] development')
    })
  })

  describe('Partial word prefix matching', () => {
    test('Should link "Lambda Throttl" to "[[Lambda Throttling]]" not "[[Lambda]] Throttl"', () => {
      files = [{ basename: 'Lambda' }, { basename: 'Lambda Throttling' }]
      const line = 'Lambda Throttl'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Lambda Throttling]]')
    })

    test('Should handle multiple partial matches correctly', () => {
      files = [
        { basename: 'React' },
        { basename: 'React Native' },
        { basename: 'React Native Development' },
      ]
      const line = 'React Native Dev'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[React Native Development]]')
    })

    test('Should prefer longer match for incomplete words', () => {
      files = [
        { basename: 'JavaScript' },
        { basename: 'JavaScript Engine' },
        { basename: 'JavaScript Engine Optimization' },
      ]
      const line = 'JavaScript Engine Opt'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[JavaScript Engine Optimization]]')
    })

    test('Should handle partial word at end of longer note name', () => {
      files = [{ basename: 'Cloud' }, { basename: 'Cloud Computing' }]
      const line = 'Cloud Comp'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Cloud Computing]]')
    })
  })

  describe('Gap Detection - Large semantic gaps between input and matched notes', () => {
    test('Should NOT match "New York Times Company Report 2023" for input "new york"', () => {
      files = [{ basename: 'New York Times Company Report 2023' }]
      const line = 'visiting new york next week'

      const result = smartLink.processAllSmartLinks(line, files)

      // Should NOT create a link because the semantic gap is too large
      expect(result).toBe('visiting new york next week')
    })

    test('Should NOT match "book_review_template_draft" for input "book review"', () => {
      files = [{ basename: 'book_review_template_draft' }]
      const line = 'writing a book review today'

      const result = smartLink.processAllSmartLinks(line, files)

      // Should NOT create a link because the semantic gap is too large
      expect(result).toBe('writing a book review today')
    })

    test('Should match "2022 World Cup" when full phrase is input', () => {
      files = [
        { basename: '2022' },
        { basename: 'World Cup' },
        { basename: '2022 World Cup' },
        { basename: 'World' },
      ]
      const line = 'The 2022 World Cup was exciting'

      const result = smartLink.processAllSmartLinks(line, files)

      // Should prefer the exact full match
      expect(result).toBe('The [[2022 World Cup]] was exciting')
    })

    test('Should match "2022" when only "2022" is input (not "2022 World Cup")', () => {
      files = [{ basename: '2022' }, { basename: '2022 World Cup' }]
      const line = '2022 was a great year'

      const result = smartLink.processAllSmartLinks(line, files)

      // Should match only "2022", not the longer "2022 World Cup"
      expect(result).toBe('[[2022]] was a great year')
    })

    test('Should match "york" for input "new-york" if exact "york" note exists', () => {
      files = [{ basename: 'york' }, { basename: 'New York Times Company Report 2023' }]
      const line = 'new-york trip'

      const result = smartLink.processAllSmartLinks(line, files)

      // Should match "york" which is a reasonable semantic match
      expect(result).toBe('new-[[york]] trip')
    })

    test('Should match "book" for input "book review" if "book" note exists', () => {
      files = [{ basename: 'book' }, { basename: 'book_review_template_draft' }]
      const line = 'book review article'

      const result = smartLink.processAllSmartLinks(line, files)

      // Should match "book" which is a reasonable semantic match
      expect(result).toBe('[[book]] review article')
    })

    test('Should handle compound words with hyphens appropriately', () => {
      files = [{ basename: 'new-york' }, { basename: 'New York Times Company Report 2023' }]
      const line = 'new-york trip'

      const result = smartLink.processAllSmartLinks(line, files)

      // Should match the exact "new-york" note
      expect(result).toBe('[[new-york]] trip')
    })

    test('Should handle underscores in note names appropriately', () => {
      files = [{ basename: 'meeting_notes' }, { basename: 'meeting_notes_template_2023' }]
      const line = 'meeting notes summary'

      const result = smartLink.processAllSmartLinks(line, files)

      // Should match "meeting_notes" through fuzzy matching (underscore normalization)
      expect(result).toBe('[[meeting_notes]] summary')
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
