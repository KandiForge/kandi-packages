/**
 * kandi-login dev wizard — Re-runnable diagnostic and setup tool
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import open from 'open';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  printBanner,
  success,
  warning,
  error as logError,
  info,
  getVersion,
  PROVIDER_URLS,
} from './utils.js';

interface MenuAnswer {
  action: string;
}

export async function runDev(): Promise<void> {
  printBanner(getVersion());

  // Detect platform
  const hasTauri = existsSync(join(process.cwd(), 'src-tauri'));
  const hasElectron = existsSync(join(process.cwd(), 'electron'));
  const platform = hasTauri ? 'Tauri' : hasElectron ? 'Electron' : 'Web';

  // Load config
  const envPath = join(process.cwd(), '.env.kandi-login');
  const hasConfig = existsSync(envPath);
  const authUrl = hasConfig
    ? readEnvVar(envPath, 'KANDI_LOGIN_AUTH_SERVER_URL')
    : null;

  console.log(
    `  Platform: ${chalk.bold(platform)} | ` +
    `Auth: ${authUrl ? chalk.green(authUrl) : chalk.yellow('not configured')}`,
  );
  console.log('');

  let running = true;
  while (running) {
    const { action } = await inquirer.prompt<MenuAnswer>([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '1. Test auth server connection', value: 'test-server' },
        { name: '2. Test OAuth flow (opens browser)', value: 'test-oauth' },
        { name: '3. Validate .env configuration', value: 'validate' },
        { name: '4. Open provider developer consoles', value: 'open-consoles' },
        ...(hasTauri
          ? [{ name: '5. Check/Generate Tauri Rust commands', value: 'tauri-commands' }]
          : []),
        { name: '6. Show current config summary', value: 'summary' },
        new inquirer.Separator(),
        { name: 'Exit', value: 'exit' },
      ],
    }]);

    console.log('');

    switch (action) {
      case 'test-server':
        await testServerConnection(authUrl);
        break;
      case 'test-oauth':
        await testOAuthFlow(authUrl);
        break;
      case 'validate':
        validateEnvConfig(envPath);
        break;
      case 'open-consoles':
        await openProviderConsoles();
        break;
      case 'tauri-commands':
        await checkTauriCommands();
        break;
      case 'summary':
        showConfigSummary(envPath, platform);
        break;
      case 'exit':
        running = false;
        break;
    }

    console.log('');
  }
}

async function testServerConnection(authUrl: string | null): Promise<void> {
  if (!authUrl) {
    logError('No auth server URL configured. Run `npx kandi-login init` first.');
    return;
  }

  info(`Testing ${authUrl}...`);

  try {
    const start = Date.now();
    const response = await fetch(authUrl, { method: 'HEAD' });
    const elapsed = Date.now() - start;

    if (response.ok || response.status === 404 || response.status === 405) {
      success(`Server responding (${response.status}, ${elapsed}ms)`);
    } else {
      warning(`Server returned ${response.status} (${elapsed}ms)`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError(`Connection failed: ${message}`);
  }
}

async function testOAuthFlow(authUrl: string | null): Promise<void> {
  if (!authUrl) {
    logError('No auth server URL configured. Run `npx kandi-login init` first.');
    return;
  }

  const loginUrl = `${authUrl}/api/mobile/login`;
  info(`Opening ${loginUrl} in your browser...`);
  info('Complete the OAuth flow to verify it works.');

  try {
    await open(loginUrl);
    success('Browser opened. Check the flow completes correctly.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError(`Could not open browser: ${message}`);
    info(`Manually open: ${loginUrl}`);
  }
}

function validateEnvConfig(envPath: string): void {
  if (!existsSync(envPath)) {
    logError('.env.kandi-login not found. Run `npx kandi-login init` first.');
    return;
  }

  const content = readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  let issues = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (!value) {
      warning(`${key} is empty`);
      issues++;
    } else {
      success(`${key} = ${chalk.dim(value.substring(0, 30) + (value.length > 30 ? '...' : ''))}`);
    }
  }

  if (issues === 0) {
    success('All variables are set!');
  } else {
    warning(`${issues} variable(s) need values`);
  }
}

async function openProviderConsoles(): Promise<void> {
  const { providers } = await inquirer.prompt<{ providers: string[] }>([{
    type: 'checkbox',
    name: 'providers',
    message: 'Which provider consoles to open?',
    choices: Object.entries(PROVIDER_URLS).map(([id, url]) => ({
      name: `${id} (${url})`,
      value: id,
    })),
  }]);

  for (const provider of providers) {
    const url = PROVIDER_URLS[provider];
    if (url) {
      info(`Opening ${provider}: ${url}`);
      await open(url);
    }
  }
}

async function checkTauriCommands(): Promise<void> {
  const authRsPath = join(process.cwd(), 'src-tauri', 'src', 'commands', 'auth.rs');
  const commands = ['start_oauth', 'get_token', 'store_token', 'clear_tokens'];

  if (existsSync(authRsPath)) {
    const content = readFileSync(authRsPath, 'utf-8');
    let allFound = true;

    for (const cmd of commands) {
      if (content.includes(`fn ${cmd}`) || content.includes(`async fn ${cmd}`)) {
        success(`Found: ${chalk.bold(cmd)}`);
      } else {
        warning(`Missing: ${chalk.bold(cmd)}`);
        allFound = false;
      }
    }

    if (allFound) {
      success('All required Tauri commands present!');
    }
  } else {
    warning('No auth.rs found');

    const { generate } = await inquirer.prompt<{ generate: boolean }>([{
      type: 'confirm',
      name: 'generate',
      message: 'Generate Tauri Rust command template?',
      default: true,
    }]);

    if (generate) {
      await generateTauriTemplate();
    }
  }
}

async function generateTauriTemplate(): Promise<void> {
  // Read the template from the package
  const templatePath = join(import.meta.dirname, '..', '..', 'tauri-plugin', 'commands.rs.template');
  let template: string;

  if (existsSync(templatePath)) {
    template = readFileSync(templatePath, 'utf-8');
  } else {
    template = getDefaultRustTemplate();
  }

  // Get deep link scheme
  const envPath = join(process.cwd(), '.env.kandi-login');
  let scheme = 'myapp';
  if (existsSync(envPath)) {
    scheme = readEnvVar(envPath, 'KANDI_LOGIN_DEEP_LINK_SCHEME') ?? 'myapp';
  }

  template = template.replace(/{{DEEP_LINK_SCHEME}}/g, scheme);

  const outputPath = join(process.cwd(), 'src-tauri', 'src', 'commands', 'auth.rs');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, template);
  success(`Generated ${chalk.bold('src-tauri/src/commands/auth.rs')}`);
  info('Add the commands to your Tauri app builder.');
}

function showConfigSummary(envPath: string, platform: string): void {
  info(`Platform: ${platform}`);

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      console.log(`  ${chalk.dim(key)}: ${value || chalk.yellow('(empty)')}`);
    }
  } else {
    warning('No .env.kandi-login found');
  }
}

function readEnvVar(envPath: string, key: string): string | null {
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${key}=`)) {
        return trimmed.substring(key.length + 1).trim() || null;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

function getDefaultRustTemplate(): string {
  return `use serde::Serialize;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl};
use tauri::webview::WebviewWindowBuilder;
use url::Url;

#[derive(Clone, Serialize)]
struct OAuthCallbackPayload {
    access_token: Option<String>,
    refresh_token: Option<String>,
    error: Option<String>,
}

#[tauri::command]
pub async fn start_oauth(app: AppHandle, provider: Option<String>) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("oauth") {
        let _ = existing.close();
    }

    let mut auth_url = Url::parse("{{AUTH_SERVER_URL}}/api/mobile/login")
        .map_err(|e| e.to_string())?;

    {
        let mut pairs = auth_url.query_pairs_mut();
        pairs.append_pair("return_url", "{{DEEP_LINK_SCHEME}}://auth/callback");
        if let Some(ref p) = provider {
            pairs.append_pair("provider", p);
        }
    }

    let app_handle = app.clone();

    WebviewWindowBuilder::new(&app, "oauth", WebviewUrl::External(auth_url))
        .title("Sign In")
        .inner_size(500.0, 700.0)
        .center()
        .resizable(false)
        .on_navigation(move |url| {
            let url_str = url.as_str();
            if url_str.starts_with("{{DEEP_LINK_SCHEME}}://") {
                let payload = if let Ok(parsed) = Url::parse(url_str) {
                    let params: HashMap<String, String> = parsed
                        .query_pairs()
                        .map(|(k, v)| (k.to_string(), v.to_string()))
                        .collect();

                    if let Some(error) = params.get("error") {
                        OAuthCallbackPayload {
                            access_token: None,
                            refresh_token: None,
                            error: Some(error.clone()),
                        }
                    } else {
                        OAuthCallbackPayload {
                            access_token: params.get("access_token").cloned(),
                            refresh_token: params.get("refresh_token").cloned(),
                            error: None,
                        }
                    }
                } else {
                    OAuthCallbackPayload {
                        access_token: None,
                        refresh_token: None,
                        error: Some("Failed to parse callback URL".into()),
                    }
                };

                let _ = app_handle.emit("oauth-callback", payload);
                if let Some(window) = app_handle.get_webview_window("oauth") {
                    let _ = window.close();
                }
                return false;
            }
            true
        })
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn store_token(service: String, key: String, value: String) -> Result<(), String> {
    // TODO: Implement keychain storage (use keyring crate)
    Ok(())
}

#[tauri::command]
pub async fn get_token(service: String, key: String) -> Result<Option<String>, String> {
    // TODO: Implement keychain retrieval (use keyring crate)
    Ok(None)
}

#[tauri::command]
pub async fn clear_tokens(service: String) -> Result<(), String> {
    // TODO: Implement keychain clearing (use keyring crate)
    Ok(())
}
`;
}
