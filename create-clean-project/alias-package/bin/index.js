#!/usr/bin/env node

import { runCli } from 'angunet/cli';

runCli().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
