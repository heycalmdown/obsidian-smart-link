# Obsidian Smart Link Development Rules

## Code Quality Rules

### 1. Lint Auto Fix Rule
**ALWAYS run lint auto fix after completing any code changes:**
```bash
npm run lint:fix
```

This rule must be followed after:
- Writing new code
- Modifying existing code  
- Refactoring
- Bug fixes
- Any file changes

### 2. Available Commands
- `npm run lint` - Check for linting issues
- `npm run lint:fix` - Auto fix linting issues
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run build` - Build the project

### 3. Development Workflow
1. Make code changes
2. Run `npm run lint:fix` (MANDATORY)
3. Run tests if applicable
4. Commit changes

This ensures consistent code quality and formatting across the project.