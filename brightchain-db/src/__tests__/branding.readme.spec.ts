/**
 * Unit tests for BrightDB branding in README files.
 * Validates: Requirements 2.4, 7.1, 7.2
 */
import * as fs from 'fs';
import * as path from 'path';

describe('Root README BrightDB parenthetical', () => {
  const rootReadmePath = path.resolve(__dirname, '..', '..', '..', 'README.md');
  let readmeContent: string;

  beforeAll(() => {
    readmeContent = fs.readFileSync(rootReadmePath, 'utf-8');
  });

  it('should contain a parenthetical clarifying BrightDB = @brightchain/db', () => {
    // The root README should have a parenthetical on first mention of BrightDB
    // linking it to the @brightchain/db package, e.g.:
    //   **BrightDB** (`@brightchain/db`)
    // Allow optional bold markdown wrapping around BrightDB.
    const parentheticalPattern =
      /(\*\*)?BrightDB(\*\*)?\s*\(\s*`@brightchain\/db`\s*\)/;
    expect(readmeContent).toMatch(parentheticalPattern);
  });
});

describe('brightchain-db package README branding', () => {
  const pkgReadmePath = path.resolve(__dirname, '..', '..', 'README.md');
  let readmeContent: string;

  beforeAll(() => {
    readmeContent = fs.readFileSync(pkgReadmePath, 'utf-8');
  });

  // Validates: Requirement 2.4
  it('should have a heading containing "BrightDB"', () => {
    // Extract the first markdown heading (# line)
    const headingMatch = readmeContent.match(/^#\s+(.+)$/m);
    expect(headingMatch).not.toBeNull();
    const heading = headingMatch![1];
    // Heading should be "BrightDB" or "BrightDB (`@brightchain/db`)"
    expect(heading).toMatch(/^BrightDB(\s*\(`@brightchain\/db`\))?$/);
  });

  // Validates: Requirement 7.1
  it('should contain a terminology note with all four naming terms', () => {
    const terms = ['BrightDB', 'BrightDb', '@brightchain/db', 'brightchain-db'];
    for (const term of terms) {
      expect(readmeContent).toContain(term);
    }
    // Verify the note is structured as a blockquote terminology section
    expect(readmeContent).toMatch(/>\s*\*\*Terminology Note\*\*/);
  });
});

describe('Filesystem and project config preservation', () => {
  const workspaceRoot = path.resolve(__dirname, '..', '..', '..');

  // Validates: Requirement 5.3
  it('should have the brightchain-db directory on the filesystem', () => {
    const dbDir = path.join(workspaceRoot, 'brightchain-db');
    expect(fs.existsSync(dbDir)).toBe(true);
    expect(fs.statSync(dbDir).isDirectory()).toBe(true);
  });

  // Validates: Requirement 5.4
  it('should reference "brightchain-db" as the project name in project.json', () => {
    const projectJsonPath = path.join(
      workspaceRoot,
      'brightchain-db',
      'project.json',
    );
    expect(fs.existsSync(projectJsonPath)).toBe(true);
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
    expect(projectJson.name).toBe('brightchain-db');
  });

  // Validates: Requirement 5.4
  it('should have brightchain-db discoverable as an Nx project', () => {
    // Nx discovers projects via project.json files. Verify the project.json
    // exists at the expected location and contains required Nx fields.
    const projectJsonPath = path.join(
      workspaceRoot,
      'brightchain-db',
      'project.json',
    );
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
    expect(projectJson).toHaveProperty('sourceRoot');
    expect(projectJson).toHaveProperty('targets');
    expect(projectJson.sourceRoot).toContain('brightchain-db');
  });
});
