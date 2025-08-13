# <CHORUS_TAG>README.md</CHORUS_TAG>

# Obsidian Smart Link Plugin

A powerful Obsidian plugin that intelligently creates wiki-style links with automatic context detection. Perfect for users working with languages that use agglutination (like Korean, Japanese, Turkish) or anyone who wants more efficient linking.

## Features

### 🔗 Intelligent Link Creation

Smart Link automatically processes the entire line and creates all possible smart links. It prioritizes longer, more specific matches over shorter ones.

### ⚡ Smart Matching Algorithm

The plugin uses an advanced matching algorithm that:

- Finds exact matches where note titles appear in your text
- Detects prefix matches where your text is the beginning of a note title
- Prioritizes the longest matching text for the most accurate links
- Handles word boundaries and grammatical particles intelligently

### 🌐 Universal Language Support

Designed to work perfectly with any language, including agglutinative languages:

- **Universal Unicode support**: Works with all languages through Unicode property detection
- **Agglutinative languages**: Automatically handles grammatical suffixes and particles
- **Korean, Japanese, Turkish**: Natural support for complex grammatical structures
- **English and European languages**: Standard word boundary detection
- **Mixed languages**: Seamlessly handles multilingual content

## Commands

### Create Smart Link

**Default Hotkey**: Cmd/Ctrl + Shift + K  
**Default Hotkey**: No default hotkey (assign in settings)  
Same functionality as "Create Smart Link" - processes the entire line and creates all possible smart links.

## Examples

### Smart Link Creation

#### English Examples

**Basic linking**

- You have a note called `Project Management`
- Text: "I need to improve my project management skills"
- Result: "I need to improve my [[Project Management]] skills"

**Longer match priority**

- You have notes: `World Cup` and `2022 FIFA World Cup`
- Text: "The 2022 FIFA World Cup was held in Qatar"
- Result: "The [[2022 FIFA World Cup]] was held in Qatar"

**Prefix matching **

- You have notes: `2025-08-10-Sun` and `2025-08`
- Text: "2025-08-10 test"
- Result: "[[2025-08-10-Sun]] test" (matches the longest prefix)

#### Korean Examples (Agglutinative Language)

**Particle handling**

- You have a note: `서울특별시` (Seoul)
- Text: "서울특별시에서 만났다" (Met in Seoul)
- Result: "[[서울특별시]]에서 만났다"

**Complex matching with particles**

- You have notes: `인공지능` (AI) and `생성형 인공지능` (Generative AI)
- Text: "생성형 인공지능이 발전하고 있다" (Generative AI is advancing)
- Result: "[[생성형 인공지능]]이 발전하고 있다"

### Multiple Links in a Line

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
   - **Create smart link**: Processes entire line and creates all smart links

### How It Works

1. Place your cursor anywhere on the line you want to process
2. Press the hotkey or run either command
3. The plugin will:
   - Scan the ENTIRE line from the beginning
   - Find ALL possible matches with your note titles
   - Use intelligent matching to find both exact and prefix matches
   - Prioritize longer matches for better accuracy
   - Create multiple links simultaneously
   - Skip existing `[[wiki links]]`
   - Preserve all grammatical elements and punctuation

## Key Features

### 🎯 Intelligent Matching

- **Priority-based**: Longer, more specific matches win
- **Prefix matching**: Detects when text is the beginning of a note title (e.g., "2025-08-10" matches "2025-08-10-Sun")
- **Context-aware**: Understands word boundaries and grammatical elements
- **Fuzzy matching**: Handles case differences and spacing variations

### 🔄 Existing Link Preservation

- Skips text already in `[[wiki links]]`
- Won't modify existing link structures
- Handles malformed links gracefully

### ⚙️ Smart Text Processing

- **Word boundary detection**: Respects punctuation and spacing using Unicode properties
- **Suffix preservation**: Intelligently preserves grammatical suffixes (particles, case markers, etc.)
- **Multi-word matching**: Handles phrases like "Visual Studio Code"

### 🚀 Performance Optimized

- Efficient algorithm for large vaults
- Fast processing even with hundreds of notes
- Real-time matching as you type

## Configuration

### Plugin Settings

Access plugin settings through: Settings → Community Plugins → Smart Link → Settings

#### Available Settings

- **Case sensitivity**: Toggle between case-sensitive and case-insensitive matching
- **Exclude Directories**: Prevent files in specific directories from appearing in smart link suggestions
  - Enter directory paths relative to vault root (e.g., "Templates", "Archive/Old")
  - Supports multiple entries with individual removal buttons
- **Exclude Notes**: Exclude specific notes from smart link suggestions
  - Supports regular expressions for powerful pattern matching
  - Enter exact note names or regex patterns
  - Examples:
    - `Daily Notes Template` - Exclude specific note
    - `^Draft.*` - Exclude all notes starting with "Draft"
    - `.*Template$` - Exclude all notes ending with "Template"
    - `\d{4}-\d{2}-\d{2}` - Exclude date-formatted notes (YYYY-MM-DD)
    - `(TODO|DONE|PENDING)` - Exclude notes containing status words
    - `^_.*` - Exclude all notes starting with underscore
  - Invalid regex patterns automatically fall back to exact string matching
  - Supports multiple entries with individual removal buttons

### Hotkey Configuration

- **Custom hotkeys**: Modify hotkeys in Obsidian's Hotkeys settings

## Algorithm

The Smart Link algorithm works as follows:

### Smart Link Processing

1. **Line Scanning**: Processes entire line from beginning to end
2. **Match Detection**: For each position in the line:
   - Checks for exact matches (note title appears in text)
   - Checks for prefix matches (text is a prefix of note title)
   - Prioritizes longer matching strings
3. **Match Priority**:
   - Exact matches take precedence over prefix matches
   - Among matches of same type, longer matches win
   - For prefix matches, longest matching prefix is selected
4. **Overlap Prevention**: Tracks processed regions to avoid duplicate links
5. **Boundary Validation**: Ensures proper word boundaries and particle handling
6. **Batch Processing**: Applies all replacements from end to beginning

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

- ✨ **NEW**: Universal language support through Unicode property detection
- ✨ **NEW**: Enhanced prefix matching algorithm - intelligently matches partial text with note titles
- ✨ **NEW**: Both commands now process entire lines automatically
- ✨ **NEW**: Regular expression support for exclude notes patterns
- ✨ **NEW**: Exclude directories and notes settings with UI management
- 🔄 **CHANGED**: Removed language-specific hardcoding - now uses Unicode properties for all languages
- 🔄 **CHANGED**: Unified behavior - all commands now create all possible links in a line
- 🔄 **CHANGED**: Removed separate single link creation - all operations are now batch
- 🐛 **FIXED**: Improved matching priority - longer prefixes now correctly take precedence
- 🐛 **FIXED**: Multiline boundary handling bug
- 🐛 **FIXED**: Edge cases in date pattern matching (e.g., "2025-08-10" correctly matches "2025-08-10-Sun")
- 🧪 **IMPROVED**: Comprehensive test coverage with 80+ tests
- 📚 **IMPROVED**: Better documentation and examples

### Previous Versions

- Initial release with single link creation
- Korean agglutinative language support
- Priority-based matching algorithm
- Case sensitivity options

## Roadmap

- [x] ✅ Add settings page for customization (COMPLETED)
- [x] ✅ Create all links in line (COMPLETED)
- [x] ✅ Exclude directories and notes filtering (COMPLETED)
- [x] ✅ Regular expression support for exclude patterns (COMPLETED)
- [ ] Support for alias matching
- [ ] Multi-cursor support
- [ ] Performance optimizations for very large vaults
- [ ] Support for linking to headings and blocks
- [ ] Customizable matching algorithms
- [ ] Integration with other linking plugins
