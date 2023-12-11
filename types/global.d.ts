/**
 * Ambient module declarations for markdown-it plugins that don't ship their own types.
 * These declarations tell TypeScript these modules exist and provide basic type info.
 */

declare module 'markdown-it-abbr' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-container' {
  import type MarkdownIt from 'markdown-it';
  interface ContainerOptions {
    validate?: (params: string) => boolean;
    render?: (
      tokens: MarkdownIt.Token[],
      idx: number,
      options: MarkdownIt.Options,
      env: unknown,
      self: MarkdownIt.Renderer,
    ) => string;
    marker?: string;
  }
  const plugin: MarkdownIt.PluginWithOptions<ContainerOptions>;
  export default plugin;
}

declare module 'markdown-it-deflist' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-footnote' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-mark' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-table-of-contents' {
  import type MarkdownIt from 'markdown-it';
  interface TocOptions {
    includeLevel?: number[];
    containerClass?: string;
    slugify?: (s: string) => string;
    markerPattern?: RegExp;
    listItemClass?: string;
    listType?: 'ul' | 'ol';
    format?: (content: string, md: MarkdownIt) => string;
    forceFullToc?: boolean;
    containerHeaderHtml?: string;
    containerFooterHtml?: string;
    transformLink?: (link: string) => string;
  }
  const plugin: MarkdownIt.PluginWithOptions<TocOptions>;
  export default plugin;
}

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';
  interface TaskListOptions {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }
  const plugin: MarkdownIt.PluginWithOptions<TaskListOptions>;
  export default plugin;
}
