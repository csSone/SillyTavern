# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SillyTavern is a self-hosted web-based frontend for AI language model chat interfaces. It supports multiple AI backends (OpenAI, Anthropic Claude, Ollama, NovelAI, etc.) and provides a rich UI for role-playing conversations with AI characters, featuring image generation, voice synthesis, translation, and extensive customization.

## Development Commands

### Starting the Application
- `npm start` - Start production server
- `npm run debug` - Start with Node.js debugging enabled (`--inspect`)
- `npm start:no-csrf` - Start without CSRF protection (development only)

### Alternative Runtime Support
- `npm run start:electron` - Start using Electron wrapper
- `npm run start:deno` - Start using Deno runtime
- `npm run start:bun` - Start using Bun runtime

### Code Quality
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Auto-fix ESLint issues

### Plugin Management
- `npm run plugins:update` - Update installed plugins
- `npm run plugins:install` - Install plugins

### Build Process
- Webpack bundles frontend libraries automatically on start
- Frontend assets are served from `public/` directory
- Development uses hot reload for UI changes

## Architecture Overview

### Backend Structure (Node.js + Express)
- **Entry Point**: `server.js` - Main Express server with middleware setup
- **API Endpoints**: `src/endpoints/` - Modular route handlers organized by feature
  - `characters.js` - Character CRUD operations
  - `chats.js` - Chat history and management
  - `openai.js`, `anthropic.js`, `novelai.js` - AI provider integrations
  - `stable-diffusion.js` - Image generation
  - `users-*.js` - User management and authentication
- **Middleware**: `src/middleware/` - Express middleware for security, logging, etc.
- **Utilities**: `src/util.js` - Shared utility functions
- **Plugin System**: `src/plugin-loader.js` - Dynamic plugin loading

### Frontend Structure (Vanilla JS + jQuery)
- **Main Entry**: `public/index.html` + `public/script.js`
- **Styling**: Multiple CSS files with Tailwind-inspired utilities
- **Extensions**: `public/scripts/extensions/` - UI extensions
- **No modern framework** - Uses jQuery for DOM manipulation and event handling

### Key Configuration
- **Main Config**: `config.yaml` - Comprehensive application settings
- **User Data**: `data/` directory (auto-created) - Per-user storage
- **Server Settings**: Port (default: 7765), security, AI provider configs

## Development Guidelines

### Code Style
- ESLint configuration in `.eslintrc.cjs`
- 4-space indentation, single quotes, semicolons required
- ES6 modules (`import`/`export`)
- Follow existing naming conventions

### File Organization Patterns
- Backend code in `src/` directory
- Frontend code in `public/` directory
- API endpoints organized by feature/domain
- User data separated from application code
- Configuration at root level

### Security Considerations
- CSRF protection enabled by default
- IP whitelisting available
- Rate limiting built-in
- File upload restrictions
- Input sanitization with DOMPurify

### Testing
- Minimal test infrastructure (Jest setup in `tests/`)
- Primary testing done manually or through community feedback
- No comprehensive automated test suite currently

## Important Patterns

### Multi-Backend AI Integration
- Interface pattern for different AI providers
- Backend-specific adapters in `src/endpoints/backends/`
- Unified API response format across providers

### User Data Management
- File-based storage with JSON format
- Per-user directories under `data/`
- Automatic backup system
- Migration system for data format updates

### Plugin/Extension Architecture
- Server plugins in `plugins/` directory
- UI extensions in `public/scripts/extensions/`
- Dynamic loading at runtime
- Plugin lifecycle management (init/cleanup)

### Configuration Management
- YAML-based configuration
- Environment-specific settings
- Hot reload for most configuration changes
- Security-sensitive settings separated

## Common Development Tasks

### Adding New AI Provider
1. Create endpoint file in `src/endpoints/`
2. Follow existing provider patterns (see `openai.js`, `anthropic.js`)
3. Add configuration options to `config.yaml` schema
4. Update UI to include new provider options

### Adding UI Extension
1. Create file in `public/scripts/extensions/`
2. Follow existing extension patterns
3. Use jQuery for DOM manipulation
4. Register extension in main UI initialization

### Adding Server Plugin
1. Create plugin in `plugins/` directory
2. Export required functions (init, cleanup)
3. Use plugin API for extending functionality
4. Test plugin loading with `npm run plugins:update`

### API Endpoint Development
1. Create new file in `src/endpoints/`
2. Use Express router pattern
3. Include proper error handling and validation
4. Add authentication middleware if needed
5. Follow RESTful conventions where applicable

## Branch Strategy
- `release` - Main stable branch
- `staging` - Development and testing branch
- Most contributions should target `staging` branch
- Hotfixes may go directly to `release`