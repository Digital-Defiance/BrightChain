#!/usr/bin/env node

import fs from 'fs';
import lcovParse from 'lcov-parse';
import path from 'path';
import { promisify } from 'util';

const parseLcov = promisify(lcovParse);

async function generateMarkdownReport() {
  try {
    const lcovPath = path.join(
      process.cwd(),
      'coverage/brightchain-lib/lcov.info',
    );
    const data = await parseLcov(lcovPath);

    let markdown = '# Code Coverage Report\n\n';

    let totalLines = 0;
    let coveredLines = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    markdown +=
      '| File | Line Coverage | Function Coverage | Branch Coverage |\n';
    markdown +=
      '|------|---------------|------------------|----------------|\n';

    for (const file of data) {
      const lineRate = (file.lines.hit / file.lines.found) * 100 || 0;
      const fnRate = (file.functions.hit / file.functions.found) * 100 || 0;
      const branchRate = (file.branches.hit / file.branches.found) * 100 || 0;

      totalLines += file.lines.found;
      coveredLines += file.lines.hit;
      totalFunctions += file.functions.found;
      coveredFunctions += file.functions.hit;
      totalBranches += file.branches.found;
      coveredBranches += file.branches.hit;

      markdown += `| ${file.file} | ${lineRate.toFixed(2)}% | ${fnRate.toFixed(2)}% | ${branchRate.toFixed(2)}% |\n`;
    }

    markdown += '\n## Summary\n\n';

    const totalLineRate = (coveredLines / totalLines) * 100 || 0;
    const totalFnRate = (coveredFunctions / totalFunctions) * 100 || 0;
    const totalBranchRate = (coveredBranches / totalBranches) * 100 || 0;

    markdown += `- **Line Coverage**: ${totalLineRate.toFixed(2)}%\n`;
    markdown += `- **Function Coverage**: ${totalFnRate.toFixed(2)}%\n`;
    markdown += `- **Branch Coverage**: ${totalBranchRate.toFixed(2)}%\n`;

    const outputPath = path.join(
      process.cwd(),
      'coverage/brightchain-lib/coverage.md',
    );
    fs.writeFileSync(outputPath, markdown);
    console.log(`Coverage report generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating coverage report:', error);
    process.exit(1);
  }
}

generateMarkdownReport();
