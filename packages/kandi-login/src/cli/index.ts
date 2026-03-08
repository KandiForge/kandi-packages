/**
 * kandi-login CLI
 *
 * Usage:
 *   npx kandi-login init    — First-time interactive setup
 *   npx kandi-login          — Dev/debug wizard (re-runnable)
 */

import { Command } from 'commander';
import { runInit } from './init.js';
import { runDev } from './dev.js';
import { getVersion } from './utils.js';

const program = new Command();

program
  .name('kandi-login')
  .description('Universal OAuth login component for React')
  .version(getVersion());

program
  .command('init')
  .description('Interactive setup wizard for a new project')
  .action(runInit);

// Default command (no subcommand) — dev wizard
program
  .action(runDev);

program.parse();
