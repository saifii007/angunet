# angunet

`angunet` is the CLI installer for the Clean Project template. It downloads
the latest template from GitHub, configures its database providers, replaces
project placeholders, and restores Angular and .NET dependencies.

The CLI does not contain or regenerate the Angular/.NET architecture. It
downloads the template from GitHub, then removes package-authoring files such
as `create-clean-project` from the generated app.

## Requirements

- Node.js 20 or newer
- npm
- .NET SDK required by the template
- Git access to the template repository
- Docker, when using the generated project's containers

## Usage

```bash
npx angunet my-app
```

Or, after installing the package:

```bash
npm install --global angunet
create-clean-project my-app
```

Non-interactive usage:

```bash
npx angunet my-app --database both --yes
npx angunet my-app --database mongodb --no-install
npx angunet my-app --template saifii007/angunet#main
```

Supported database values are `sql`, `mongodb`, and `both`.

## Template repository contract

This `create-clean-project` directory is designed to be the root of the CLI's
own GitHub repository. That placement activates its `.github/workflows`
publishing workflow.

The default clone source is:

```text
https://github.com/saifii007/angunet
```

Internally, Degit downloads it using:

```js
degit('saifii007/angunet#main', {
  cache: false,
  force: true
}).clone(targetDirectory);
```

Without a branch suffix, Degit downloads the repository's latest default
branch. A branch or tag can be selected with
`owner/clean-project-template#branch`.

Add these optional placeholders wherever the template needs configuration:

| Placeholder | Example |
| --- | --- |
| `__PROJECT_NAME__` | `my-app` |
| `__PROJECT_SLUG__` | `my-app` |
| `__PROJECT_NAMESPACE__` | `MyApp` |
| `__DATABASE_PROVIDER__` | `sql`, `mongodb`, or `both` |
| `__USE_SQL_SERVER__` | `true` or `false` |
| `__USE_MONGODB__` | `true` or `false` |

`__PROJECT_NAME__` is replaced in text-file contents and file/directory names.
The CLI also creates `.clean-project.json` in each generated project.

## Development

```bash
npm install
npm test
npm link
create-clean-project demo-app --template saifii007/angunet#main
```

The generated project should include the template folders from the repository,
including `angunet-ui`, `angunet-server`, `shared`, `mcp-server`, and the root
Docker/MCP configuration files.

Use `npm unlink --global angunet` when finished testing the linked package.

## Publishing

Confirm that the NPM package name is available:

```bash
npm view angunet
```

Authenticate and publish:

```bash
npm login
npm publish --access public
```

For automated publishing, add an `NPM_TOKEN` repository secret in GitHub and
create a GitHub Release. The included workflow runs tests and publishes with
NPM provenance.

For later releases:

```bash
npm version patch
git push --follow-tags
npm publish --access public
```

Use `npm version minor` for backward-compatible features and
`npm version major` for breaking changes.

## Exact `npx create-clean-project` command

NPM resolves `npx create-clean-project` from the package named
`create-clean-project`. A binary alias in `angunet` is not enough for that
uninstalled command. Publish the included alias package after publishing
`angunet`:

```bash
cd alias-package
npm publish --access public
```

Then both commands work:

```bash
npx angunet my-app
npx create-clean-project my-app
```
