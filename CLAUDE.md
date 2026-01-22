# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SillyTavern is an LLM frontend for power users - a self-hosted web application that provides a chat interface for interacting with various AI service providers. It's built with Node.js/Express on the backend and vanilla JavaScript on the frontend.

## Essential Commands

### Starting the Server

- `npm start` - Start the production server (requires Node >= 18)
- `npm run debug` - Start with Node inspector for debugging
- `npm run start:global` - Start in global mode
- `npm run start:deno` - Run using Deno
- `npm run start:bun` - Run using Bun
- `npm run start:no-csrf` - Start with CSRF protection disabled (for development)
- `npm run start:electron` - Start with Electron system tray launcher (Windows desktop app)

### Development & Quality

- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Automatically fix ESLint issues
- `npm run plugins:update` - Update all installed plugins
- `npm run plugins:install` - Install all configured plugins

### Building

- Frontend bundle: The main entry point is `public/lib.js`, which is bundled by Webpack
- Webpack automatically runs in development mode via middleware
- For production builds, Webpack outputs to `$DATA_ROOT/_webpack/`

### Testing

Tests are located in the `tests/` directory and use Playwright for E2E testing:

- `cd tests && npm install` - Install test dependencies
- `cd tests && npx playwright test` - Run all E2E tests
- `cd tests && npx playwright test <filename>` - Run a single test file
- Tests expect the server to be running on `http://127.0.0.1:8000`
- Test files match pattern `*.e2e.js` (configured in `tests/playwright.config.js`)

## Architecture

### Project Structure

```
SillyTavern/
├── server.js                 # Entry point - parses CLI args and starts server
├── src/
│   ├── server-main.js       # Express server setup, middleware, and routes
│   ├── server-startup.js    # Server initialization and router registration
│   ├── server-global.js     # Global mode entry point (bin target)
│   ├── endpoints/           # API endpoint modules (REST API)
│   ├── middleware/          # Express middleware functions
│   ├── users.js             # User authentication and session management
│   ├── plugin-loader.js     # Server plugin system
│   ├── server-events.js     # Event system for inter-component communication
│   ├── electron/            # Electron system tray launcher
│   └── util.js              # Shared utility functions
├── public/
│   ├── index.html           # Main SPA entry point
│   ├── lib.js               # Webpack entry point for bundled libraries
│   ├── scripts/             # Frontend JavaScript modules
│   └── css/                 # Stylesheets
├── plugins/                 # Server plugins directory
├── data/                    # User data storage (created at runtime)
└── tests/                   # E2E tests with Playwright
```

### Backend Architecture

**Modular Endpoints**: Each major feature has its own endpoint file in `src/endpoints/`:
- `characters.js` - Character CRUD operations, avatar handling, disk caching
- `chats.js` - Chat history management, backup system
- `openai.js`, `anthropic.js`, `google.js`, etc. - AI provider integrations
- `backends/` - Unified backend abstraction layer
- `presets.js` - Settings preset management
- `extensions.js` - Extension system with git support
- `secrets.js` - Secure credential storage

**Middleware Stack** (`src/middleware/`):
- `webpack-serve.js` - Automatic Webpack bundling in development
- `basicAuth.js` - Basic authentication
- `whitelist.js` - IP whitelist enforcement
- `corsProxy.js` - CORS proxy for external requests
- `cacheBuster.js` - Cache invalidation for static assets
- `accessLogWriter.js` - Request logging

**User System** (`src/users.js`):
- Multi-user support with separate data directories
- Session management with cookie sessions
- CSRF protection via csrf-sync
- User directories defined by `DATA_ROOT` global variable

### Frontend Architecture

**Entry Point**: `public/index.html` loads the application

**Module System**:
- Main libraries bundled via Webpack from `public/lib.js`
- Individual modules in `public/scripts/` loaded via ES modules
- No framework - vanilla JavaScript with jQuery
- Uses ES modules (`type="module"`)
- Main script: `public/script.js` (entry point that imports all other modules)

**Key Frontend Modules**:
- `chats.js` - Chat UI and message handling
- `openai.js` - OpenAI-specific UI logic, Message classes, tokenization
- `macros.js` - Legacy macro system (being replaced by `macros/macro-system.js`)
- `slash-commands/` - Custom slash command parser and executor
- `PromptManager.js` - Chat completion prompt management
- `extensions/` - Frontend extensions (TTS, quick replies, token counter, etc.)
- `world-info.js` - World info management UI
- `group-chats.js` - Multi-character chat support
- `power-user.js` - Advanced user features and settings
- `instruct-mode.js` - Instruction mode template handling
- `variables.js` - Chat variable system

**Frontend Utilities**:
- `utils.js` - Common utility functions (debounce, UUID, HTML escaping)
- `constants.js` - Frontend constants (debounce timeouts, event types, etc.)
- `events.js` - Event system constants and utilities
- `RossAscends-mods.js` - UI modifications and mobile handling
- `popup.js` - Custom popup/modal system
- `i18n.js` - Internationalization support

### Extension Systems

**Server Plugins** (`src/plugin-loader.js`):
- Optional plugin system (disabled by default)
- Supports both CommonJS and ES modules
- Plugins stored in `plugins/` directory
- Auto-update capabilities

**UI Extensions** (`src/endpoints/extensions.js`):
- Git-based extension management
- Extensions can add UI components and modify behavior
- Frontend extensions in `public/scripts/extensions/`
- Includes: Quick Replies, TTS, Token Counter, Gallery, Connection Manager

### Data Management

**Storage Structure** (under `DATA_ROOT`):
- `characters/` - Character card files (PNG with embedded metadata)
- `chats/` - Chat history (JSON format per chat)
- `groups/` - Group chat definitions
- `extensions/` - Third-party extensions
- `context/` - Chat completion templates (context templates)
- `instruct/` - Instruction mode templates
- `thumbnails/` - Cached thumbnails (bg, avatar, persona)
- `worlds/` - World info books
- `themes/` - Custom UI themes
- `vectors/` - Vector database files
- `_cache/` - Disk cache for characters and other data

**Character Cards**:
- Support for Tavern, Character Hub, and CharX formats
- PNG embedding with metadata chunks (PNG chunk text/ChuRa)
- Disk caching for performance (`DiskCache` class in `src/endpoints/characters.js`)
- Parsers: `TavernCardValidator`, `ByafParser`, `CharXParser` in `src/`

**Configuration**:
- Main config: `config.yaml` (created from `default/config.yaml` if missing)
- Config initialization in `src/config-init.js`
- Post-install script (`post-install.js`) handles config migrations
- User settings stored as JSON in `DATA_ROOT`

**User Data Directories**:
- Multi-user support with isolated `DATA_ROOT` per user
- Template structure defined in `src/constants.js` (`USER_DIRECTORY_TEMPLATE`)
- User management via `src/users.js`

### AI Provider Integration Pattern

All AI providers follow a consistent pattern:
1. Endpoint file in `src/endpoints/` (e.g., `openai.js`) - handles API routes
2. Backend abstraction in `src/endpoints/backends/` - unified generation interfaces
3. Frontend UI in `public/scripts/` (e.g., `openai.js`) - settings UI and state management
4. Preset management via shared preset system

**Backend Abstraction Layer** (`src/endpoints/backends/`):
- `chat-completions.js` - ChatCompletion API format (OpenAI-compatible)
- `text-completions.js` - TextCompletion API format (legacy)
- `kobold.js` - KoboldAI-specific API

**Unified Source Handling**:
The `chat-completions.js` backend handles multiple providers through a single interface:
- OpenAI, Azure OpenAI, Anthropic (Claude), Google (Gemini)
- OpenRouter, Mistral, Cohere, AI21, XAI, and more
- Converts provider-specific formats to standard chat completion format
- Handles streaming responses, tool calling, multimodal content

**Key Providers**:
- OpenAI (including compatible APIs)
- Anthropic (Claude)
- Google (Gemini, Vertex AI)
- OpenRouter (aggregator)
- NovelAI
- Horde (crowd-sourced)
- And 40+ other providers

### Security Features

- CSRF protection on all state-changing endpoints via csrf-sync
- Session-based authentication with secure cookies
- Basic auth support for deployment
- IP whitelist support
- Host whitelist middleware
- Input sanitization via DOMPurify (frontend)
- File upload validation and sandboxing
- Secret management separate from user data

### Electron System Tray Launcher (`src/electron/`)

**Purpose**: Windows desktop application providing system tray integration and background server management

**Key Files**:
- `index.js` - Main Electron process (tray, server lifecycle, IPC handlers)
- `log-window.js` - Log viewer window management
- `log-viewer.html` / `log-viewer.js` - Log UI and logic
- `log-viewer-preload.js` - Secure IPC bridge (contextIsolation enabled)
- `electron-builder.json` - Packaging configuration

**Architecture Notes**:
- Spawns server as child process via `spawn(process.execPath, [serverPath])`
- Server process runs independently; events communicated via stdout/stderr
- Cannot use in-process `serverEvents` EventEmitter (different processes)
- Detects server startup by parsing stdout for "SillyTavern is listening on" message
- Security: `nodeIntegration: false`, `contextIsolation: true`, preload scripts for IPC
- State management: `isServerRunning`, `isStarting` flags prevent race conditions

**Building**:
```bash
cd src/electron
npm install
npm run build:portable  # Portable exe (dist/electron/)
npm run build:nsis      # NSIS installer
```

**Common Issues**:
- Server path resolution: Uses `src/server-global.js`, not root `server-global.js`
- Event system: `serverEvents` doesn't work across process boundary; use stdout parsing
- Memory leaks: Always cleanup event listeners and timeouts
- Icon files: Requires `public/st-launcher.ico` and `public/favicon.ico`

### Core Systems

**Event System** (`src/server-events.js`, `public/scripts/events.js`):
- Server-side: `serverEvents` EventEmitter for inter-component communication
- Client-side: `eventSource` with standardized `event_types` constants
- Events trigger before/after key operations (settings loaded, message generated, etc.)
- Pattern: `eventSource.on(event_types.SETTINGS_LOADED_BEFORE, callback)`

**Macro System** (`public/scripts/macros/`):
- New macro engine in `macro-system.js` with registration API
- Legacy `MacrosParser` class being phased out
- Macros support: Handlebars helpers, custom functions, variable substitution
- Registration: `macros.registry.registerMacro(name, fn, options)`
- Used in story string rendering and prompt building

**Prompt Manager** (`public/scripts/PromptManager.js`):
- Manages chat completion prompts with depth-based injection
- Supports relative/absolute positioning, cyclic prompts, role-specific prompts
- Migrates old settings (main_prompt, nsfw_prompt, jailbreak_prompt) to new format
- Integration with context templates and instruct modes

**Slash Commands** (`public/scripts/slash-commands/`):
- Custom command parser and executor using Chevrotain
- Command registry with named/unnamed arguments, auto-complete
- Scope-based execution (global, chat, character)
- Integration with macros, variables, and quick replies

### Webpack Build System

**Entry Point**: `public/lib.js` exports bundled libraries to the frontend

**Key Features**:
- Filesystem caching for faster rebuilds
- Output module format (ES modules)
- Development mode via middleware (auto-rebuild)
- Production builds cached in `$DATA_ROOT/_webpack/`
- Configured for Node.js compatibility

**Exposed Libraries**:
- lodash, Fuse.js, DOMPurify, highlight.js, localforage, Handlebars
- Bowser, DiffMatchPatch, Readability, SVGInject, showdown, moment
- seedrandom, Popper, droll, morphdom, slideToggle, chalk, yaml, chevrotain

## Development Workflow

### Before Making Changes

1. Run `npm install` to install dependencies
2. Review existing code patterns in the relevant module
3. Check ESLint configuration in `.eslintrc.cjs`

### Code Style

**ESLint Rules** (from `.eslintrc.cjs`):
- 4-space indentation
- Single quotes for strings
- Semicolons required
- No trailing whitespace
- Comma dangle on multiline
- ES6+ syntax (modules, async/await, etc.)

**File Organization**:
- Server files: `src/**/*.js` (ES modules, Node environment)
- Client files: `public/**/*.js` (ES modules, browser environment)
- Use existing patterns for new endpoints and UI components

### Testing Your Changes

1. Start the server: `npm start`
2. Open browser to the configured URL (default: `http://localhost:8000`)
3. Test your changes manually
4. Run `npm run lint` to check for issues
5. For E2E tests: `cd tests && npx playwright test` (requires server running)

### Common Patterns

**Adding a New Endpoint**:
1. Create file in `src/endpoints/`
2. Export an Express Router: `export const router = express.Router();`
3. Import and register in `src/server-startup.js`
4. Add corresponding frontend code in `public/scripts/`

**Frontend API Calls**:
- Use standard `fetch()` for all API calls
- URLs follow pattern: `/api/<resource>/<action>`
- CSRF tokens required for state-changing operations
- Example:
  ```javascript
  const response = await fetch('/api/characters/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ... }),
  });
  const data = await response.json();
  ```

**Adding Frontend Functionality**:
1. Create new module in `public/scripts/`
2. Import in `public/index.html` if needed (modules use `type="module"`)
3. Follow existing patterns for event handling and API calls
4. Use `eventSource.on(event_types.EVENT_NAME, callback)` for system events
5. Import utilities from `lib.js` for bundled libraries

**Working with Characters**:
- Use `DiskCache` class in `src/endpoints/characters.js` for performance
- Character cards are PNG files with embedded metadata (Tavern, Character Hub, CharX formats)
- Avatar handling via `src/endpoints/avatars.js`
- Shallow loading option for large character lists

**Working with Chat Messages**:
- Messages stored in chat files under `DATA_ROOT/chats/`
- Use chat completion templates from `context/` and `instruct/` directories
- World info integration via `public/scripts/world-info.js`
- Message object structure defined in `public/scripts/openai.js`

**Working with Electron Launcher**:
- Server runs as child process spawned by Electron main process
- Communication via stdout/stderr parsing, not in-process events
- Always check `isServerRunning` and `isStarting` flags before operations
- Clean up event listeners in all code paths (success, error, timeout, exit)
- Use `contextBridge` in preload scripts for secure IPC
- Never use `nodeIntegration: true` or disable `contextIsolation`
- Test state transitions: IDLE → STARTING → RUNNING → IDLE

## Important Notes

### Global Variables

- `globalThis.DATA_ROOT` - User data directory path
- `globalThis.COMMAND_LINE_ARGS` - Parsed CLI arguments
- `process.serverEvents` - Global event emitter (created by `src/server-events.js`)

### Server Entry Points

SillyTavern has multiple server entry points depending on how it's started:
- `server.js` - Standard entry point, parses CLI args and starts server
- `src/server-global.js` - Global mode entry point (used by `npm run start:global` and Electron launcher)
- `src/server-main.js` - Express app setup and middleware registration
- `src/server-startup.js` - Router initialization and server start logic

### Multi-User Support

The application supports multiple users with isolated data:
- Each user has their own `DATA_ROOT`
- Sessions managed via cookies
- User directories configured in `config.yaml`

### Extension Development

Extensions can modify and extend functionality:
- Git-based for automatic updates
- Frontend extensions add UI components
- Server plugins add backend functionality
- See docs: https://docs.sillytavern.app/for-contributors/

### Migration System

Data migrations handled in:
- `src/users.js` - User data migrations
- Individual endpoint files - Feature-specific migrations
- `post-install.js` - Config migrations

### Performance Considerations

- Disk caching for character data (`DiskCache` class)
- Memory-limited caching (`MemoryLimitedMap` in `src/util.js`)
- Lazy loading for large character lists (`performance.lazyLoadCharacters` config)
- Webpack filesystem caching for faster rebuilds
- Compression middleware for responses
- Response-time tracking for monitoring
- Configurable memory cache capacity (default: 100MB)

### Context Building Flow

When generating a response:
1. **Prompt Assembly**: `PromptManager` gathers prompts from various sources
2. **Macro Substitution**: `substituteParams()` replaces macros and variables
3. **World Info**: `getWorldInfoPrompt()` injects triggered entries
4. **Character Data**: Character description, personality, examples added
5. **Chat History**: Recent messages formatted according to instruct mode
6. **Message Tokenization**: Token count calculated for context limits
7. **API Request**: Request sent to appropriate backend endpoint

Key files: `public/scripts/PromptManager.js`, `public/scripts/world-info.js`, `public/scripts/instruct-mode.js`

## Configuration

### Main Config File

`config.yaml` controls server behavior:
- Port and host settings
- Authentication settings
- Upload limits
- CORS settings
- Plugin configuration
- And much more

Default config in `default/config.yaml`, copied on first run if missing.

### Environment Variables

- `NODE_ENV` - Environment (development/production)
- Server respects standard Node.js environment conventions

### Electron Packaging

The Electron launcher packages the entire SillyTavern application:
- Configured in `src/electron/electron-builder.json`
- Uses `extraResources` to bundle entire SillyTavern project
- Output: `dist/electron/SillyTavern-{Portable,Setup}-x.x.x.exe`
- Size: ~400-500MB (includes Electron runtime + all dependencies)
- Supports both portable exe and NSIS installer formats
- Requires icon files: `public/st-launcher.ico`, `public/favicon.ico`

## Git Workflow

From `CONTRIBUTING.md`:
- Target pull requests at `staging` branch (99% of contributions)
- Keep PRs under 200 lines of code when possible
- Use English for commit messages, PR descriptions, and code comments
- Run `npm run lint` and fix issues before committing
- Allow maintainer edits for smoother review process
