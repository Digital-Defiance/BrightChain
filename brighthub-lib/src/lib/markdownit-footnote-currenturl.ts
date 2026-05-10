import type MarkdownIt from 'markdown-it';

// Use 'any' for internal types to avoid ESM/CJS module resolution issues
// with markdown-it's .mjs type definitions
/* eslint-disable @typescript-eslint/no-explicit-any */

interface Env {
  docId?: string;
  currentUrl?: string;
}

export function customFootnote(md: MarkdownIt) {
  function render_footnote_anchor_name(
    tokens: any[],
    idx: number,
    _options: any,
    env: Env,
    _slf: any,
  ): string {
    const n = Number(tokens[idx].meta.id + 1).toString();
    let prefix = '';

    if (typeof env.docId === 'string') prefix = `-${env.docId}-`;

    return prefix + n;
  }

  function render_footnote_caption(tokens: any[], idx: number): string {
    let n = Number(tokens[idx].meta.id + 1).toString();

    if (tokens[idx].meta.subId > 0) n += `:${tokens[idx].meta.subId}`;

    return `[${n}]`;
  }

  function render_footnote_ref(
    tokens: any[],
    idx: number,
    options: any,
    env: Env,
    slf: any,
  ): string {
    const id = slf.rules['footnote_anchor_name']
      ? slf.rules['footnote_anchor_name'](tokens, idx, options, env, slf)
      : '';
    const caption = slf.rules['footnote_caption']
      ? slf.rules['footnote_caption'](tokens, idx, options, env, slf)
      : '';
    let refid = id;

    if (tokens[idx].meta.subId > 0) refid += `:${tokens[idx].meta.subId}`;

    const currentUrl = env.currentUrl || '';
    return `<sup class="footnote-ref"><a href="${currentUrl}#fn${id}" id="fnref${refid}">${caption}</a></sup>`;
  }

  function render_footnote_anchor(
    tokens: any[],
    idx: number,
    options: any,
    env: Env,
    slf: any,
  ): string {
    let id = slf.rules['footnote_anchor_name']
      ? slf.rules['footnote_anchor_name'](tokens, idx, options, env, slf)
      : '';

    if (tokens[idx].meta.subId > 0) id += `:${tokens[idx].meta.subId}`;

    const currentUrl = env.currentUrl || '';
    /* ↩ with escape code to prevent display as Apple Emoji on iOS */
    return ` <a href="${currentUrl}#fnref${id}" class="footnote-backref">\u21a9\uFE0E</a>`;
  }

  md.renderer.rules['footnote_ref'] = render_footnote_ref;
  md.renderer.rules['footnote_anchor'] = render_footnote_anchor;
  md.renderer.rules['footnote_caption'] = render_footnote_caption;
  md.renderer.rules['footnote_anchor_name'] = render_footnote_anchor_name;
}

export default customFootnote;
