import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// tsx's initialize hook requires a non-null data object; pass {} so the check passes.
// TSX_TSCONFIG_PATH env var is picked up by tsx for path alias resolution.
register('tsx/esm', pathToFileURL('./'), { data: {} });

await import('./job-worker.ts');
