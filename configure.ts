/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  let shouldInstallPackages: boolean | undefined = command.parsedFlags.install

  /**
   * Prompt when `install` or `--no-install` flags are
   * not used
   */
  if (shouldInstallPackages === undefined) {
    shouldInstallPackages = await command.prompt.confirm(
      'Do you want to install additional packages required by "mongo-adonis"?'
    )
  }

  const codemods = await command.createCodemods()

  /**
   * Create MongoDB config file
   */
  await codemods.makeUsingStub(stubsRoot, 'mongodb.stub', {})

  /**
   * Add environment variables
   */
  await codemods.defineEnvVariables({
    MONGODB_CONNECTION: 'mongodb',
    MONGODB_HOST: '127.0.0.1',
    MONGODB_PORT: '27017',
    MONGODB_USER: '',
    MONGODB_PASSWORD: '',
    MONGODB_DATABASE: 'lucid'
  })

  /**
   * Register provider
   */
  await codemods.updateRcFile((rcFile: any) => {
    rcFile.addProvider('mongo-adonis/database_provider')
  })

  /**
   * Install required packages
   */
  if (shouldInstallPackages) {
    // Log a message to install the package manually
    command.logger.info('Please install the mongodb package manually: npm install mongodb@6.5.0')
  }

  command.logger.success('Configured mongo-adonis package')
}