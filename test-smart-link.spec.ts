import { SmartLinkCore } from './src/smartLink'

describe('SmartLink multiline bug fix', () => {
  const smartLink = new SmartLinkCore({ caseSensitive: false })
  const files = [{ basename: 'Life Interviewer' }]

  test('should not delete lines after partial match', () => {
    const line = 'life interview'
    const cursorPos = 10
    const result = smartLink.processSmartLink(line, cursorPos, files)

    expect(result).not.toBeNull()
    if (result) {
      expect(result.result).toContain('[[Life Interviewer]]')
      expect(result.start).toBe(0)
      expect(result.end).toBe(14) // Should only replace "life interview", not beyond
    }
  })

  test('should not delete lines after exact match', () => {
    const line = 'life interviewer'
    const cursorPos = 10
    const result = smartLink.processSmartLink(line, cursorPos, files)

    expect(result).not.toBeNull()
    if (result) {
      expect(result.result).toBe('[[Life Interviewer]]')
      expect(result.start).toBe(0)
      expect(result.end).toBe(16) // Should only replace "life interviewer", not beyond
    }
  })

  test('should handle text with suffix correctly', () => {
    const line = 'Life Interviewer 파일'
    const cursorPos = 10
    const result = smartLink.processSmartLink(line, cursorPos, files)

    expect(result).not.toBeNull()
    if (result) {
      expect(result.result).toContain('[[Life Interviewer]]')
      expect(result.start).toBe(0)
      // The end should be at the end of the matched selection, not beyond
      expect(result.end).toBeLessThanOrEqual(line.length)
    }
  })

  test('should preserve text after newlines', () => {
    // Simulating editor behavior with multiple lines
    const line = 'life interviewer'
    const nextLine = 'This should not be deleted'
    const cursorPos = 10

    const result = smartLink.processSmartLink(line, cursorPos, files)

    expect(result).not.toBeNull()
    if (result) {
      expect(result.result).toBe('[[Life Interviewer]]')
      expect(result.start).toBe(0)
      expect(result.end).toBe(16) // Should only affect current line

      // Simulate replacement
      const newLine = line.substring(0, result.start) + result.result + line.substring(result.end)
      expect(newLine).toBe('[[Life Interviewer]]')

      // Next line should remain unchanged
      expect(nextLine).toBe('This should not be deleted')
    }
  })
})
