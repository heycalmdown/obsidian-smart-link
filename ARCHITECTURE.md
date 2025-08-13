# Smart Link Core Architecture

## Overview
SmartLinkCore is a text processing system that automatically creates wiki-style links (`[[filename]]`) by matching text against a list of available files. It supports multiple languages including Korean with special handling for grammatical particles.

## Core Components

### 1. Type System
```typescript
SmartLinkSettings     // Configuration for case sensitivity and exclusions
FileInfo             // File metadata (basename, path)
MatchResult          // Match details with type and scoring
ProcessedRegion      // Replacement region tracking
```

### 2. Constants Structure
- **MIN_PREFIX_LENGTH**: Minimum 3 characters for meaningful matches
- **MAX_SUFFIX_LENGTH**: Maximum 3 characters for suffix preservation
- **KOREAN**: Patterns for Korean particles and characters
  - PARTICLES: Regex for Korean grammatical particles (을/를, 이/가, etc.)
  - CHARACTERS: Regex for Korean character detection

## Main Processing Flow

### Full Line Processing (`processAllSmartLinks`)
The primary method used to process all potential links in a line of text.

```
1. Position Scanning
   ├── Iterate through each position in line
   ├── Skip already processed regions
   └── Skip existing wiki links

2. Match Detection at Position
   ├── Check exact matches first
   │   └── Filename appears exactly in text
   ├── Check prefix matches
   │   └── Text is prefix of filename (min 3 chars)
   └── Validate word boundaries

3. Link Generation
   ├── Create appropriate link format
   ├── Handle Korean particles
   └── Calculate replacement boundaries

4. Replacement Application
   ├── Sort regions by position (descending)
   └── Apply replacements from end to start
```

## Matching Algorithm

### Match Priority (Highest to Lowest)
1. **Exact Match**: Filename appears exactly in text
2. **Prefix Match**: Text contains prefix of filename (min 3 chars)
3. **Partial Match**: Filename starts with text or vice versa
4. **Fuzzy Match**: After normalization (remove spaces, hyphens, underscores)

### Match Selection
- Longer matches are preferred over shorter ones
- Earlier position in text is preferred when length is equal
- Case sensitivity is configurable

## Special Language Handling

### Korean Language Support
1. **Particle Detection**: Identifies Korean grammatical particles (을/를, 이/가, etc.)
2. **Particle Preservation**: Keeps particles with the link
3. **Word Boundary Validation**: Special rules for Korean character sequences

### Universal Suffix Handling
1. **Short Suffixes**: Preserves suffixes up to 3 characters
2. **Space + Word**: Handles patterns like " was", " is"
3. **Agglutinative Support**: Works with suffix-based languages

## File Filtering System

### Exclusion Mechanisms
1. **Note Exclusion**: Regex or exact match patterns
2. **Directory Exclusion**: Path-based filtering with normalization
3. **Cascading Filter**: Early return for efficiency

## Key Design Patterns

### 1. Separation of Concerns
- Text processing separated from matching logic
- Link creation independent of match finding
- Different match types handled by specialized methods

### 2. Position-Based Processing
- Process text position by position
- Track processed regions to avoid overlaps
- Apply replacements in reverse order

### 3. Immutable Processing
- Original text never modified directly
- All replacements tracked in regions
- Applied in reverse order to maintain positions

### 4. Early Return Optimization
- Skip invalid positions immediately
- Check most likely matches first
- Avoid redundant calculations

## Performance Optimizations

1. **File Sorting**: Process longer filenames first for better matches
2. **Position Tracking**: Skip already processed regions
3. **Lazy Evaluation**: Calculate only when needed
4. **Reverse Application**: Apply replacements from end to maintain indices
5. **Early Termination**: Stop searching once best match is found

## Helper Methods

### Text Processing
- `normalizeCase()`: Handle case sensitivity setting
- `normalizeTextForFuzzy()`: Remove spaces, hyphens for fuzzy matching
- `extractSuffix()`: Extract grammatical suffixes
- `extractKoreanParticles()`: Extract Korean particles

### Matching
- `findBestMatch()`: Find best matching file for given text
- `findExactMatch()`: Check for exact substring match
- `findPrefixMatch()`: Check for prefix matches
- `fuzzyMatch()`: Perform fuzzy matching

### Link Creation
- `createLinkText()`: Create wiki link with appropriate context
- `createLinkWithContext()`: Create link preserving surrounding text
- `createFuzzyLink()`: Create link from fuzzy match
- `createLinkForMatch()`: Create link based on match type

### Validation
- `isValidWordMatch()`: Check word boundaries
- `isInsideWikiLink()`: Check if position is inside existing link
- `isPositionProcessed()`: Check if position already processed

## Error Handling

1. **Graceful Degradation**: Returns null when no match found
2. **Regex Fallback**: Falls back to exact match if regex fails
3. **Boundary Validation**: Ensures matches are at word boundaries
4. **Empty Input Handling**: Early return for empty strings

## Extension Points

### Customizable Components
1. **Settings**: Case sensitivity, exclusion patterns
2. **Constants**: Minimum prefix length, suffix length
3. **Patterns**: Regex patterns for different languages

### Future Enhancements
1. **Caching**: Cache normalized filenames for repeated operations
2. **Async Processing**: Process large texts in chunks
3. **Custom Matchers**: Plugin system for specialized matching
4. **ML Scoring**: Machine learning-based relevance scoring
5. **Multi-language**: Extended support for more languages with particles