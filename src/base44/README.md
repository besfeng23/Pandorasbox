# Base44 - Unified Gateway Layer

**Phase 15: Unified Gateway Layer (Base44)**

Base44 is the unified gateway middleware for Pandora's Box, providing API gateway functionality including routing, authentication, rate limiting, and request/response transformation.

## Structure

```
/base44/
├── index.ts          # Main Base44 gateway implementation
├── logs/             # Auto-created runtime logs directory
│   └── .gitkeep      # Keeps directory in git (logs are gitignored)
└── package.json      # Optional module package.json
```

## Features

- **Authentication Middleware**: Supports multiple auth providers (Firebase, GitHub)
- **Rate Limiting**: Configurable rate limits per request
- **CORS Support**: Configurable CORS headers
- **Request/Response Transformation**: Middleware for request/response manipulation
- **Structured Logging**: Auto-created logs directory with date-based log files
- **TypeScript Support**: Fully typed with TypeScript interfaces

## Usage

```typescript
import { createBase44Gateway, defaultBase44Config } from '@/base44';

// Create gateway with default config
const gateway = createBase44Gateway();

// Or with custom config
const gateway = createBase44Gateway({
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100,
  },
  authentication: {
    required: true,
    providers: ['firebase'],
  },
});

// Process request
const response = await gateway.processRequest(request);
```

## Logging

Logs are automatically written to `src/base44/logs/` with the format:
- `base44-info-{date}.log`
- `base44-error-{date}.log`
- `base44-warn-{date}.log`
- `base44-debug-{date}.log`

Log files are gitignored but the directory structure is preserved.

## Configuration

See `Base44Config` interface in `index.ts` for all configuration options.

## Status

✅ **Active** - Phase 15 implementation
🔗 **Dependencies**: Phase 13 (Unified Cognition), Phase 14 (Distributed Subnetworks)

