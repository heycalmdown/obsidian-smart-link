import { SmartLinkCore, FileInfo } from '../src/smartLink'

describe('SmartLink Korean Agglutinative Language Tests', () => {
  let smartLink: SmartLinkCore
  let files: FileInfo[]

  beforeEach(() => {
    smartLink = new SmartLinkCore({ caseSensitive: false })
    files = []
  })

  describe('Korean particle handling', () => {
    test('쌀떡이를 -> [[쌀떡이]]를', () => {
      files = [{ basename: '쌀떡이' }]
      const line = '쌀떡이를 먹었다'
      const cursorPos = 3 // cursor on "쌀떡이를"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[쌀떡이]]를')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(4) // "쌀떡이를" ends at index 4
    })

    test('서울특별시에서 -> [[서울특별시]]에서', () => {
      files = [{ basename: '서울특별시' }]
      const line = '서울특별시에서 만났다'
      const cursorPos = 5 // cursor on "서울특별시에서"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[서울특별시]]에서')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(7)
    })

    test('대한민국의 -> [[대한민국]]의', () => {
      files = [{ basename: '대한민국' }]
      const line = '대한민국의 수도는 서울이다'
      const cursorPos = 3 // cursor on "대한민국의"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[대한민국]]의')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(5)
    })

    test('인공지능이 -> [[인공지능]]이', () => {
      files = [{ basename: '인공지능' }]
      const line = '인공지능이 발전하고 있다'
      const cursorPos = 3 // cursor on "인공지능이"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[인공지능]]이')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(5)
    })
  })

  describe('Longer match priority', () => {
    test("Should prefer '2022 FIFA World Cup' over 'World Cup'", () => {
      files = [{ basename: 'World Cup' }, { basename: '2022 FIFA World Cup' }]
      const line = 'The 2022 FIFA World Cup was held in Qatar'
      const cursorPos = 20 // cursor on "World Cup"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[2022 FIFA World Cup]] was')
      expect(result?.start).toBe(4)
      expect(result?.end).toBe(27)
    })

    test("Should prefer '생성형 인공지능' over '인공지능'", () => {
      files = [{ basename: '인공지능' }, { basename: '생성형 인공지능' }]
      const line = '생성형 인공지능이 화제다'
      const cursorPos = 6 // cursor on "인공지능"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[생성형 인공지능]]이')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(9)
    })

    test("Should prefer '2002 월드컵' over '월드컵'", () => {
      files = [{ basename: '월드컵' }, { basename: '2002 월드컵' }]
      const line = '2002 월드컵에서 대한민국은'
      const cursorPos = 7 // cursor on "월드컵"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[2002 월드컵]]에서')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(10)
    })
  })

  describe('English examples', () => {
    test('project management -> [[Project Management]]', () => {
      files = [{ basename: 'Project Management' }]
      const line = 'I need to improve my project management skills'
      const cursorPos = 30 // cursor on "project management"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Project Management]]')
      expect(result?.start).toBe(21)
      expect(result?.end).toBe(39)
    })

    test('Should handle text with existing brackets', () => {
      files = [{ basename: 'React' }]
      const line = 'I love [React] framework'
      const cursorPos = 10 // cursor on "React"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[React]]')
      expect(result?.start).toBe(8)
      expect(result?.end).toBe(13)
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

    test('Should handle cursor at line start', () => {
      files = [{ basename: 'Hello' }]
      const line = 'Hello world'
      const cursorPos = 0

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Hello]]')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(5)
    })

    test('Should handle cursor at line end', () => {
      files = [{ basename: 'world' }]
      const line = 'Hello world'
      const cursorPos = 11

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[world]]')
      expect(result?.start).toBe(6)
      expect(result?.end).toBe(11)
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

    test('Should match "Claude Code" when text is "claude code가"', () => {
      files = [{ basename: 'Claude Code' }]
      const line = 'claude code가 좋다'
      const cursorPos = 5 // cursor on "code"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Claude Code]]가')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(12)
    })

    test('Bug: Should prefer "Claude Code" over "Claude.ai" when cursor on "claude" in "claude code가"', () => {
      files = [{ basename: 'Claude.ai' }, { basename: 'Claude Code' }]
      const line = 'claude code가 좋다'
      const cursorPos = 3 // cursor on "claude"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Claude Code]]가')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(12)
    })

    test('Bug: Should match "Claude Code" when cursor on "code" in "claude code가"', () => {
      files = [{ basename: 'Claude.ai' }, { basename: 'Claude Code' }]
      const line = 'claude code가 좋다'
      const cursorPos = 9 // cursor on "code"

      const result = smartLink.processSmartLink(line, cursorPos, files)
      // When cursor is on "code", it should find "Claude Code"
      // and only replace "claude code", not including "가 좋다"
      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Claude Code]]가')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(12)
    })

    test('Should match case-sensitively when enabled', () => {
      smartLink = new SmartLinkCore({ caseSensitive: true })
      files = [{ basename: 'JavaScript' }]
      const line = 'I love javascript'
      const cursorPos = 10

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).toBeNull()
    })

    test('Should match exact case when case-sensitive', () => {
      smartLink = new SmartLinkCore({ caseSensitive: true })
      files = [{ basename: 'JavaScript' }]
      const line = 'I love JavaScript'
      const cursorPos = 10

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[JavaScript]]')
    })
  })

  describe('Multiple word matching', () => {
    test('Should match multiple words', () => {
      files = [{ basename: 'Visual Studio Code' }]
      const line = 'I use Visual Studio Code for development'
      const cursorPos = 15 // cursor on "Studio"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[Visual Studio Code]]')
      expect(result?.start).toBe(6)
      expect(result?.end).toBe(24)
    })

    test('Should match Korean multiple words', () => {
      files = [{ basename: '대한민국 서울특별시' }]
      const line = '대한민국 서울특별시에 살고 있다'
      const cursorPos = 10 // cursor on "서울특별시"

      const result = smartLink.processSmartLink(line, cursorPos, files)

      expect(result).not.toBeNull()
      expect(result?.result).toBe('[[대한민국 서울특별시]]에')
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(11)
    })
  })
})
