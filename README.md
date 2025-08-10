# Obsidian Smart Link Plugin

A powerful Obsidian plugin that intelligently creates wiki-style links with automatic context detection. Perfect for users working with languages that use agglutination (like Korean, Japanese, Turkish) or anyone who wants more efficient linking.

## Features

### Intelligent Link Creation

Smart Link analyzes the context around your cursor to automatically create the most appropriate link. It prioritizes longer, more specific matches over shorter ones.

### Examples

#### English Examples

**Scenario 1: Basic linking**

- You have a note called `Project Management`
- Text: "I need to improve my project management skills"
- When you place cursor on "project management" and trigger Smart Link
- Result: "I need to improve my [[Project Management]] skills"

**Scenario 2: Longer match priority**

- You have notes: `World Cup` and `2022 FIFA World Cup`
- Text: "The 2022 FIFA World Cup was held in Qatar"
- Cursor on "World Cup"
- Result: "The [[2022 FIFA World Cup]] was held in Qatar"
- (Chooses the longer, more specific match)

#### Korean Examples (Agglutinative Language)

**Scenario 1: Particle handling**

- You have a note: `서울특별시` (Seoul)
- Text: "서울특별시에서 만났다" (Met in Seoul)
- Cursor on "서울특별시에서"
- Result: "[[서울특별시]]에서 만났다"
- (Correctly separates the particle "에서" from the link)

**Scenario 2: Complex matching**

- You have notes: `인공지능` (AI) and `생성형 인공지능` (Generative AI)
- Text: "생성형 인공지능이 발전하고 있다" (Generative AI is advancing)
- Cursor on "인공지능"
- Result: "[[생성형 인공지능]]이 발전하고 있다"
- (Chooses the more specific match)

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

### Default Hotkey

- **Cmd/Ctrl + Shift + K**: Create smart link at cursor position

### How it Works

1. Place your cursor on or near the text you want to link
2. Press the hotkey or run the "Create smart link" command
3. The plugin will:
   - Expand from cursor position to find potential matches
   - Search all your notes for the best matching title
   - Replace the text with a properly formatted link
   - Preserve any grammatical particles or suffixes outside the link

## Development

### Setup

```bash
# Install dependencies
npm install

# Development build with hot reload
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
obsidian-smart-link/
├── main.ts           # Main plugin file
├── manifest.json     # Plugin manifest
├── package.json      # NPM dependencies
├── tsconfig.json     # TypeScript configuration
├── .eslintrc.json    # ESLint configuration
├── .prettierrc.json  # Prettier configuration
└── esbuild.config.mjs # Build configuration
```

## Configuration

The plugin currently supports:

- **Case sensitivity**: Toggle between case-sensitive and case-insensitive matching
- **Custom hotkey**: Modify the hotkey in Obsidian's Hotkeys settings

## Algorithm

The Smart Link algorithm works as follows:

1. **Text Expansion**: Starting from cursor position, expands outward word by word
2. **Match Finding**: For each expansion level, searches all note titles for matches
3. **Priority Calculation**: Prioritizes matches based on:
   - Match length (longer is better)
   - Match position (earlier in the selection is better)
   - Exact match vs fuzzy match
4. **Link Creation**: Replaces the matched portion with a wiki link, preserving surrounding text

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - see LICENSE file for details

## Support

If you find this plugin helpful, consider:

- Starring the repository on GitHub
- Reporting bugs or suggesting features through GitHub Issues
- Contributing to the codebase

## Roadmap

- [ ] Add settings page for customization
- [ ] Support for alias matching
- [ ] Multi-cursor support
- [ ] Fuzzy matching improvements
- [ ] Performance optimizations for large vaults
- [ ] Support for linking to headings
- [ ] Customizable matching algorithms
