import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import fs from 'fs-extra';
import chalk from 'chalk';

const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.angular',
  'bin',
  'dist',
  'node_modules',
  'obj'
]);

async function findFiles(directory, predicate) {
  const matches = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      matches.push(...await findFiles(entryPath, predicate));
    } else if (predicate(entry.name)) {
      matches.push(entryPath);
    }
  }

  return matches;
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}.`));
      }
    });
  });
}

export async function installDependencies(targetDirectory) {
  const packageFiles = await findFiles(
    targetDirectory,
    (name) => name === 'package.json'
  );

  for (const packageFile of packageFiles) {
    const workingDirectory = path.dirname(packageFile);
    console.log();
    console.log(chalk.cyan(`Running npm install in ${workingDirectory}...`));
    await run('npm', ['install'], workingDirectory);
  }

  const solutionFiles = await findFiles(
    targetDirectory,
    (name) => name.endsWith('.sln') || name.endsWith('.slnx')
  );
  const restoreTargets = solutionFiles.length > 0
    ? solutionFiles
    : await findFiles(targetDirectory, (name) => name.endsWith('.csproj'));

  if (restoreTargets.length === 0) {
    throw new Error('No .NET solution or project file was found for dotnet restore.');
  }

  for (const restoreTarget of restoreTargets) {
    console.log();
    console.log(chalk.cyan(`Running dotnet restore for ${restoreTarget}...`));
    await run('dotnet', ['restore', restoreTarget], targetDirectory);
  }
}
