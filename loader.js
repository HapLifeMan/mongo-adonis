/**
 * This loader script replaces the deprecated --loader flag with the new register() API.
 * It's used to load TypeScript files directly in Node.js using ts-node/esm.
 *
 * This approach avoids the ExperimentalWarning about --experimental-loader being deprecated.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register ts-node/esm loader using the new API
register('ts-node/esm', pathToFileURL('./'));