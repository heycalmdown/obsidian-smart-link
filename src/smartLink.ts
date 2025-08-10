export interface SmartLinkSettings {
  caseSensitive: boolean
}

export interface FileInfo {
  basename: string
}

export class SmartLinkCore {
  private settings: SmartLinkSettings

  constructor(settings: SmartLinkSettings = { caseSensitive: false }) {
    this.settings = settings
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
        // Calculate a score based on:
        // 1. File name length (longer is better)
        // 2. How much of the selection overlaps with the file name
        const fileNameLength = match.length
        const selectionText = this.settings.caseSensitive
          ? selection.text
          : selection.text.toLowerCase()
        const compareFileName = this.settings.caseSensitive ? match : match.toLowerCase()

        let overlapLength = 0
        if (selectionText.includes(compareFileName)) {
          overlapLength = compareFileName.length
        } else if (compareFileName.startsWith(selectionText)) {
          overlapLength = selectionText.length
        } else if (selectionText.startsWith(compareFileName)) {
          overlapLength = compareFileName.length
        }

        // Score is file length * 1000 + overlap length
        // This prioritizes longer file names, but breaks ties with overlap
        const score = fileNameLength * 1000 + overlapLength

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

    const linkText = this.createLinkText(bestSelection.text, bestMatch)

    // Use the original selection end position to ensure we only replace
    // text within the bounds of what was selected, not beyond
    return {
      result: linkText,
      start: bestSelection.start,
      end: bestSelection.end,
    }
  }

  processAllSmartLinks(line: string, files: FileInfo[]): string {
    // Keep track of already processed regions to avoid overlapping replacements
    const processedRegions: Array<{ start: number; end: number; replacement: string }> = []

    // Process the line from left to right
    let position = 0
    while (position < line.length) {
      // Skip if we're inside an existing link
      if (line.substring(position, position + 2) === '[[') {
        const endLink = line.indexOf(']]', position)
        if (endLink !== -1) {
          position = endLink + 2
          continue
        }
      }

      // Skip whitespace
      if (/\s/.test(line[position])) {
        position++
        continue
      }

      // Try to create a smart link at this position
      const result = this.processSmartLink(line, position, files)

      if (result) {
        // Check if this region overlaps with any already processed region
        const overlaps = processedRegions.some(
          (region) =>
            (result.start >= region.start && result.start < region.end) ||
            (result.end > region.start && result.end <= region.end) ||
            (result.start <= region.start && result.end >= region.end)
        )

        if (!overlaps) {
          processedRegions.push({
            start: result.start,
            end: result.end,
            replacement: result.result,
          })
          // Move position to after the processed region
          position = result.end
        } else {
          position++
        }
      } else {
        position++
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
}
