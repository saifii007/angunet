import path from 'node:path';
import fs from 'fs-extra';
import degit from 'degit';
import chalk from 'chalk';

const TEXT_EXTENSIONS = new Set([
  '',
  '.cs',
  '.csproj',
  '.css',
  '.dockerignore',
  '.editorconfig',
  '.env',
  '.gitignore',
  '.html',
  '.http',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.props',
  '.sln',
  '.slnx',
  '.targets',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml'
]);

const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.angular',
  'bin',
  'dist',
  'node_modules',
  'obj'
]);

const TEMPLATE_AUTHORING_PATHS = [
  'create-clean-project'
];

export function normalizeProjectName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

export function validateProjectName(value) {
  const name = normalizeProjectName(value);

  if (!name) {
    return 'Project name is required.';
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    return 'Use letters, numbers, dots, underscores, or hyphens.';
  }

  if (name === '.' || name === '..') {
    return 'Choose a different project name.';
  }

  return true;
}

export function toPascalCase(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

export function normalizeRepository(repository) {
  return repository
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^git@github\.com:/, '')
    .replace(/\.git(?=#|$)/, '')
    .replace(/\/$/, '');
}

function replacementValues(projectName, database) {
  return {
    __PROJECT_NAME__: projectName,
    __PROJECT_SLUG__: projectName,
    __PROJECT_NAMESPACE__: toPascalCase(projectName),
    __DATABASE_PROVIDER__: database,
    __USE_SQL_SERVER__: String(database === 'sql' || database === 'both').toLowerCase(),
    __USE_MONGODB__: String(database === 'mongodb' || database === 'both').toLowerCase()
  };
}

function replaceTokens(content, replacements) {
  let result = content;

  for (const [token, value] of Object.entries(replacements)) {
    result = result.replaceAll(token, value);
  }

  return result;
}

function shouldReadAsText(filePath) {
  const name = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();
  return name.startsWith('.') || TEXT_EXTENSIONS.has(extension);
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    paths.push(entryPath);

    if (entry.isDirectory()) {
      paths.push(...await walk(entryPath));
    }
  }

  return paths;
}

export async function replaceTemplatePlaceholders(
  targetDirectory,
  projectName,
  database
) {
  const replacements = replacementValues(projectName, database);
  const paths = await walk(targetDirectory);

  for (const filePath of paths.filter((item) => fs.statSync(item).isFile())) {
    if (!shouldReadAsText(filePath)) {
      continue;
    }

    const original = await fs.readFile(filePath, 'utf8');
    const updated = replaceTokens(original, replacements);

    if (updated !== original) {
      await fs.writeFile(filePath, updated, 'utf8');
    }
  }

  const renameCandidates = paths
    .filter((item) => path.basename(item).includes('__PROJECT_NAME__'))
    .sort((left, right) => right.length - left.length);

  for (const oldPath of renameCandidates) {
    if (!await fs.pathExists(oldPath)) {
      continue;
    }

    const newName = replaceTokens(path.basename(oldPath), replacements);
    await fs.move(oldPath, path.join(path.dirname(oldPath), newName));
  }
}

export async function writeProjectConfiguration(
  targetDirectory,
  projectName,
  database
) {
  await fs.writeJson(
    path.join(targetDirectory, '.clean-project.json'),
    {
      projectName,
      database,
      sqlServer: database === 'sql' || database === 'both',
      mongoDb: database === 'mongodb' || database === 'both',
      generatedAt: new Date().toISOString()
    },
    { spaces: 2 }
  );
}

export async function createTemplate({
  projectName,
  database,
  repository,
  targetDirectory
}) {
  const source = normalizeRepository(repository);

  if (source.includes('<username>')) {
    throw new Error(
      'Set your GitHub username in config/defaults.js or pass --template owner/repository.'
    );
  }

  console.log(chalk.dim(`Downloading github.com/${source}...`));
  const emitter = degit(source, {
    cache: false,
    force: true,
    verbose: false
  });

  emitter.on('info', (info) => {
    if (info.code === 'SUCCESS') {
      console.log(chalk.green('Template downloaded.'));
    }
  });

  try {
    await emitter.clone(targetDirectory);
  } catch (error) {
    if (error?.code === 'MISSING_REF') {
      throw new Error(
        `Could not download GitHub template "${source}". Confirm that the ` +
        'repository is public, the branch exists, and it contains at least one commit.',
        { cause: error }
      );
    }

    throw error;
  }

  for (const authoringPath of TEMPLATE_AUTHORING_PATHS) {
    await fs.remove(path.join(targetDirectory, authoringPath));
  }

  await replaceTemplatePlaceholders(targetDirectory, projectName, database);
  await writeProjectConfiguration(targetDirectory, projectName, database);
}
