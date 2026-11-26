#!/usr/bin/env node
import { runCli } from '../dist/cli-main.js';

runCli(process.argv.slice(2)).catch(err => {
 console.error('[interview-bridge]', err instanceof Error ? err.message : String(err));
 process.exitCode = 1;
});
