<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

- In general, whether an error is viewed as 'pre-existing' or not, unless otherwise specified, we generally want to fix it. If it is a large task, prompt the user.

- Things that are shared between everything (client, etc, libraries, interfaces, etc- even api interfaces go in brightchain-lib, especially requests and the cores of the responses- see below).
- Things that are nodejs specific, that require nodejs types/dependencies go in brightchain-api-lib
- Things that are frontend specific go in brightchain-react

When we can, consider breaking things out into their own @digitaldefiance libraries.

we have the api responses which extend express Response so they're in api-lib, but we need some kind of base interface in brightchain-lib that carries the main data structure to clients. We really should make things of the format:

brightchain-lib:

```
IBaseData {
  Something: string
}
```

brightchain-api-lib:

```
IBaseDataAPIResponse extends Response {
  body: IBaseData;
}
```

etc this way the client can have an interface that works.
Even better would be to have a generic templated interface that lets us deal with DTO for frontend vs backend types.
eg

```
IBaseData<TData> {
   Something: TData;
}
so that in the front end TData can be string and in the backend it can be say GuidV4Buffer.

- Prefer creating .ts or .js files over executing node statements raw on the console.
```
