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
  // Minimum coverage ratio for accepting a match with large gap
  MIN_COVERAGE_RATIO: 0.5,
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
        // Exact matches are always acceptable
        bestMatch = fileName
        bestMatchLength = exactMatch.length
        bestMatchPosition = exactMatch.position
        continue
      }

      // Check prefix match
      const prefixMatch = this.findPrefixMatch(searchText, compareFileName)
      if (prefixMatch && this.isBetterMatch(prefixMatch, bestMatchLength, bestMatchPosition)) {
        // Check for semantic gap for prefix matches
        const matchedPart = searchText.substring(
          prefixMatch.position,
          prefixMatch.position + prefixMatch.length
        )
        if (this.isAcceptableMatch(matchedPart, fileName, text, 0)) {
          bestMatch = fileName
          bestMatchLength = prefixMatch.length
          bestMatchPosition = prefixMatch.position
        }
        continue
      }

      // Check fuzzy match
      if (!this.settings.caseSensitive && this.fuzzyMatch(compareFileName, searchText)) {
        const matchLength = Math.min(compareFileName.length, searchText.length)
        if (
          matchLength > bestMatchLength &&
          this.isAcceptableMatch(searchText, fileName, text, 0)
        ) {
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

    // Only extract non-ASCII suffixes (like Korean particles) or very short English suffixes
    // Do NOT extract regular English words that follow

    // Check for non-ASCII suffix (e.g., Korean particles)
    const nonASCIIMatch = text.match(/^([^\p{ASCII}]{1,3})(?=\s|$|[.,!?])/u)
    if (nonASCIIMatch) {
      return nonASCIIMatch[1]
    }

    // Check for very short English suffixes like "'s", "'d", etc.
    const englishSuffixMatch = text.match(/^('s|'d|'ll|'ve|'re|'m|'t|s)(?=\s|$|[.,!?])/)
    if (englishSuffixMatch) {
      return englishSuffixMatch[1]
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
      if (this.isInsideBackticks(line, pos)) continue

      // Skip whitespace - we don't want to start matching from a space
      if (/\s/.test(line[pos])) continue

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

    // Sort files by length descending to prefer longer matches
    const sortedFiles = [...files].sort((a, b) => b.basename.length - a.basename.length)

    // Look for the best match considering both exact and prefix matches
    // We want to prefer longer matches even if they're only partial
    for (const file of sortedFiles) {
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

      // Check prefix match at position
      const prefixMatch = this.checkPrefixMatchAtPosition(
        line,
        pos,
        file,
        searchText,
        compareFileName
      )

      // Check fuzzy match at this position
      const remainingText = line.substring(pos)
      const fuzzyMatch = this.checkFuzzyMatchAtPosition(line, pos, file, remainingText)

      // Choose the best match among exact, prefix, and fuzzy
      const currentBestForFile = this.selectBestMatch(exactMatch, prefixMatch, fuzzyMatch)

      if (
        currentBestForFile &&
        (!bestMatch || this.isBetterMatchResult(currentBestForFile, bestMatch))
      ) {
        bestMatch = currentBestForFile
      }
    }

    return bestMatch
  }

  private selectBestMatch(...matches: (MatchResult | null)[]): MatchResult | null {
    let best: MatchResult | null = null
    for (const match of matches) {
      if (match && (!best || match.matchLength > best.matchLength)) {
        best = match
      }
    }
    return best
  }

  private isBetterMatchResult(candidate: MatchResult, current: MatchResult): boolean {
    // Prefer longer matches
    if (candidate.matchLength > current.matchLength) {
      return true
    }

    // If same length, prefer exact matches over prefix matches
    if (candidate.matchLength === current.matchLength) {
      if (candidate.matchType === 'exact' && current.matchType !== 'exact') {
        return true
      }
    }

    return false
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

    // Check for semantic gap - exact matches are always acceptable
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
    // Try to match as much of the remaining line as possible
    // This handles cases like "Lambda Throttl" matching "Lambda Throttling"
    const remainingLine = line.substring(pos)
    const normalizedRemaining = this.normalizeCase(remainingLine)

    // Check if the file name starts with any prefix of the remaining text
    for (
      let len = Math.min(compareFileName.length, normalizedRemaining.length);
      len >= CONSTANTS.MIN_PREFIX_LENGTH;
      len--
    ) {
      const textPrefix = normalizedRemaining.substring(0, len)

      if (compareFileName.startsWith(textPrefix)) {
        // Check if this is a valid match point (word boundaries)
        const matchEnd = pos + len
        if (this.isValidWordMatch(line, pos, matchEnd)) {
          // Check for semantic gap
          if (this.isAcceptableMatch(line.substring(pos, matchEnd), file.basename, line, pos)) {
            return {
              file,
              start: pos,
              end: matchEnd,
              matchType: 'prefix',
              matchLength: len,
            }
          }
        }
      }
    }

    return null
  }

  private checkFuzzyMatchAtPosition(
    line: string,
    pos: number,
    file: FileInfo,
    remainingText: string
  ): MatchResult | null {
    // Skip fuzzy matching for case-sensitive mode
    if (this.settings.caseSensitive) {
      return null
    }

    const normalizedFileName = this.normalizeTextForFuzzy(file.basename)

    // Try different word combinations to find the best fuzzy match
    const words = remainingText.split(/[\s\-_]+/)

    // For "product detail" matching "product_detail", we want to consume both words
    for (let wordCount = 1; wordCount <= Math.min(words.length, 5); wordCount++) {
      const testWords = words.slice(0, wordCount)
      const testText = testWords.join(' ')
      const normalizedTest = this.normalizeTextForFuzzy(testText)

      if (normalizedTest === normalizedFileName) {
        // Found exact fuzzy match
        const matchEnd = pos + testText.length
        if (this.isValidWordMatch(line, pos, matchEnd)) {
          // Check for semantic gap
          if (!this.isAcceptableMatch(testText, file.basename, line, pos)) {
            return null
          }
          return {
            file,
            start: pos,
            end: matchEnd,
            matchType: 'prefix',
            matchLength: testText.length,
          }
        }
      }
    }

    // Check prefix match
    const firstWord = words[0]
    if (firstWord && firstWord.length >= CONSTANTS.MIN_PREFIX_LENGTH) {
      const normalizedFirst = this.normalizeTextForFuzzy(firstWord)
      if (normalizedFileName.startsWith(normalizedFirst)) {
        const matchEnd = pos + firstWord.length
        if (this.isValidWordMatch(line, pos, matchEnd)) {
          // Check for semantic gap
          if (!this.isAcceptableMatch(firstWord, file.basename, line, pos)) {
            return null
          }
          return {
            file,
            start: pos,
            end: matchEnd,
            matchType: 'prefix',
            matchLength: firstWord.length,
          }
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

    // Extract suffix but only if it's a grammatical suffix, not punctuation
    const afterText = line.substring(match.end)
    if (afterText.length > 0) {
      // Check if next character is punctuation or space - if so, don't extract suffix
      const firstChar = afterText[0]
      if (!/[\s\p{P}]/u.test(firstChar)) {
        const suffix = this.extractSuffix(afterText)
        if (suffix) {
          linkText += suffix
        }
      }
    }

    return linkText
  }

  private calculateReplaceEnd(match: MatchResult, _linkText: string): number {
    // For prefix matches, we've already calculated the correct end position
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

  private isInsideBackticks(line: string, position: number): boolean {
    // Count backticks before the current position
    let backtickCount = 0
    for (let i = 0; i < position; i++) {
      if (line[i] === '`') {
        backtickCount++
      }
    }

    // If odd number of backticks before position, we're inside backticks
    return backtickCount % 2 === 1
  }

  private isValidWordMatch(line: string, start: number, end: number): boolean {
    // Check character before
    if (start > 0) {
      const charBefore = line[start - 1]
      // Use Unicode property escapes to check for any letter or digit
      // But allow punctuation and whitespace before
      if (/[\p{L}\p{N}]/u.test(charBefore)) {
        return false
      }
    }

    // Check character after
    if (end < line.length) {
      const charAfter = line[end]
      // Check if next character is a letter or digit
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

  private isAcceptableMatch(
    matchedText: string,
    noteName: string,
    line: string,
    position: number
  ): boolean {
    const normalizedMatch = this.normalizeCase(matchedText)
    const normalizedNote = this.normalizeCase(noteName)

    // If the matched text exactly equals the note name, it's always acceptable
    if (normalizedMatch === normalizedNote) {
      return true
    }

    // For fuzzy matching, normalize both strings
    const fuzzyMatch = this.normalizeTextForFuzzy(matchedText)
    const fuzzyNote = this.normalizeTextForFuzzy(noteName)

    // If fuzzy normalized versions match completely, it's acceptable
    if (fuzzyMatch === fuzzyNote) {
      return true
    }

    // Get the word context around the match
    const wordContext = this.getWordContext(line, position, position + matchedText.length)
    const contextTokens = this.tokenize(wordContext)
    const noteTokens = this.tokenize(normalizedNote)
    const matchTokens = this.tokenize(normalizedMatch)

    // Special check for "product detail" vs "product_variation_details"
    // The input has 2 tokens, the note has 3 tokens
    // If the note has significantly more tokens than the input, be strict
    if (noteTokens.length > matchTokens.length * 1.5) {
      // Check if all match tokens are present in note tokens
      const allTokensPresent = matchTokens.every((token) =>
        noteTokens.some((noteToken) => noteToken === token)
      )

      // Even if all tokens are present, reject if the note has too many extra tokens
      if (!allTokensPresent || noteTokens.length - matchTokens.length > 1) {
        return false
      }
    }

    // Special case: if the input text is part of a compound word (like "add-to-cart")
    // and the note name contains unrelated content (like "Cart db recovery incident")
    // we should reject the match
    if (contextTokens.length > matchTokens.length) {
      // The match is part of a larger compound word
      // Check if the note name makes sense in this context

      // Calculate how much of the note is covered by the context
      const noteCoverage = this.calculateTokenOverlap(noteTokens, contextTokens)

      // If the note contains many tokens not present in the context, it's likely a bad match
      if (noteCoverage < 0.3 && noteTokens.length > contextTokens.length * 2) {
        return false
      }
    }

    // Check if the matched text forms complete tokens from the note name
    if (this.hasCompleteTokenMatch(matchTokens, noteTokens)) {
      // But still check the gap
      const coverageRatio = matchedText.length / noteName.length
      if (
        coverageRatio < CONSTANTS.MIN_COVERAGE_RATIO &&
        noteTokens.length > matchTokens.length + 1
      ) {
        return false
      }
      return true
    }

    // Calculate coverage ratio
    const coverageRatio = matchedText.length / noteName.length

    // For partial matches with low coverage, be more strict
    if (coverageRatio < CONSTANTS.MIN_COVERAGE_RATIO) {
      // Only accept if there's strong semantic similarity
      const semanticScore = this.calculateSemanticSimilarity(matchTokens, noteTokens)
      if (semanticScore < 0.5) {
        return false
      }
    }

    return true
  }

  private tokenize(text: string): string[] {
    // Split by spaces, hyphens, underscores, and camelCase boundaries
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[\s\-_]+/)
      .filter((token) => token.length > 0)
      .map((token) => token.toLowerCase())
  }

  private hasCompleteTokenMatch(matchTokens: string[], noteTokens: string[]): boolean {
    // Check if all match tokens are complete tokens in the note
    return matchTokens.every((matchToken) =>
      noteTokens.some((noteToken) => noteToken === matchToken)
    )
  }

  private getWordContext(line: string, start: number, end: number): string {
    // Expand to get the full word context
    let wordStart = start
    let wordEnd = end

    // Expand backwards to word boundary
    while (wordStart > 0 && /[\p{L}\p{N}\-_]/u.test(line[wordStart - 1])) {
      wordStart--
    }

    // Expand forwards to word boundary
    while (wordEnd < line.length && /[\p{L}\p{N}\-_]/u.test(line[wordEnd])) {
      wordEnd++
    }

    return line.substring(wordStart, wordEnd)
  }

  private calculateTokenOverlap(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) return 0

    const commonTokens = tokens1.filter((token) =>
      tokens2.some((otherToken) => otherToken === token)
    )

    return commonTokens.length / tokens1.length
  }

  private calculateSemanticSimilarity(matchTokens: string[], noteTokens: string[]): number {
    if (matchTokens.length === 0 || noteTokens.length === 0) return 0

    // Count exact matches
    const exactMatches = matchTokens.filter((token) =>
      noteTokens.some((noteToken) => noteToken === token)
    ).length

    // Count partial matches (one token contains another)
    const partialMatches = matchTokens.filter((token) =>
      noteTokens.some(
        (noteToken) =>
          (noteToken.includes(token) || token.includes(noteToken)) && noteToken !== token
      )
    ).length

    const totalMatches = exactMatches + partialMatches * 0.5
    return totalMatches / Math.max(matchTokens.length, noteTokens.length)
  }
}
