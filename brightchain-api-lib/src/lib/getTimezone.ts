import {
  GlobalActiveContext,
  Timezone,
  isValidTimezone,
} from '@brightchain/brightchain-lib';
import { existsSync, readFileSync } from 'fs';

export function setGlobalActiveContextAdminTimezoneFromProcessArgvOrEnv(): Timezone {
  const systemTz = existsSync('/etc/timezone')
    ? readFileSync('/etc/timezone', 'utf8').trim()
    : undefined;
  const consoleTimezoneEnv = process.env['TZ'];
  const consoleTimezoneArgv = process.argv.find((arg) =>
    arg.startsWith('--timezone='),
  );

  // Prioritize /etc/timezone, environment variable, then command-line argument
  // if /etc/timezone has a timezone, and is valid (isValidTimezone) start with that
  // if TZ env is set, and is valid (isValidTimezone), override with that
  // if command-line argument is set, and is valid (isValidTimezone), override with that
  const validSystemTz =
    systemTz && isValidTimezone(systemTz) ? new Timezone(systemTz) : undefined;
  const validConsoleTimezoneEnv =
    consoleTimezoneEnv && isValidTimezone(consoleTimezoneEnv)
      ? new Timezone(consoleTimezoneEnv)
      : undefined;
  const validConsoleTimezoneArgv = consoleTimezoneArgv
    ? new Timezone(consoleTimezoneArgv.split('=')[1])
    : undefined;

  const timezone =
    validSystemTz ??
    validConsoleTimezoneEnv ??
    validConsoleTimezoneArgv ??
    GlobalActiveContext.adminTimezone;

  GlobalActiveContext.adminTimezone = timezone;
  return timezone;
}
