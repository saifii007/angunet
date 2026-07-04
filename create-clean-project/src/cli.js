import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import { Command, InvalidArgumentError } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import packageJson from '../package.json' with { type: 'json' };
import { DATABASE_OPTIONS, DEFAULT_TEMPLATE } from '../config/defaults.js';
import { installDependencies } from './install.js';
import {
  createTemplate,
  normalizeProjectName,
  validateProjectName
} from './template.js';

function parseDatabase(value) {
  const normalized = value.toLowerCase();

  if (!DATABASE_OPTIONS.some((option) => option.value === normalized)) {
    throw new InvalidArgumentError('Use sql, mongodb, or both.');
  }

  return normalized;
}

async function collectAnswers(projectName, options) {
  const questions = [];

  if (!projectName) {
    questions.push({
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: 'my-clean-project',
      validate: validateProjectName
    });
  }

  if (!options.database) {
    questions.push({
      type: 'select',
      name: 'database',
      message: 'Which database provider should be enabled?',
      choices: DATABASE_OPTIONS,
      default: 'sql'
    });
  }

  if (options.install === undefined) {
    questions.push({
      type: 'confirm',
      name: 'install',
      message: 'Install Angular and .NET dependencies now?',
      default: true
    });
  }

  const prompted = await inquirer.prompt(questions);

  return {
    name: normalizeProjectName(projectName ?? prompted.name),
    database: options.database ?? prompted.database,
    install: options.install ?? prompted.install
  };
}

export async function runCli(argv = process.argv) {
  const program = new Command();

  program
    .name('create-clean-project')
    .description(packageJson.description)
    .version(packageJson.version)
    .argument('[project-name]', 'directory and project name')
    .option(
      '-t, --template <repository>',
      'GitHub template in owner/repository, URL, or owner/repository#branch format',
      DEFAULT_TEMPLATE
    )
    .option(
      '-d, --database <provider>',
      'database provider: sql, mongodb, or both',
      parseDatabase
    )
    .option('--install', 'install Angular and .NET dependencies')
    .option('--no-install', 'skip dependency installation')
    .option('-y, --yes', 'accept defaults and do not ask questions')
    .action(async (projectName, options, command) => {
      const normalizedName = projectName
        ? normalizeProjectName(projectName)
        : undefined;
      const installWasSpecified =
        command.getOptionValueSource('install') === 'cli';
      const selectedOptions = {
        ...options,
        install: installWasSpecified ? options.install : undefined
      };

      if (normalizedName) {
        const validation = validateProjectName(normalizedName);
        if (validation !== true) {
          throw new Error(validation);
        }
      }

      const answers = options.yes
        ? {
            name: normalizedName ?? 'my-clean-project',
            database: options.database ?? 'sql',
            install: selectedOptions.install ?? true
          }
        : await collectAnswers(normalizedName, selectedOptions);

      const targetDirectory = path.resolve(process.cwd(), answers.name);

      console.log();
      console.log(chalk.cyan.bold(`Creating ${answers.name}...`));

      if (await fs.pathExists(targetDirectory)) {
        throw new Error(
          `The destination "${targetDirectory}" already exists. Choose another project name.`
        );
      }

      try {
        await createTemplate({
          projectName: answers.name,
          database: answers.database,
          repository: options.template,
          targetDirectory
        });

        if (answers.install) {
          await installDependencies(targetDirectory);
        }

        console.log();
        console.log(chalk.green.bold('Clean Project is ready.'));
        console.log(chalk.white(`  cd ${answers.name}`));
        if (!answers.install) {
          console.log(chalk.dim('  Install dependencies before starting development.'));
        }
      } catch (error) {
        await fs.remove(targetDirectory);
        throw error;
      }
    });

  await program.parseAsync(argv);
}
