<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `npx nx` (i.e. `npx nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Avoid jest's --testPathPattern, it is unpredictable and ends up running the full suite more often than not
- Avoid "as any", and "as unknown" casts wherever possible.
- Avoid "any" and "unknown" types wherever possible
- when running tests with nx/jest, favor prefixing NX_TUI=false and adding --outputStyle=stream to the arguments
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

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