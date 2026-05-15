// Jest replacement for the 'server-only' guard package.
// The real package throws when imported outside the Next.js server runtime;
// in tests we skip that check so server modules can be imported and mocked.
export {};
