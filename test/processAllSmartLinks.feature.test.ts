import { SmartLinkCore, FileInfo } from '../src/smartLink'

// <CHORUS_TAG>test</CHORUS_TAG>
describe('ProcessAllSmartLinks Feature Tests', () => {
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

  describe('Basic functionality', () => {
    test('Should create multiple smart links in a single line', () => {
      files = [{ basename: 'React' }, { basename: 'JavaScript' }]
      const line = 'I love React and JavaScript programming'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I love [[React]] and [[JavaScript]] programming')
    })

    test('Korean: Should handle multiple links with particles', () => {
      files = [{ basename: '인공지능' }, { basename: '머신러닝' }]
      const line = '인공지능과 머신러닝을 공부한다'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[인공지능]]과 [[머신러닝]]을 공부한다')
    })

    test('Should handle mixed English and Korean', () => {
      files = [{ basename: 'Claude Code' }, { basename: '인공지능' }]
      const line = 'Claude Code는 인공지능이다'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Claude Code]]는 [[인공지능]]이다')
    })
  })

  describe('Priority and matching', () => {
    test('Should prioritize longer matches over shorter ones', () => {
      files = [{ basename: 'World Cup' }, { basename: '2022 FIFA World Cup' }]
      const line = 'The 2022 FIFA World Cup was amazing'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('The [[2022 FIFA World Cup]] was amazing')
    })

    test('Should handle overlapping potential matches correctly', () => {
      files = [{ basename: 'Visual Studio' }, { basename: 'Visual Studio Code' }]
      const line = 'I use Visual Studio Code for development'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I use [[Visual Studio Code]] for development')
    })

    test('Should handle consecutive matches', () => {
      files = [{ basename: 'Node' }, { basename: 'Express' }]
      const line = 'Node Express framework'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Node]] [[Express]] framework')
    })
  })

  describe('Existing links handling', () => {
    test('Should skip existing wiki links', () => {
      files = [{ basename: 'React' }, { basename: 'JavaScript' }]
      const line = 'I love [[React]] and JavaScript programming'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I love [[React]] and [[JavaScript]] programming')
    })

    test('Should handle multiple existing links', () => {
      files = [{ basename: 'Vue' }]
      const line = 'I use [[React]] and [[Angular]] but not Vue'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I use [[React]] and [[Angular]] but not [[Vue]]')
    })
  })

  describe('Punctuation and formatting', () => {
    test('Should handle punctuation correctly', () => {
      files = [{ basename: 'React' }, { basename: 'Vue' }]
      const line = 'React, Vue, and others are great!'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[React]], [[Vue]], and others are great!')
    })

    test('Should handle special characters', () => {
      files = [{ basename: 'React' }, { basename: 'JavaScript' }, { basename: 'TypeScript' }]
      const line = 'React & JavaScript @ TypeScript!'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[React]] & [[JavaScript]] @ [[TypeScript]]!')
    })
  })

  describe('Korean advanced features', () => {
    test('Korean: Should handle complex sentence with multiple particles', () => {
      files = [{ basename: '서울' }, { basename: '부산' }, { basename: '대구' }]
      const line = '서울에서 부산으로 대구를 거쳐서'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[서울]]에서 [[부산]]으로 [[대구]]를 거쳐서')
    })

    test('Korean: Should handle various particles and endings', () => {
      files = [{ basename: '프로그래밍' }, { basename: '개발자' }, { basename: '코딩' }]
      const line = '프로그래밍을 배우는 개발자가 코딩을 연습한다'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[프로그래밍]]을 배우는 [[개발자]]가 [[코딩]]을 연습한다')
    })
  })

  describe('Edge cases', () => {
    test('Should handle empty line', () => {
      files = [{ basename: 'Test' }]
      const line = ''

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('')
    })

    test('Should handle line with no matches', () => {
      files = [{ basename: 'Python' }]
      const line = 'I love programming with various tools'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('I love programming with various tools')
    })

    test('Should handle malformed existing links gracefully', () => {
      files = [{ basename: 'JavaScript' }]
      const line = 'I love [[React and JavaScript programming'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toContain('[[JavaScript]]')
    })

    test('Should not link text within backticks', () => {
      files = [{ basename: 'React' }, { basename: 'JavaScript' }]
      const line = 'Use `React.createElement()` in JavaScript'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('Use `React.createElement()` in [[JavaScript]]')
    })

    test('Should handle multiple backtick sections', () => {
      files = [{ basename: 'function' }, { basename: 'variable' }]
      const line = 'The `function` keyword and `variable` declaration in JavaScript'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('The `function` keyword and `variable` declaration in JavaScript')
    })

    test('Should link text outside backticks but not inside', () => {
      files = [{ basename: 'Python' }]
      const line = 'Python is great. Use `python --version` to check Python version'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[Python]] is great. Use `python --version` to check [[Python]] version')
    })

    test('Korean: Should not link text within backticks', () => {
      files = [{ basename: '함수' }, { basename: '변수' }]
      const line = '`함수`와 변수를 선언한다'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('`함수`와 [[변수]]를 선언한다')
    })

    test('Should not link within existing wiki links', () => {
      files = [{ basename: 'React' }]
      const line = 'This [[React]] is already linked'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('This [[React]] is already linked')
    })
  })

  describe('Performance scenarios', () => {
    test('Should handle many potential matches efficiently', () => {
      files = [
        { basename: 'React' },
        { basename: 'Vue' },
        { basename: 'Angular' },
        { basename: 'TypeScript' },
        { basename: 'JavaScript' },
      ]
      const line = 'Modern web development uses React, Vue, Angular with TypeScript and JavaScript'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe(
        'Modern web development uses [[React]], [[Vue]], [[Angular]] with [[TypeScript]] and [[JavaScript]]'
      )
    })

    test('Should handle repeated terms correctly', () => {
      files = [{ basename: 'test' }]
      const line = 'test testing test again'

      const result = smartLink.processAllSmartLinks(line, files)

      expect(result).toBe('[[test]] testing [[test]] again')
    })
  })
})
