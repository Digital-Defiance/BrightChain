import * as fs from 'fs';
import * as path from 'path';

// Updated path to walkthroughs markdown files in docs
const walkthroughsDir = '/Volumes/Code/BrightChain/docs/walkthroughs';

function readGuide(filename: string): string {
  return fs.readFileSync(path.join(walkthroughsDir, filename), 'utf-8');
}

// ...existing describe/it blocks from original file...

describe('Quickstart Guide (Req 2.1–2.6)', () => {
  let content: string;

  beforeAll(() => {
    content = readGuide('01-quickstart.md');
  });

  it('contains clone instructions', () => {
    expect(content).toContain('git clone');
  });

  it('lists Node.js 20+ as a prerequisite', () => {
    expect(content).toMatch(/Node\.js 20\+/);
  });

  it('lists Yarn as a prerequisite', () => {
    expect(content).toContain('Yarn');
  });

  it('includes npx nx test brightchain-lib', () => {
    expect(content).toContain('npx nx test brightchain-lib');
  });

  it('includes InMemoryDatabase code example', () => {
    expect(content).toContain('InMemoryDatabase');
  });

  it('includes specific version numbers for prerequisites', () => {
    expect(content).toMatch(/Node\.js 20/);
  });

  it('has a non-Docker installation section', () => {
    expect(content).toMatch(/Non-Docker/i);
  });

  it('has a Docker-based installation section', () => {
    expect(content).toMatch(/Docker/);
  });

  it('has a troubleshooting section', () => {
    expect(content).toContain('## Troubleshooting');
  });
});

// ...rest of the original file's describe/it blocks...
