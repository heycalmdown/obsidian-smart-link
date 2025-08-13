export interface SmartLinkSettings {
  caseSensitive: boolean
  excludeDirectories: string[]
  excludeNotes: string[]
}

export interface FileInfo {
  basename: string
  path?: string
}

interface MatchResult {
  file: FileInfo
  start: number
  end: number
  matchType: 'exact' | 'prefix'
  matchLength: number
}

interface ProcessedRegion {
  start: number
  end: number
  replacement: string
}

// Constants for configuration
const CONSTANTS = {
  // Minimum length for meaningful prefix matches
  MIN_PREFIX_LENGTH: 3,
  // Maximum length for grammatical suffixes
  MAX_SUFFIX_LENGTH: 3,
} as const

export class SmartLinkCore {
  private settings: SmartLinkSettings

  constructor(
    settings: SmartLinkSettings = {
      caseSensitive: false,
      excludeDirectories: [],
      excludeNotes: [],
    }
  ) {
    this.settings = settings
  }

  filterFiles(files: FileInfo[]): FileInfo[] {
    return files.filter((file) => {
      if (this.isExcludedNote(file.basename)) {
        return false
      }

      if (file.path && this.isInExcludedDirectory(file.path)) {
        return false
      }

      return true
    })
  }

  private isExcludedNote(basename: string): boolean {
    if (!this.settings.excludeNotes?.length) {
      return false
    }

    return this.settings.excludeNotes.some((pattern) => {
      try {
        const regex = new RegExp(pattern)
        return regex.test(basename)
      } catch {
        return pattern === basename
      }
    })
  }

  private isInExcludedDirectory(filePath: string): boolean {
    if (!this.settings.excludeDirectories?.length) {
      return false
    }

    return this.settings.excludeDirectories.some((excludeDir) => {
      const normalizedExcludeDir = excludeDir.endsWith('/') ? excludeDir : excludeDir + '/'
      return filePath.startsWith(normalizedExcludeDir) || filePath === excludeDir
    })
  }

  findBestMatch(text: string, files: FileInfo[]): string | null {
    const fileNames = files.map((f) => f.basename)
    const searchText = this.normalizeCase(text)

    const sortedFileNames = [...fileNames].sort((a, b) => b.length - a.length)

    let bestMatch: string | null = null
    let bestMatchLength = 0
    let bestMatchPosition = -1

    for (const fileName of sortedFileNames) {
      const compareFileName = this.normalizeCase(fileName)

      // Check exact substring match
      const exactMatch = this.findExactMatch(searchText, compareFileName)
      if (exactMatch && this.isBetterMatch(exactMatch, bestMatchLength, bestMatchPosition)) {
        bestMatch = fileName
        bestMatchLength = exactMatch.length
        bestMatchPosition = exactMatch.position
        continue
      }

      // Check prefix match
      const prefixMatch = this.findPrefixMatch(searchText, compareFileName)
      if (prefixMatch && this.isBetterMatch(prefixMatch, bestMatchLength, bestMatchPosition)) {
        bestMatch = fileName
        bestMatchLength = prefixMatch.length
        bestMatchPosition = prefixMatch.position
        continue
      }

      // Check fuzzy match
      if (!this.settings.caseSensitive && this.fuzzyMatch(compareFileName, searchText)) {
        const matchLength = Math.min(compareFileName.length, searchText.length)
        if (matchLength > bestMatchLength) {
          bestMatch = fileName
          bestMatchLength = matchLength
          bestMatchPosition = 0
        }
      }
    }

    return bestMatch
  }

  private normalizeCase(text: string): string {
    return this.settings.caseSensitive ? text : text.toLowerCase()
  }

  private findExactMatch(
    searchText: string,
    fileName: string
  ): { length: number; position: number } | null {
    const matchIndex = searchText.indexOf(fileName)
    if (matchIndex !== -1) {
      return { length: fileName.length, position: matchIndex }
    }
    return null
  }

  private findPrefixMatch(
    searchText: string,
    fileName: string
  ): { length: number; position: number } | null {
    // Check if search text contains a prefix of the file name
    for (
      let prefixLength = Math.min(fileName.length, searchText.length);
      prefixLength >= CONSTANTS.MIN_PREFIX_LENGTH;
      prefixLength--
    ) {
      const filePrefix = fileName.substring(0, prefixLength)
      const textPrefix = searchText.substring(0, prefixLength)

      if (filePrefix === textPrefix) {
        return { length: prefixLength, position: 0 }
      }
    }

    // Check if file name starts with search text
    if (fileName.startsWith(searchText)) {
      return { length: searchText.length, position: 0 }
    }

    // Check if search text starts with file name
    if (searchText.startsWith(fileName)) {
      return { length: fileName.length, position: 0 }
    }

    return null
  }

  private isBetterMatch(
    match: { length: number; position: number },
    currentBestLength: number,
    currentBestPosition: number
  ): boolean {
    return (
      match.length > currentBestLength ||
      (match.length === currentBestLength && match.position < currentBestPosition)
    )
  }

  private fuzzyMatch(fileName: string, searchText: string): boolean {
    const normalizedFileName = this.normalizeTextForFuzzy(fileName)
    const normalizedSearch = this.normalizeTextForFuzzy(searchText)
    return normalizedFileName === normalizedSearch
  }

  private normalizeTextForFuzzy(text: string): string {
    return text
      .replace(/[\s-_]/g, '')
      .toLowerCase()
      .trim()
  }

  createLinkText(originalText: string, matchedFileName: string): string {
    const searchText = this.normalizeCase(originalText)
    const compareFileName = this.normalizeCase(matchedFileName)

    // Check if the file name appears in the search text
    const matchIndex = searchText.indexOf(compareFileName)
    if (matchIndex !== -1) {
      return this.createLinkWithContext(originalText, matchedFileName, matchIndex)
    }

    // Check partial matches
    if (compareFileName.startsWith(searchText)) {
      return `[[${matchedFileName}]]`
    }

    if (searchText.startsWith(compareFileName)) {
      const afterMatch = this.extractSuffix(originalText.substring(compareFileName.length))
      return `[[${matchedFileName}]]${afterMatch}`
    }

    // Try fuzzy match
    const fuzzyLink = this.createFuzzyLink(
      originalText,
      matchedFileName,
      searchText,
      compareFileName
    )
    if (fuzzyLink) {
      return fuzzyLink
    }

    return `[[${matchedFileName}]]`
  }

  private createLinkWithContext(
    originalText: string,
    matchedFileName: string,
    matchIndex: number
  ): string {
    const compareFileName = this.normalizeCase(matchedFileName)
    const beforeMatch = originalText.substring(0, matchIndex)
    const afterMatchText = originalText.substring(matchIndex + compareFileName.length)
    const afterMatch = this.extractSuffix(afterMatchText)

    return `${beforeMatch}[[${matchedFileName}]]${afterMatch}`
  }

  private createFuzzyLink(
    originalText: string,
    matchedFileName: string,
    searchText: string,
    compareFileName: string
  ): string | null {
    for (let startPos = 0; startPos <= searchText.length - 1; startPos++) {
      for (let endPos = startPos + 1; endPos <= searchText.length; endPos++) {
        const substring = searchText.substring(startPos, endPos)
        if (this.fuzzyMatch(compareFileName, substring)) {
          const beforeMatch = originalText.substring(0, startPos)
          const afterMatchText = originalText.substring(endPos)
          const afterMatch = this.extractSuffix(afterMatchText)

          return `${beforeMatch}[[${matchedFileName}]]${afterMatch}`
        }
      }
    }
    return null
  }

  private extractSuffix(text: string): string {
    if (!text.length) return ''

    // Check for space + short word pattern
    const spaceAndWordMatch = text.match(/^(\s+\w{1,3})(?=\s|$)/)
    if (spaceAndWordMatch) {
      return spaceAndWordMatch[1]
    }

    // Check for short suffix without space
    const shortSuffixMatch = text.match(/^([^\s]{1,3})(?=\s|$)/)
    if (shortSuffixMatch) {
      return shortSuffixMatch[1]
    }

    return ''
  }

  processAllSmartLinks(line: string, files: FileInfo[]): string {
    const processedRegions: ProcessedRegion[] = []
    const sortedFiles = [...files].sort((a, b) => b.basename.length - a.basename.length)
    const searchText = this.normalizeCase(line)

    for (let pos = 0; pos < searchText.length; pos++) {
      if (this.isPositionProcessed(pos, processedRegions)) continue
      if (this.isInsideWikiLink(line, pos)) continue

      const bestMatch = this.findBestMatchAtPosition(line, pos, sortedFiles, searchText)
      if (!bestMatch) continue

      const linkText = this.createLinkForMatch(line, bestMatch)
      const replaceEnd = this.calculateReplaceEnd(bestMatch, linkText)

      processedRegions.push({
        start: bestMatch.start,
        end: replaceEnd,
        replacement: linkText,
      })

      pos = replaceEnd - 1
    }

    return this.applyReplacements(line, processedRegions)
  }

  private isPositionProcessed(position: number, regions: ProcessedRegion[]): boolean {
    return regions.some((region) => position >= region.start && position < region.end)
  }

  private findBestMatchAtPosition(
    line: string,
    pos: number,
    files: FileInfo[],
    searchText: string
  ): MatchResult | null {
    let bestMatch: MatchResult | null = null

    for (const file of files) {
      const fileName = file.basename
      const compareFileName = this.normalizeCase(fileName)

      // Check exact match at position
      const exactMatch = this.checkExactMatchAtPosition(
        line,
        pos,
        file,
        searchText,
        compareFileName
      )
      if (exactMatch && (!bestMatch || exactMatch.matchLength > bestMatch.matchLength)) {
        bestMatch = exactMatch
      }

      // Check prefix match if no exact match for this file
      if (bestMatch?.file === file && bestMatch.matchType === 'exact') continue

      const prefixMatch = this.checkPrefixMatchAtPosition(
        line,
        pos,
        file,
        searchText,
        compareFileName
      )
      if (
        prefixMatch &&
        (!bestMatch ||
          (bestMatch.matchType === 'prefix' && prefixMatch.matchLength > bestMatch.matchLength))
      ) {
        bestMatch = prefixMatch
      }
    }

    return bestMatch
  }

  private checkExactMatchAtPosition(
    line: string,
    pos: number,
    file: FileInfo,
    searchText: string,
    compareFileName: string
  ): MatchResult | null {
    if (!searchText.substring(pos).startsWith(compareFileName)) {
      return null
    }

    const matchEnd = pos + compareFileName.length
    if (!this.isValidWordMatch(line, pos, matchEnd)) {
      return null
    }

    return {
      file,
      start: pos,
      end: matchEnd,
      matchType: 'exact',
      matchLength: compareFileName.length,
    }
  }

  private checkPrefixMatchAtPosition(
    line: string,
    pos: number,
    file: FileInfo,
    searchText: string,
    compareFileName: string
  ): MatchResult | null {
    const remainingText = searchText.substring(pos)

    for (
      let len = Math.min(compareFileName.length, remainingText.length);
      len >= CONSTANTS.MIN_PREFIX_LENGTH;
      len--
    ) {
      const textPart = remainingText.substring(0, len)
      const filePart = compareFileName.substring(0, len)

      if (textPart === filePart && this.isValidWordMatch(line, pos, pos + len)) {
        return {
          file,
          start: pos,
          end: pos + len,
          matchType: 'prefix',
          matchLength: len,
        }
      }
    }

    return null
  }

  private createLinkForMatch(line: string, match: MatchResult): string {
    const originalText = line.substring(match.start, match.end)

    if (match.matchType === 'exact') {
      return this.createLinkText(originalText, match.file.basename)
    }

    // For prefix matches
    let linkText = `[[${match.file.basename}]]`
    const suffix = this.extractSuffix(line.substring(match.end))
    if (suffix) {
      linkText += suffix
    }

    return linkText
  }

  private calculateReplaceEnd(match: MatchResult, linkText: string): number {
    if (match.matchType !== 'exact') {
      return match.end
    }

    const baseLinkLength = `[[${match.file.basename}]]`.length
    if (linkText.length > baseLinkLength) {
      const suffixLength = linkText.length - baseLinkLength
      return match.end + suffixLength
    }

    return match.end
  }

  private applyReplacements(line: string, regions: ProcessedRegion[]): string {
    // Sort regions by start position (descending) to process from end to start
    const sortedRegions = [...regions].sort((a, b) => b.start - a.start)

    let result = line
    for (const region of sortedRegions) {
      result = result.substring(0, region.start) + region.replacement + result.substring(region.end)
    }

    return result
  }

  private isInsideWikiLink(line: string, position: number): boolean {
    let linkStart = -1
    for (let i = position - 1; i >= 0; i--) {
      if (line.substring(i, i + 2) === '[[') {
        linkStart = i
        break
      }
    }

    if (linkStart === -1) return false

    const linkEnd = line.indexOf(']]', linkStart)
    return linkEnd !== -1 && linkEnd >= position
  }

  private isValidWordMatch(line: string, start: number, end: number): boolean {
    // Check character before
    if (start > 0) {
      const charBefore = line[start - 1]
      // Use Unicode property escapes to check for any letter or digit
      if (/[\p{L}\p{N}]/u.test(charBefore)) {
        return false
      }
    }

    // Check character after
    if (end < line.length) {
      const charAfter = line[end]
      // Use Unicode property escapes to check for any letter or digit
      if (/[\p{L}\p{N}]/u.test(charAfter)) {
        // Special case: allow non-Latin suffixes (like Korean particles)
        const afterText = line.substring(end)
        const nonLatinSuffix = /^[^\p{ASCII}]{1,3}(?=\s|$|[.,!?])/u
        if (nonLatinSuffix.test(afterText)) {
          return true
        }
        return false
      }
    }

    return true
  }
}
