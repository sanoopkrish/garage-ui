# Auto-Generated Types & Enums

This directory contains auto-generated TypeScript types and enums from the backend API.

## ⚠️ DO NOT EDIT MANUALLY

All files in this directory are automatically generated. Any manual changes will be overwritten.

## Usage in Frontend

```typescript
// Import all types and enums
import { Gender, CreateClientType, FamilyType } from '@/types/generated';

// Or import specific items
import { Gender, GenderLabels } from '@/types/generated/enums/family';
import { CreateClientType } from '@/types/generated/types/family.types';

// Import module configuration (single source of truth)
import {
  CONFIGURABLE_MODULE_KEYS,
  MODULE_SUBMODULES,
  getDefaultEnabledModules
} from '@/types/generated/constants/module-configuration';
```

## Regenerating Types

To regenerate types after backend changes:

```bash
npm run generate:types
```

## Structure

- `enums/` - All backend enums with helper functions
- `types/` - TypeScript interfaces generated from DTOs
- `constants/` - Shared constants (module configuration, etc.)
- `index.ts` - Barrel export for convenient imports

## Generated Files

Last generated: 2026-07-20T11:43:10.992Z

