/**
 * Type declarations for markdown-it plugins that don't have @types packages.
 * These are complete declarations based on each plugin's official documentation.
 */

/**
 * markdown-it-abbr - Abbreviation (<abbr>) tag plugin
 * @see https://github.com/markdown-it/markdown-it-abbr
 *
 * Markup based on PHP Markdown Extra definition (without multiline support).
 * Example:
 *   *[HTML]: Hyper Text Markup Language
 *   The HTML specification => <abbr title="Hyper Text Markup Language">HTML</abbr>
 *
 * This plugin has no configuration options.
 */
declare module 'markdown-it-abbr' {
  const plugin: import('markdown-it').PluginSimple;
  export default plugin;
}

/**
 * markdown-it-container - Block-level custom container plugin
 * @see https://github.com/markdown-it/markdown-it-container
 *
 * Creates block containers like:
 *   ::: warning
 *   *here be dragons*
 *   :::
 *
 * Usage: md.use(container, name [, options])
 */
declare module 'markdown-it-container' {
  interface ContainerOptions {
    /**
     * Function to validate tail after opening marker.
     * Should return true on success.
     * @param params - The text after the opening marker (e.g., "spoiler click me")
     */
    validate?: (params: string) => boolean;

    /**
     * Renderer function for opening/closing tokens.
     * @param tokens - Array of all tokens
     * @param idx - Index of current token
     * @param options - markdown-it options
     * @param env - Environment sandbox
     * @param self - Reference to renderer
     */
    render?: (
      tokens: import('markdown-it').Token[],
      idx: number,
      options: import('markdown-it').Options,
      env: unknown,
      self: import('markdown-it').Renderer,
    ) => string;

    /**
     * Character to use in delimiter.
     * @default ':'
     */
    marker?: string;
  }

  /**
   * Container plugin - can be called with:
   * - Just a name string: md.use(container, 'warning')
   * - Name and options: md.use(container, 'spoiler', { validate, render, marker })
   */
  const plugin: import('markdown-it').PluginWithOptions<
    string | ContainerOptions
  >;
  export default plugin;
}

/**
 * markdown-it-deflist - Definition list (<dl>) tag plugin
 * @see https://github.com/markdown-it/markdown-it-deflist
 *
 * Syntax based on Pandoc definition lists.
 * Example:
 *   Term 1
 *   :   Definition 1
 *
 * This plugin has no configuration options.
 */
declare module 'markdown-it-deflist' {
  const plugin: import('markdown-it').PluginSimple;
  export default plugin;
}

/**
 * markdown-it-footnote - Footnotes plugin
 * @see https://github.com/markdown-it/markdown-it-footnote
 *
 * Markup based on Pandoc definition.
 * Supports normal footnotes: [^1] and inline footnotes: ^[inline note]
 *
 * This plugin has no configuration options, but renderer rules can be customized:
 * - footnote_ref
 * - footnote_block_open
 * - footnote_block_close
 * - footnote_open
 * - footnote_close
 * - footnote_anchor
 * - footnote_caption
 * - footnote_anchor_name
 */
declare module 'markdown-it-footnote' {
  const plugin: import('markdown-it').PluginSimple;
  export default plugin;
}

/**
 * markdown-it-mark - <mark> tag plugin
 * @see https://github.com/markdown-it/markdown-it-mark
 *
 * Syntax: ==marked== => <mark>marked</mark>
 * Uses same conditions as CommonMark emphasis.
 *
 * This plugin has no configuration options.
 */
declare module 'markdown-it-mark' {
  const plugin: import('markdown-it').PluginSimple;
  export default plugin;
}

/**
 * markdown-it-table-of-contents - Table of contents plugin
 * @see https://github.com/cmaas/markdown-it-table-of-contents
 *
 * Add [[toc]] where you want the table of contents in your document.
 */
declare module 'markdown-it-table-of-contents' {
  interface TocOptions {
    /**
     * Heading levels to use (2 for h2s, etc.)
     * @default [1, 2]
     */
    includeLevel?: number[];

    /**
     * The class for the container DIV
     * @default "table-of-contents"
     */
    containerClass?: string;

    /**
     * A custom slugification function.
     * @param s - The heading text
     * @param rawToken - The raw token (optional, for advanced use)
     * @default encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-'))
     */
    slugify?: (s: string, rawToken?: import('markdown-it').Token) => string;

    /**
     * Regex pattern of the marker to be replaced with TOC
     * @default /^\[\[toc\]\]/im
     */
    markerPattern?: RegExp;

    /**
     * HTML comment tag to exclude next headline from TOC
     * @default "<!-- omit from toc -->"
     */
    omitTag?: string;

    /**
     * Type of list (ul for unordered, ol for ordered)
     * @default "ul"
     */
    listType?: 'ul' | 'ol';

    /**
     * A function for formatting headings in the TOC.
     * @param content - The heading text as markdown string
     * @param md - markdown-it's internal parser object
     * @default md.renderInline(content)
     */
    format?: (content: string, md: import('markdown-it').default) => string;

    /**
     * Optional HTML string for container header
     * @default undefined
     */
    containerHeaderHtml?: string;

    /**
     * Optional HTML string for container footer
     * @default undefined
     */
    containerFooterHtml?: string;

    /**
     * A function for transforming the TOC links
     * @param link - The generated link
     */
    transformLink?: (link: string) => string;

    /**
     * A function for transforming the container opening tag
     */
    transformContainerOpen?: () => string;

    /**
     * A function for transforming the container closing tag
     */
    transformContainerClose?: () => string;

    /**
     * A function for extracting text from tokens for titles.
     * By default, only text elements are extracted and formatting is lost.
     * @param tokens - Child tokens of the heading
     * @param rawToken - The raw heading token
     */
    getTokensText?: (
      tokens: import('markdown-it').Token[],
      rawToken: import('markdown-it').Token,
    ) => string;
  }

  const plugin: import('markdown-it').PluginWithOptions<TocOptions>;
  export default plugin;
}

/**
 * markdown-it-task-lists - GitHub-style task lists plugin
 * @see https://github.com/revin/markdown-it-task-lists
 *
 * Builds task/todo lists from markdown lists with items starting with [ ] or [x].
 */
declare module 'markdown-it-task-lists' {
  interface TaskListOptions {
    /**
     * Whether checkboxes are enabled (not disabled attribute).
     * @default false
     */
    enabled?: boolean;

    /**
     * Whether to wrap list items in a <label> element for UX purposes.
     * @default false
     */
    label?: boolean;

    /**
     * Whether to add the label after the checkbox.
     * Note: Requires label option to be truthy.
     * @default false
     */
    labelAfter?: boolean;
  }

  const plugin: import('markdown-it').PluginWithOptions<TaskListOptions>;
  export default plugin;
}
