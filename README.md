# <CHORUS_TAG>README.md</CHORUS_TAG>

# Obsidian Smart Link Plugin

A powerful Obsidian plugin that intelligently creates wiki-style links with automatic context detection. Perfect for users working with languages that use agglutination (like Korean, Japanese, Turkish) or anyone who wants more efficient linking.

## Features

### 🔗 Intelligent Single Link Creation

Smart Link analyzes the context around your cursor to automatically create the most appropriate link. It prioritizes longer, more specific matches over shorter ones.

### ⚡ NEW: Create All Smart Links

**NEW FEATURE**: Automatically create ALL possible smart links in an entire line at once!

Place your cursor anywhere on a line and use the "Create all smart links in line" command to instantly convert every linkable term into a wiki link. Perfect for quickly processing notes with many references.

### 🌐 Universal Language Support

Specially designed for agglutinative languages but works perfectly with any language:
- **Korean**: Handles particles like 이/가, 을/를, 에서, 으로
- **Japanese**: Supports particles and grammatical elements  
- **Turkish**: Handles complex suffix systems
- **English**: Standard word boundary detection
- **Mixed languages**: Seamlessly handles multilingual content

## Commands

### 1. Create Smart Link
**Default Hotkey**: Cmd/Ctrl + Shift + K  
Creates a single smart link at the cursor position.

### 2. Create All Smart Links in Line  
**NEW**: No default hotkey (assign in settings)  
Creates ALL possible smart links in the entire line from the beginning.

## Examples

### Single Link Creation

#### English Examples

**Basic linking**
- You have a note called `Project Management`
- Text: "I need to improve my project management skills"
- Cursor on "project management" → Result: "I need to improve my [[Project Management]] skills"

**Longer match priority**
- You have notes: `World Cup` and `2022 FIFA World Cup`
- Text: "The 2022 FIFA World Cup was held in Qatar"
- Cursor on "World Cup" → Result: "The [[2022 FIFA World Cup]] was held in Qatar"

#### Korean Examples (Agglutinative Language)

**Particle handling**
- You have a note: `서울특별시` (Seoul)
- Text: "서울특별시에서 만났다" (Met in Seoul)
- Cursor on "서울특별시에서" → Result: "[[서울특별시]]에서 만났다"

**Complex matching with particles**
- You have notes: `인공지능` (AI) and `생성형 인공지능` (Generative AI)  
- Text: "생성형 인공지능이 발전하고 있다" (Generative AI is advancing)
- Cursor on "인공지능" → Result: "[[생성형 인공지능]]이 발전하고 있다"

### ALL Links Creation (NEW!)

**English example**
- Text: "I love React and JavaScript programming"
- Result: "I love [[React]] and [[JavaScript]] programming"

**Korean example with particles**  
- Text: "인공지능과 머신러닝을 공부한다" (Studying AI and machine learning)
- Result: "[[인공지능]]과 [[머신러닝]]을 공부한다"

**Mixed language example**
- Text: "Claude Code는 인공지능이다" (Claude Code is AI)
- Result: "[[Claude Code]]는 [[인공지능]]이다"

**Complex Korean sentence**
- Text: "서울에서 부산으로 대구를 거쳐서" (From Seoul to Busan via Daegu)
- Result: "[[서울]]에서 [[부산]]으로 [[대구]]를 거쳐서"

## Installation

### From Obsidian Community Plugins

1. Open Settings → Community plugins
2. Search for "Smart Link"
3. Install and enable the plugin

### Manual Installation

1. Download the latest release from GitHub
2. Extract files to your vault's `.obsidian/plugins/obsidian-smart-link/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

## Usage

### Setup Hotkeys

1. Go to Settings → Hotkeys
2. Search for "Smart Link"
3. Assign hotkeys to:
   - **Create smart link**: Single link at cursor
   - **Create all smart links in line**: ALL links in entire line

### How Single Links Work

1. Place your cursor on or near the text you want to link
2. Press the hotkey or run the "Create smart link" command
3. The plugin will:
   - Expand from cursor position to find potential matches
   - Search all your notes for the best matching title
   - Replace the text with a properly formatted link
   - Preserve any grammatical particles or suffixes outside the link

### How "Create All Links" Works

1. Place your cursor anywhere on the line
2. Press the hotkey or run the "Create all smart links in line" command  
3. The plugin will:
   - Scan the ENTIRE line from the beginning
   - Find ALL possible matches with your note titles
   - Create multiple links simultaneously
   - Skip existing `[[wiki links]]`
   - Preserve all grammatical elements and punctuation

## Key Features

### 🎯 Intelligent Matching
- **Priority-based**: Longer, more specific matches win
- **Context-aware**: Understands word boundaries and grammatical elements
- **Fuzzy matching**: Handles case differences and spacing variations

### 🔄 Existing Link Preservation
- Skips text already in `[[wiki links]]`
- Won't modify existing link structures
- Handles malformed links gracefully

### ⚙️ Smart Text Processing
- **Word boundary detection**: Respects punctuation and spacing
- **Particle separation**: Keeps Korean/Japanese particles outside links
- **Multi-word matching**: Handles phrases like "Visual Studio Code"

### 🚀 Performance Optimized
- Efficient algorithm for large vaults
- Fast processing even with hundreds of notes
- Real-time matching as you type

## Configuration

Current settings support:

- **Case sensitivity**: Toggle between case-sensitive and case-insensitive matching  
- **Custom hotkeys**: Modify hotkeys in Obsidian's Hotkeys settings

## Algorithm

The Smart Link algorithm works as follows:

### Single Link Creation
1. **Text Expansion**: Starting from cursor position, expands outward word by word
2. **Match Finding**: For each expansion level, searches all note titles for matches
3. **Priority Calculation**: Prioritizes matches based on:
   - Match length (longer is better)
   - Match position (earlier in selection is better)  
   - Exact match vs fuzzy match
4. **Link Creation**: Replaces matched portion with wiki link, preserving surrounding text

### All Links Creation (NEW)
1. **Line Scanning**: Processes entire line from beginning to end
2. **File Priority**: Sorts files by length (longer names first) for better matching
3. **Overlap Prevention**: Tracks processed regions to avoid duplicate links
4. **Boundary Validation**: Ensures proper word boundaries and particle handling
5. **Batch Processing**: Applies all replacements from end to beginning

## Development

### Setup

```bash
# Install dependencies  
npm install

# Development build with hot reload
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint and format code
npm run lint:fix
npm run format
```

### Project Structure

```
obsidian-smart-link/
├── main.ts              # Main plugin file
├── src/
│   └── smartLink.ts     # Core smart link logic
├── test/                # Test files
│   ├── smartLinkCore.unit.test.ts      # Core logic tests
│   ├── processAllSmartLinks.feature.test.ts  # New feature tests
│   ├── plugin.integration.test.ts      # Plugin integration tests
│   └── mocks/           # Test mocks
├── manifest.json        # Plugin manifest
├── package.json         # NPM dependencies  
└── tsconfig.json        # TypeScript configuration
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test smartLinkCore.unit.test.ts
npm test processAllSmartLinks.feature.test.ts  
npm test plugin.integration.test.ts
```

## License

MIT License - see LICENSE file for details

## Support

If you find this plugin helpful, consider:

- Starring the repository on GitHub
- Reporting bugs or suggesting features through GitHub Issues  
- Contributing to the codebase

## Changelog

### Latest Version
- ✨ **NEW**: "Create all smart links in line" command
- ✨ **NEW**: Process entire lines with multiple links at once
- ✨ **NEW**: Enhanced Korean particle handling for batch processing
- 🐛 **FIXED**: Multiline boundary handling bug
- 🧪 **IMPROVED**: Comprehensive test coverage with 30+ tests
- 📚 **IMPROVED**: Better documentation and examples

### Previous Versions
- Initial release with single link creation
- Korean agglutinative language support
- Priority-based matching algorithm
- Case sensitivity options

## Roadmap

- [ ] Add settings page for customization
- [x] ✅ Create all links in line (COMPLETED)
- [ ] Support for alias matching  
- [ ] Multi-cursor support
- [ ] Performance optimizations for very large vaults
- [ ] Support for linking to headings and blocks
- [ ] Customizable matching algorithms
- [ ] Integration with other linking plugins