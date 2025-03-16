/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

/**
 * Path to the stubs directory
 */
export const stubsRoot = dirname(fileURLToPath(import.meta.url))