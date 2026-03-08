/**
 * kandi-login init — Interactive setup wizard
 *
 * Guides through OAuth provider setup, generates config files,
 * validates Tauri commands, and opens provider developer consoles.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import open from 'open';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  printBanner,
  success,
  warning,
  info,
  getVersion,
  PROVIDER_URLS,
  PROVIDER_ENV_VARS,
} from './utils.js';

interface InitAnswers {
  platforms: string[];
  authServerUrl: string;
  apiServerUrl: string;
  deepLinkScheme: string;
  keychainService: string;
  providers: string[];
  uiFramework: string;
}

export async function runInit(): Promise<void> {
  printBanner(getVersion());
  console.log(chalk.bold('  Welcome to kandi-login setup!\n'));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answers = await (inquirer.prompt as any)([
    {
      type: 'checkbox',
      name: 'platforms',
      message: 'What platform(s) does your app target?',
      choices: [
        { name: 'Tauri', value: 'tauri' },
        { name: 'Electron', value: 'electron' },
        { name: 'Web', value: 'web' },
      ],
      validate: (input: string[]) => input.length > 0 || 'Select at least one platform',
    },
    {
      type: 'input',
      name: 'authServerUrl',
      message: 'Auth server URL:',
      default: 'https://auth.example.com',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
    {
      type: 'input',
      name: 'apiServerUrl',
      message: 'API server URL (for user profile):',
      default: (ans: InitAnswers) => ans.authServerUrl,
    },
    {
      type: 'input',
      name: 'deepLinkScheme',
      message: 'Deep link scheme (e.g., myapp):',
      when: (ans: InitAnswers) => ans.platforms.includes('tauri') || ans.platforms.includes('electron'),
      default: 'myapp',
      validate: (input: string) => /^[a-z][a-z0-9-]*$/.test(input) || 'Must be lowercase, start with a letter',
    },
    {
      type: 'input',
      name: 'keychainService',
      message: 'Keychain service name (e.g., com.example.app):',
      when: (ans: InitAnswers) => ans.platforms.includes('tauri'),
      default: (ans: InitAnswers) => `com.${ans.deepLinkScheme || 'myapp'}.app`,
    },
    {
      type: 'checkbox',
      name: 'providers',
      message: 'Which OAuth providers?',
      choices: [
        { name: 'Apple', value: 'apple' },
        { name: 'Google', value: 'google' },
        { name: 'Facebook', value: 'facebook' },
        { name: 'Hello.coop', value: 'hellocoop' },
      ],
      validate: (input: string[]) => input.length > 0 || 'Select at least one provider',
    },
    {
      type: 'list',
      name: 'uiFramework',
      message: 'UI framework:',
      choices: [
        { name: 'MUI (Material-UI)', value: 'mui' },
        { name: 'Tailwind CSS', value: 'tailwind' },
        { name: 'Headless (unstyled)', value: 'headless' },
      ],
    },
  ]) as InitAnswers;

  console.log('');

  // Open provider developer consoles
  for (const provider of answers.providers) {
    const url = PROVIDER_URLS[provider];
    if (url) {
      const { openConsole } = await inquirer.prompt<{ openConsole: boolean }>([{
        type: 'confirm',
        name: 'openConsole',
        message: `Open ${provider} developer console to create OAuth app?`,
        default: true,
      }]);

      if (openConsole) {
        info(`Opening ${url}`);
        await open(url);

        // Give user time to set up
        const providerEnv = PROVIDER_ENV_VARS[provider];
        if (providerEnv) {
          console.log(chalk.dim(`\n  You'll need these values from the ${provider} console:`));
          console.log(chalk.dim(`    - Client ID  -> ${providerEnv.clientId}`));
          console.log(chalk.dim(`    - Client Secret -> ${providerEnv.clientSecret}\n`));

          await inquirer.prompt([{
            type: 'confirm',
            name: 'ready',
            message: `Done setting up ${provider}? Press enter to continue.`,
            default: true,
          }]);
        }
      }
    }
  }

  console.log('\n  Generating files...\n');

  // Generate .env.kandi-login
  const envPath = join(process.cwd(), '.env.kandi-login');
  const envLines = [
    '# kandi-login configuration',
    '# Add these to your .env or .env.local file',
    '# IMPORTANT: Add .env.kandi-login to .gitignore!',
    '',
    `KANDI_LOGIN_AUTH_SERVER_URL=${answers.authServerUrl}`,
    `KANDI_LOGIN_API_SERVER_URL=${answers.apiServerUrl}`,
  ];

  if (answers.deepLinkScheme) {
    envLines.push(`KANDI_LOGIN_DEEP_LINK_SCHEME=${answers.deepLinkScheme}`);
  }
  if (answers.keychainService) {
    envLines.push(`KANDI_LOGIN_KEYCHAIN_SERVICE=${answers.keychainService}`);
  }

  envLines.push('');

  for (const provider of answers.providers) {
    const env = PROVIDER_ENV_VARS[provider];
    if (env) {
      envLines.push(`# ${provider}`);
      envLines.push(`${env.clientId}=`);
      envLines.push(`${env.clientSecret}=`);
      envLines.push('');
    }
  }

  writeFileSync(envPath, envLines.join('\n'));
  success(`Created ${chalk.bold('.env.kandi-login')}`);

  // Generate auth-config.ts
  const configPath = join(process.cwd(), 'src', 'auth-config.ts');
  const providerEntries = answers.providers.map(p => {
    const names: Record<string, string> = {
      apple: 'Apple',
      google: 'Google',
      facebook: 'Facebook',
      hellocoop: 'Hello.coop',
    };
    return `  { id: '${p}', name: '${names[p] ?? p}' },`;
  });

  const importPath = answers.uiFramework === 'mui'
    ? `import type { KandiLoginConfig } from 'kandi-login';`
    : `import type { KandiLoginConfig } from 'kandi-login/core';`;

  const configContent = `${importPath}

export const authConfig: KandiLoginConfig = {
  authServerUrl: process.env.KANDI_LOGIN_AUTH_SERVER_URL ?? '${answers.authServerUrl}',
  apiServerUrl: process.env.KANDI_LOGIN_API_SERVER_URL ?? '${answers.apiServerUrl}',
  providers: [
${providerEntries.join('\n')}
  ],${answers.deepLinkScheme ? `\n  deepLinkScheme: '${answers.deepLinkScheme}',` : ''}${answers.keychainService ? `\n  keychainService: '${answers.keychainService}',` : ''}
};
`;

  try {
    writeFileSync(configPath, configContent);
    success(`Created ${chalk.bold('src/auth-config.ts')}`);
  } catch {
    warning(`Could not write src/auth-config.ts (directory may not exist)`);
    info('Create it manually with the config above');
  }

  // Check Tauri commands
  if (answers.platforms.includes('tauri')) {
    console.log('');
    info('Checking Tauri Rust commands...');

    const tauriAuthPath = join(process.cwd(), 'src-tauri', 'src', 'commands', 'auth.rs');
    if (existsSync(tauriAuthPath)) {
      const content = readFileSync(tauriAuthPath, 'utf-8');
      const commands = ['start_oauth', 'get_token', 'store_token', 'clear_tokens'];
      for (const cmd of commands) {
        if (content.includes(`fn ${cmd}`) || content.includes(`async fn ${cmd}`)) {
          success(`Found: ${chalk.bold(cmd)}`);
        } else {
          warning(`Missing: ${chalk.bold(cmd)}`);
        }
      }
    } else {
      warning('No Tauri auth commands found at src-tauri/src/commands/auth.rs');
      info('Run `npx kandi-login` and select "Generate Tauri Rust commands" to create them');
    }
  }

  // Remind about .gitignore
  console.log('');
  warning('Remember to add .env.kandi-login to your .gitignore!');

  // Print next steps
  console.log('');
  console.log(chalk.bold('  Next steps:'));
  console.log('');

  const componentImport = answers.uiFramework === 'mui'
    ? "import { MuiLoginChip } from 'kandi-login/react/mui';"
    : answers.uiFramework === 'tailwind'
    ? "import { TailwindLoginChip } from 'kandi-login/tailwind';"
    : "import { HeadlessLoginChip } from 'kandi-login/react/headless';";

  console.log(chalk.dim('  1. Add AuthProvider to your app root:'));
  console.log('');
  console.log(chalk.cyan(`     import { AuthProvider } from 'kandi-login';`));
  console.log(chalk.cyan(`     import { authConfig } from './auth-config';`));
  console.log(chalk.cyan(`     `));
  console.log(chalk.cyan(`     <AuthProvider config={authConfig}>`));
  console.log(chalk.cyan(`       <App />`));
  console.log(chalk.cyan(`     </AuthProvider>`));
  console.log('');
  console.log(chalk.dim('  2. Use the login component:'));
  console.log('');
  console.log(chalk.cyan(`     ${componentImport}`));
  console.log('');
  console.log(chalk.dim(`  3. Run ${chalk.bold('npx kandi-login')} to test and debug your setup`));
  console.log('');
}
