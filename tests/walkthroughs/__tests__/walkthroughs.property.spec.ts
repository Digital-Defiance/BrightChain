describe('Walkthroughs property-based tests', () => {
  it('all .md files are readable', () => {
    const files = fs
      .readdirSync(walkthroughsDir)
      .filter((f) => f.endsWith('.md') && f !== '_template.md');
    for (const file of files) {
      expect(() =>
        fs.readFileSync(path.join(walkthroughsDir, file), 'utf-8'),
      ).not.toThrow();
    }
  });
});

// ...rest of the original file's code...
import * as fs from 'fs';
import * as path from 'path';

// Updated path to walkthroughs markdown files in docs
const walkthroughsDir = '/Volumes/Code/BrightChain/docs/walkthroughs';

// ...existing code from original file, but with updated walkthroughsDir path...

/** All .md files on disk (excluding _template.md) */
function _getWalkthroughFiles(): string[] {
  return fs
    .readdirSync(walkthroughsDir)
    .filter((f) => f.endsWith('.md') && f !== '_template.md');
}

/** Parse index.md and extract every referenced .md filename */
function _getIndexReferencedFiles(): string[] {
  const indexContent = fs.readFileSync(
    path.join(walkthroughsDir, 'index.md'),
    'utf-8',
  );
  const linkPattern = /\.\/([\w-]+\.md)/g;
  const files = new Set<string>();
  for (const match of indexContent.matchAll(linkPattern)) {
    files.add(match[1]);
  }
  // index.md itself is on disk but references others, so include it
  files.add('index.md');
  return Array.from(files);
}

/** Read a walkthrough file */
function _readGuide(filename: string): string {
  return fs.readFileSync(path.join(walkthroughsDir, filename), 'utf-8');
}

/**
 * Strip fenced code blocks from markdown, returning only prose.
 * Handles ``` and ~~~ fences.
 */

function _stripCodeBlocks(md: string): string {
  // ...original code...
  return md.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
}

function _extractCodeBlocks(md: string): string[] {
  const blocks: string[] = [];
  const pattern = /^(```|~~~).*?\n([\s\S]*?)^\1/gm;
  for (const match of md.matchAll(pattern)) {
    blocks.push(match[2]);
  }
  return blocks;
}

// ...rest of the original file's code...
