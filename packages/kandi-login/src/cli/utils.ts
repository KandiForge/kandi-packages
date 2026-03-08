/**
 * Shared CLI utilities
 */

import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const logo = chalk.bold.hex('#667eea')('kandi-login');

export function printBanner(version: string): void {
  console.log('');
  console.log(`  ${logo} ${chalk.dim(`v${version}`)}`);
  console.log('');
}

export function success(message: string): void {
  console.log(`  ${chalk.green('\u2713')} ${message}`);
}

export function warning(message: string): void {
  console.log(`  ${chalk.yellow('\u26A0')} ${message}`);
}

export function error(message: string): void {
  console.log(`  ${chalk.red('\u2717')} ${message}`);
}

export function info(message: string): void {
  console.log(`  ${chalk.blue('\u2139')} ${message}`);
}

export function getVersion(): string {
  try {
    const pkgPath = join(import.meta.dirname, '..', '..', 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.version ?? '0.0.0';
    }
  } catch {
    // Ignore
  }
  return '0.0.0';
}

/** Provider developer console URLs */
export const PROVIDER_URLS: Record<string, string> = {
  apple: 'https://developer.apple.com/account/resources/identifiers/list/serviceId',
  google: 'https://console.cloud.google.com/apis/credentials',
  facebook: 'https://developers.facebook.com/apps/',
  hellocoop: 'https://console.hello.coop/',
};

/** Default environment variable names per provider */
export const PROVIDER_ENV_VARS: Record<string, { clientId: string; clientSecret: string }> = {
  apple: { clientId: 'APPLE_CLIENT_ID', clientSecret: 'APPLE_CLIENT_SECRET' },
  google: { clientId: 'GOOGLE_CLIENT_ID', clientSecret: 'GOOGLE_CLIENT_SECRET' },
  facebook: { clientId: 'FACEBOOK_APP_ID', clientSecret: 'FACEBOOK_APP_SECRET' },
  hellocoop: { clientId: 'HELLO_COOP_CLIENT_ID', clientSecret: 'HELLO_COOP_CLIENT_SECRET' },
};
