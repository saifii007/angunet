import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import fs from 'fs-extra';
import {
  normalizeRepository,
  replaceTemplatePlaceholders,
  toPascalCase,
  validateProjectName
} from '../src/template.js';

test('normalizes GitHub repository URLs for degit', () => {
  assert.equal(
    normalizeRepository('https://github.com/example/clean-project-template.git'),
    'example/clean-project-template'
  );
  assert.equal(
    normalizeRepository('example/clean-project-template#main'),
    'example/clean-project-template#main'
  );
});

test('validates and converts project names', () => {
  assert.equal(validateProjectName('my-app'), true);
  assert.notEqual(validateProjectName('../my-app'), true);
  assert.equal(toPascalCase('my-clean_project'), 'MyCleanProject');
});

test('replaces content and file-name placeholders', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'angunet-test-'));

  try {
    await fs.outputFile(
      path.join(directory, '__PROJECT_NAME__.csproj'),
      '__PROJECT_NAME__|__PROJECT_NAMESPACE__|__DATABASE_PROVIDER__|' +
        '__USE_SQL_SERVER__|__USE_MONGODB__'
    );

    await replaceTemplatePlaceholders(directory, 'sample-app', 'both');

    const output = await fs.readFile(
      path.join(directory, 'sample-app.csproj'),
      'utf8'
    );
    assert.equal(output, 'sample-app|SampleApp|both|true|true');
  } finally {
    await fs.remove(directory);
  }
});
