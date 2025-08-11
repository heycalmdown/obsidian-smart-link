export interface SmartLinkSettings {
  caseSensitive: boolean
  excludeDirectories: string[]
  excludeNotes: string[]
}

export interface FileInfo {
  basename: string
  path?: string
}

export class SmartLinkCore {
  private settings: SmartLinkSettings

  constructor(
    settings: SmartLinkSettings = { caseSensitive: false, excludeDirectories: [], excludeNotes: [] }
  ) {
    this.settings = settings
  }

  filterFiles(files: FileInfo[]): FileInfo[] {
    return files.filter((file) => {
      // Check if note is in exclude list (supports regex patterns)
      if (this.settings.excludeNotes && this.settings.excludeNotes.length > 0) {
        const isExcluded = this.settings.excludeNotes.some((pattern) => {
          try {
            // Try to use as regex pattern
            const regex = new RegExp(pattern)
            return regex.test(file.basename)
          } catch {
            // If regex is invalid, fall back to exact string match
            return pattern === file.basename
          }
        })
        if (isExcluded) {
          return false
        }
      }

      // Check if file is in excluded directory
      if (
        file.path &&
        this.settings.excludeDirectories &&
        this.settings.excludeDirectories.length > 0
      ) {
        const filePath = file.path
        return !this.settings.excludeDirectories.some((excludeDir) => {
          // Handle both with and without trailing slash
          const normalizedExcludeDir = excludeDir.endsWith('/') ? excludeDir : excludeDir + '/'
          return filePath.startsWith(normalizedExcludeDir) || filePath === excludeDir
        })
      }

      return true
    })
  }

  getExpandedSelections(
    line: string,
    cursorPos: number
  ): Array<{ text: string; start: number; end: number }> | null {
    if (line.length === 0) {
      return null
    }

    const hardBoundaryRegex = /[[\](){}<>.,;:!?'"]/
    const softBoundaryRegex = /\s/

    let start = cursorPos
    let end = cursorPos

    // Find initial word boundaries (not including spaces)
    while (
      start > 0 &&
      !hardBoundaryRegex.test(line[start - 1]) &&
      !softBoundaryRegex.test(line[start - 1])
    ) {
      start--
    }

    while (
      end < line.length &&
      !hardBoundaryRegex.test(line[end]) &&
      !softBoundaryRegex.test(line[end])
    ) {
      end++
    }

    const expandedResults: Array<{ text: string; start: number; end: number }> = []
    const initialText = line.substring(start, end)

    if (initialText.length > 0) {
      expandedResults.push({ text: initialText, start, end })
    }

    // Progressively expand selection including across spaces
    let expandStart = start
    let expandEnd = end
    const maxExpansion = 50

    for (let i = 1; i <= maxExpansion; i++) {
      let changed = false

      // Expand left - skip spaces then grab the next word
      if (expandStart > 0) {
        const prevChar = line[expandStart - 1]
        if (softBoundaryRegex.test(prevChar)) {
          // Skip spaces
          let tempStart = expandStart - 1
          while (tempStart > 0 && softBoundaryRegex.test(line[tempStart - 1])) {
            tempStart--
          }
          // Then grab the word
          if (tempStart > 0 && !hardBoundaryRegex.test(line[tempStart - 1])) {
            expandStart = tempStart
            while (
              expandStart > 0 &&
              !hardBoundaryRegex.test(line[expandStart - 1]) &&
              !softBoundaryRegex.test(line[expandStart - 1])
            ) {
              expandStart--
            }
            changed = true
          }
        } else if (!hardBoundaryRegex.test(prevChar)) {
          expandStart--
          while (
            expandStart > 0 &&
            !hardBoundaryRegex.test(line[expandStart - 1]) &&
            !softBoundaryRegex.test(line[expandStart - 1])
          ) {
            expandStart--
          }
          changed = true
        }
      }

      // Expand right - skip spaces then grab the next word
      if (expandEnd < line.length) {
        const nextChar = line[expandEnd]
        if (softBoundaryRegex.test(nextChar)) {
          // Skip spaces
          let tempEnd = expandEnd + 1
          while (tempEnd < line.length && softBoundaryRegex.test(line[tempEnd])) {
            tempEnd++
          }
          // Then grab the word
          if (tempEnd < line.length && !hardBoundaryRegex.test(line[tempEnd])) {
            expandEnd = tempEnd
            while (
              expandEnd < line.length &&
              !hardBoundaryRegex.test(line[expandEnd]) &&
              !softBoundaryRegex.test(line[expandEnd])
            ) {
              expandEnd++
            }
            changed = true
          }
        } else if (!hardBoundaryRegex.test(nextChar)) {
          expandEnd++
          while (
            expandEnd < line.length &&
            !hardBoundaryRegex.test(line[expandEnd]) &&
            !softBoundaryRegex.test(line[expandEnd])
          ) {
            expandEnd++
          }
          changed = true
        }
      }

      if (changed) {
        const expandedText = line.substring(expandStart, expandEnd)
        expandedResults.push({ text: expandedText, start: expandStart, end: expandEnd })
      } else {
        break
      }
    }

    return expandedResults.length > 0 ? expandedResults : null
  }

  findBestMatch(text: string, files: FileInfo[]): string | null {
    const fileNames = files.map((f) => f.basename)
    const searchText = this.settings.caseSensitive ? text : text.toLowerCase()

    let bestMatch: string | null = null
    let bestMatchLength = 0
    let bestMatchPosition = -1

    // Sort fileNames by length (descending) to prioritize longer matches
    const sortedFileNames = [...fileNames].sort((a, b) => b.length - a.length)

    for (const fileName of sortedFileNames) {
      const compareFileName = this.settings.caseSensitive ? fileName : fileName.toLowerCase()

      // 1. Check if the file name appears anywhere in the search text
      const matchIndex = searchText.indexOf(compareFileName)

      if (matchIndex !== -1) {
        const matchLength = compareFileName.length

        const isBetterMatch =
          matchLength > bestMatchLength ||
          (matchLength === bestMatchLength && matchIndex < bestMatchPosition)

        if (isBetterMatch) {
          bestMatch = fileName
          bestMatchLength = matchLength
          bestMatchPosition = matchIndex
        }
        continue
      }

      // 1.5. Check if the search text contains a prefix of the file name
      // This handles cases like "2025-08-09 test" matching "2025-08-09-Sat"
      // Only consider prefixes of meaningful length (at least 3 characters)
      for (
        let prefixLength = Math.min(compareFileName.length, searchText.length);
        prefixLength >= 3; // Minimum prefix length to avoid spurious matches
        prefixLength--
      ) {
        const filePrefix = compareFileName.substring(0, prefixLength)
        const textPrefix = searchText.substring(0, prefixLength)

        if (filePrefix === textPrefix) {
          // Found a prefix match - use the actual prefix length for scoring
          // This ensures that longer prefix matches are prioritized
          const matchLength = prefixLength // Use actual prefix length for accurate scoring

          const isBetterMatch =
            matchLength > bestMatchLength ||
            (matchLength === bestMatchLength && 0 < bestMatchPosition)

          if (isBetterMatch) {
            bestMatch = fileName
            bestMatchLength = matchLength
            bestMatchPosition = 0
          }
          break // Found the longest possible prefix for this file
        }
      }

      // 2. Check if the search text starts with the file name (partial match)
      const startsWithSearchText = compareFileName.startsWith(searchText)

      if (startsWithSearchText) {
        const matchLength = searchText.length

        const isBetterMatch =
          matchLength > bestMatchLength ||
          (matchLength === bestMatchLength && 0 < bestMatchPosition)

        if (isBetterMatch) {
          bestMatch = fileName
          bestMatchLength = matchLength
          bestMatchPosition = 0
        }
        continue
      }

      // 3. Check if the file name starts with the search text (partial match)
      const searchTextStartsWithFile = searchText.startsWith(compareFileName)

      if (searchTextStartsWithFile) {
        const matchLength = compareFileName.length

        const isBetterMatch =
          matchLength > bestMatchLength ||
          (matchLength === bestMatchLength && 0 < bestMatchPosition)

        if (isBetterMatch) {
          bestMatch = fileName
          bestMatchLength = matchLength
          bestMatchPosition = 0
        }
        continue
      }

      // 4. If no exact match, try fuzzy match
      const fuzzyMatchResult = !this.settings.caseSensitive
        ? this.fuzzyMatch(compareFileName, searchText)
        : false

      if (fuzzyMatchResult) {
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

  private fuzzyMatch(fileName: string, searchText: string): boolean {
    const normalizedFileName = this.normalizeText(fileName)
    const normalizedSearch = this.normalizeText(searchText)
    return normalizedFileName === normalizedSearch
  }

  private normalizeText(text: string): string {
    return text
      .replace(/[\s-_]/g, '')
      .toLowerCase()
      .trim()
  }

  createLinkText(originalText: string, matchedFileName: string): string {
    const searchText = this.settings.caseSensitive ? originalText : originalText.toLowerCase()
    const compareFileName = this.settings.caseSensitive
      ? matchedFileName
      : matchedFileName.toLowerCase()

    // 1. Check if the file name appears in the search text
    const matchIndex = searchText.indexOf(compareFileName)
    if (matchIndex !== -1) {
      const beforeMatch = originalText.substring(0, matchIndex)
      let afterMatch = originalText.substring(matchIndex + compareFileName.length)

      // Universal agglutinative suffix handling
      // Keep suffixes that are short and look like grammatical elements
      if (afterMatch.length > 0) {
        // Look for space + short word (like " was") OR short suffix without space
        const spaceAndWordMatch = afterMatch.match(/^(\s+\w{1,3})(?=\s|$)/)
        const shortSuffixMatch = afterMatch.match(/^([^\s]{1,3})(?=\s|$)/)

        if (spaceAndWordMatch) {
          afterMatch = spaceAndWordMatch[1]
        } else if (shortSuffixMatch) {
          afterMatch = shortSuffixMatch[1]
        } else {
          afterMatch = ''
        }
      }

      return `${beforeMatch}[[${matchedFileName}]]${afterMatch}`
    }

    // 2. Check if search text starts with file name (partial match from beginning)
    if (compareFileName.startsWith(searchText)) {
      // The entire search text matches the beginning of the file name
      // Replace the entire search text with the link
      return `[[${matchedFileName}]]`
    }

    // 3. Check if file name starts with search text (file name is shorter)
    if (searchText.startsWith(compareFileName)) {
      // The file name matches the beginning of the search text
      let afterMatch = originalText.substring(compareFileName.length)

      // Universal agglutinative suffix handling
      // Keep suffixes that are short and look like grammatical elements
      if (afterMatch.length > 0) {
        // Look for space + short word (like " was") OR short suffix without space
        const spaceAndWordMatch = afterMatch.match(/^(\s+\w{1,3})(?=\s|$)/)
        const shortSuffixMatch = afterMatch.match(/^([^\s]{1,3})(?=\s|$)/)

        if (spaceAndWordMatch) {
          afterMatch = spaceAndWordMatch[1]
        } else if (shortSuffixMatch) {
          afterMatch = shortSuffixMatch[1]
        } else {
          afterMatch = ''
        }
      }

      return `[[${matchedFileName}]]${afterMatch}`
    }

    // 4. Try fuzzy match
    for (let startPos = 0; startPos <= searchText.length - 1; startPos++) {
      for (let endPos = startPos + 1; endPos <= searchText.length; endPos++) {
        const substring = searchText.substring(startPos, endPos)
        if (this.fuzzyMatch(compareFileName, substring)) {
          const beforeMatch = originalText.substring(0, startPos)
          let afterMatch = originalText.substring(endPos)

          // Universal agglutinative suffix handling
          // Keep suffixes that are short and look like grammatical elements
          if (afterMatch.length > 0) {
            // Look for space + short word (like " was") OR short suffix without space
            const spaceAndWordMatch = afterMatch.match(/^(\s+\w{1,3})(?=\s|$)/)
            const shortSuffixMatch = afterMatch.match(/^([^\s]{1,3})(?=\s|$)/)

            if (spaceAndWordMatch) {
              afterMatch = spaceAndWordMatch[1]
            } else if (shortSuffixMatch) {
              afterMatch = shortSuffixMatch[1]
            } else {
              afterMatch = ''
            }
          }

          return `${beforeMatch}[[${matchedFileName}]]${afterMatch}`
        }
      }
    }

    // If no match found, just return the link
    return `[[${matchedFileName}]]`
  }

  processSmartLink(
    line: string,
    cursorPos: number,
    files: FileInfo[]
  ): { result: string; start: number; end: number } | null {
    const expandedSelections = this.getExpandedSelections(line, cursorPos)
    if (!expandedSelections || expandedSelections.length === 0) {
      return null
    }

    let bestMatch: string | null = null
    let bestSelection: { text: string; start: number; end: number } | null = null
    let bestMatchScore = 0

    // Try from the smallest expansion to the largest
    // This ensures we find the most precise match first
    for (const selection of expandedSelections) {
      const match = this.findBestMatch(selection.text, files)
      if (match) {
        const selectionText = this.settings.caseSensitive
          ? selection.text
          : selection.text.toLowerCase()
        const compareFileName = this.settings.caseSensitive ? match : match.toLowerCase()

        // Calculate a comprehensive score based on multiple factors
        let score = 0

        // Factor 1: File name length (longer is better) - Weight: 10000
        score += match.length * 10000

        // Factor 2: How much text the filename actually covers in the original line
        // This is critical for the edge case where we want to match more of the actual content
        const lineText = this.settings.caseSensitive ? line : line.toLowerCase()
        let actualCoverage = 0

        // Check how much of the line the filename can match
        const fileMatchIndex = lineText.indexOf(compareFileName)
        if (fileMatchIndex !== -1) {
          actualCoverage = compareFileName.length
          // Bonus for matching at the beginning of the line
          if (fileMatchIndex === 0) {
            score += 1000
          }
        } else if (lineText.startsWith(compareFileName)) {
          actualCoverage = compareFileName.length
          score += 1000 // Beginning match bonus
        } else if (compareFileName.startsWith(lineText.trim())) {
          actualCoverage = lineText.trim().length
        }

        // Factor 3: Actual coverage weight - Weight: 1000
        score += actualCoverage * 1000

        // Factor 4: Selection relevance - how well the selection captures the match
        let selectionRelevance = 0
        if (selectionText.includes(compareFileName)) {
          selectionRelevance = compareFileName.length
        } else if (compareFileName.startsWith(selectionText)) {
          selectionRelevance = selectionText.length
        } else if (selectionText.startsWith(compareFileName)) {
          selectionRelevance = compareFileName.length
        }

        // Factor 5: Selection relevance weight - Weight: 100
        score += selectionRelevance * 100

        // Factor 6: Selection size penalty for overly broad selections
        // Prefer selections that are more focused, but don't penalize reasonable suffix inclusion
        const excessLength = selectionText.length - compareFileName.length
        let selectionSizePenalty = 0
        if (excessLength > 8) {
          // Only penalize significantly oversized selections
          selectionSizePenalty = (excessLength - 8) * 10
        }
        score -= selectionSizePenalty

        if (score > bestMatchScore) {
          bestMatch = match
          bestSelection = selection
          bestMatchScore = score
        }
      }
    }

    if (!bestMatch || !bestSelection) {
      return null
    }

    // For edge cases, we need to create a more targeted text for link creation
    // instead of using the entire selection
    const selectionText = this.settings.caseSensitive
      ? bestSelection.text
      : bestSelection.text.toLowerCase()
    const compareFileName = this.settings.caseSensitive ? bestMatch : bestMatch.toLowerCase()

    let actualTextForLink = bestSelection.text
    let actualStart = bestSelection.start
    let actualEnd = bestSelection.end

    // Handle very specific edge cases where selection contains spurious extra content
    // This should ONLY trigger for the specific problematic patterns we're trying to fix
    const isDatePatternWithExtra = /^\d{4}-\d{2}-\d{2}\s+\w+/.test(selectionText) // Date pattern with extra words
    const isPrefixMatchScenario =
      !selectionText.includes(compareFileName) &&
      compareFileName.startsWith(selectionText.split(' ')[0]) &&
      selectionText.length > 12 // Only for significantly longer selections

    // Case where filename is contained but cursor was outside filename area (spurious extra content)
    // Only apply when there's a significant amount of extra content that looks spurious
    const hasSpuriousExtraContent =
      selectionText.includes(compareFileName) &&
      selectionText.length > compareFileName.length + 8 && // Significant extra content
      !/\s(was|is|are|were|been|have|has|had|will|would|could|should|may|might|can|do|does|did|am|the|a|an|and|or|but|of|in|on|at|to|for|with|by)\b/.test(
        selectionText
      ) // No common English connecting words that suggest legitimate continuation

    // Be extremely selective - only apply for the specific edge cases we identified
    // DO NOT interfere with normal suffix handling like " was", " skills", etc.
    const shouldApplyEdgeCaseLogic =
      isDatePatternWithExtra || isPrefixMatchScenario || hasSpuriousExtraContent

    if (shouldApplyEdgeCaseLogic) {
      if (selectionText.includes(compareFileName)) {
        // Case 1: Full filename is contained (e.g., "React Native" in "React Native development stuff")
        const matchIndex = selectionText.indexOf(compareFileName)
        if (matchIndex !== -1) {
          actualStart = bestSelection.start + matchIndex
          actualEnd = bestSelection.start + matchIndex + compareFileName.length

          // Extend slightly for Korean particles, but not for English spaces
          while (actualEnd < bestSelection.end && actualEnd < line.length) {
            const char = line[actualEnd]
            // Only extend for Korean particles, not for English spaces
            if (/[가-힣]/.test(char) && actualEnd - actualStart < compareFileName.length + 2) {
              actualEnd++
            } else {
              break
            }
          }
          actualTextForLink = line.substring(actualStart, actualEnd)
        }
      } else if (isPrefixMatchScenario) {
        // Case 2: Prefix match (e.g., "2025-08-09-Sat" prefix matches "2025-08-09 test")
        let commonPrefixLength = 0
        for (let i = 0; i < Math.min(selectionText.length, compareFileName.length); i++) {
          if (selectionText[i] === compareFileName[i]) {
            commonPrefixLength++
          } else {
            break
          }
        }

        if (commonPrefixLength > 8) {
          // Increase threshold to be more selective
          actualStart = bestSelection.start
          actualEnd = bestSelection.start + commonPrefixLength

          // Allow Korean particles but not English words
          if (actualEnd < line.length && /[가-힣]/.test(line[actualEnd])) {
            actualEnd++
          }

          actualTextForLink = line.substring(actualStart, actualEnd)
        }
      }
    }

    const linkText = this.createLinkText(actualTextForLink, bestMatch)

    return {
      result: linkText,
      start: actualStart,
      end: actualEnd,
    }
  }

  processAllSmartLinks(line: string, files: FileInfo[]): string {
    // Keep track of already processed regions to avoid overlapping replacements
    const processedRegions: Array<{ start: number; end: number; replacement: string }> = []

    // Sort files by length (descending) to prioritize longer matches
    const sortedFiles = [...files].sort((a, b) => b.basename.length - a.basename.length)

    const searchText = this.settings.caseSensitive ? line : line.toLowerCase()

    // Process each position in the line
    for (let pos = 0; pos < searchText.length; pos++) {
      // Skip if this position is already processed
      const alreadyProcessed = processedRegions.some(
        (region) => pos >= region.start && pos < region.end
      )
      if (alreadyProcessed) continue

      // Skip if inside wiki link
      if (this.isInsideWikiLink(line, pos)) continue

      let bestMatch: {
        file: FileInfo
        start: number
        end: number
        matchType: 'exact' | 'prefix'
        matchLength: number
      } | null = null

      // Check all files for the best match at this position
      for (const file of sortedFiles) {
        const fileName = file.basename
        const compareFileName = this.settings.caseSensitive ? fileName : fileName.toLowerCase()

        // Check for exact match at this position (filename appears in text)
        if (searchText.substring(pos).startsWith(compareFileName)) {
          const matchEnd = pos + compareFileName.length
          if (this.isValidWordMatch(line, pos, matchEnd)) {
            // This is an exact substring match in the text
            if (!bestMatch || compareFileName.length > bestMatch.matchLength) {
              bestMatch = {
                file,
                start: pos,
                end: matchEnd,
                matchType: 'exact',
                matchLength: compareFileName.length,
              }
            }
          }
        }

        // Check for prefix match (text is a prefix of filename)
        // Skip if this file already matched exactly
        if (bestMatch?.file === file && bestMatch.matchType === 'exact') continue

        const remainingText = searchText.substring(pos)
        for (let len = Math.min(compareFileName.length, remainingText.length); len >= 3; len--) {
          const textPart = remainingText.substring(0, len)
          const filePart = compareFileName.substring(0, len)

          if (textPart === filePart && this.isValidWordMatch(line, pos, pos + len)) {
            // Found a prefix match - text matches beginning of filename
            // Prefix match can only override if:
            // 1. We have no match yet
            // 2. We have another prefix match and this one is longer
            // 3. Never override an exact match with a prefix match
            if (!bestMatch || (bestMatch.matchType === 'prefix' && len > bestMatch.matchLength)) {
              bestMatch = {
                file,
                start: pos,
                end: pos + len,
                matchType: 'prefix',
                matchLength: len,
              }
            }
            break // Found the longest prefix for this file
          }
        }
      }

      if (bestMatch) {
        // Create the link text
        const originalText = line.substring(bestMatch.start, bestMatch.end)
        let linkText: string

        if (bestMatch.matchType === 'exact') {
          // For exact matches, use createLinkText to handle suffixes
          linkText = this.createLinkText(originalText, bestMatch.file.basename)
        } else {
          // For prefix matches, just create the link
          linkText = `[[${bestMatch.file.basename}]]`

          // Handle Korean particles or other suffixes
          let suffixEnd = bestMatch.end
          if (suffixEnd < line.length) {
            const afterText = line.substring(suffixEnd)
            // Check for Korean particles
            const koreanParticleMatch = afterText.match(
              /^([을를이가은는에서의으로와과도만까지부터에게한테께서보다처럼같이]+)(?=\s|$|[.,!?])/
            )
            if (koreanParticleMatch) {
              suffixEnd += koreanParticleMatch[1].length
              linkText += koreanParticleMatch[1]
            }
          }
        }

        // Determine the actual end position for replacement
        let replaceEnd = bestMatch.end
        if (
          bestMatch.matchType === 'exact' &&
          linkText.length > `[[${bestMatch.file.basename}]]`.length
        ) {
          // If createLinkText added suffixes, calculate the actual end
          const suffixLength = linkText.length - `[[${bestMatch.file.basename}]]`.length
          replaceEnd = bestMatch.end + suffixLength
        }

        processedRegions.push({
          start: bestMatch.start,
          end: replaceEnd,
          replacement: linkText,
        })

        // Skip ahead past this match
        pos = replaceEnd - 1 // -1 because the loop will increment
      }
    }

    // Sort regions by start position (descending) to process from end to start
    processedRegions.sort((a, b) => b.start - a.start)

    // Apply replacements from end to start to maintain positions
    let resultLine = line
    for (const region of processedRegions) {
      resultLine =
        resultLine.substring(0, region.start) +
        region.replacement +
        resultLine.substring(region.end)
    }

    return resultLine
  }

  private isInsideWikiLink(line: string, position: number): boolean {
    // Find the last [[ before position
    let linkStart = -1
    for (let i = position - 1; i >= 0; i--) {
      if (line.substring(i, i + 2) === '[[') {
        linkStart = i
        break
      }
    }

    if (linkStart === -1) return false

    // Check if there's a ]] after linkStart but before or at position
    const linkEnd = line.indexOf(']]', linkStart)
    return linkEnd !== -1 && linkEnd >= position
  }

  private isValidWordMatch(line: string, start: number, end: number): boolean {
    // Check character before
    if (start > 0) {
      const charBefore = line[start - 1]
      // Allow if it's whitespace or punctuation, but not alphanumeric Korean/English
      if (/[a-zA-Z0-9\uAC00-\uD7AF]/.test(charBefore)) {
        return false
      }
    }

    // Check character after
    if (end < line.length) {
      const charAfter = line[end]
      // For Korean text, allow particles and endings
      const afterText = line.substring(end)
      const koreanParticleMatch = afterText.match(
        /^([을를이가은는에서의으로와과도만까지부터에게한테께서보다처럼같이]*)(?=\s|$|[.,!?])/
      )

      // If it's followed by Korean particles, it's valid
      if (koreanParticleMatch && koreanParticleMatch[1].length > 0) {
        return true
      }

      // Allow if it's whitespace or punctuation, but not alphanumeric Korean/English
      if (/[a-zA-Z0-9\uAC00-\uD7AF]/.test(charAfter)) {
        return false
      }
    }

    return true
  }
}
