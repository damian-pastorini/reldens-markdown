## Package Overview

**@reldens/markdown** is a markdown processing package for Reldens. It provides:
- Markdown to HTML conversion
- Custom markdown extensions
- Safe HTML output (sanitization)
- Integration with CMS content

## Key Commands

```bash
# Run tests (if configured)
npm test
```

## Architecture

### Core Classes

**MarkdownProcessor**:
- Converts markdown to HTML
- Supports custom extensions
- Sanitizes output HTML
- Configurable parsing options

## Important Notes

- Used by @reldens/cms for content rendering
- No external dependencies (pure JavaScript implementation)
- Output is sanitized for security
- Supports custom markdown extensions for game-specific formatting
