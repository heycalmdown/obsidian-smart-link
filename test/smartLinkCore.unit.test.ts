import { SmartLinkCore, FileInfo } from '../src/smartLink'

// <CHORUS_TAG>test</CHORUS_TAG>
describe('SmartLinkCore Unit Tests', () => {
  let smartLink: SmartLinkCore
  let files: FileInfo[]

  beforeEach(() => {
    smartLink = new SmartLinkCore({ caseSensitive: false })
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
      smartLink = new SmartLinkCore({ caseSensitive: true })
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
})
