const fs = require('fs');
const path = require('path');

// Directories to completely ignore
const ignoreDirs = [
  '.next',
  'node_modules',
  '.git',
  'public',
  'data',
  '.dfx',
  'out',
  'dist',
  'target',  // Rust build artifacts
  'declarations',  // Generated declarations
  '.ic-assets',
  'build',
  'coverage'
];

// File prefixes to ignore
const ignoreFilePrefixes = [
  '.env',
  '.git',
  '.nvmrc',
  '.prettierrc',
  '.eslintrc',
  'LICENSE',
  'package-lock',
  'yarn.lock',
  'pnpm-lock',
  'filtered',
  'generate',
  'tree',
  '.DS_Store',
  'tsconfig',
  'next.config',
  'tailwind.config'
];

// File suffixes to ignore
const ignoreFileSuffixes = [
  '.wasm',
  '.lock',
  '.log',
  '.map',
  '.min.js',
  '.min.css'
];

// Essential files to include (if not already filtered)
const essentialPatterns = {
  // Backend Rust files
  rust: ['.rs', '.did', 'Cargo.toml'],
  // Frontend files
  frontend: ['.tsx', '.ts', '.jsx', '.js'],
  // Config and docs
  root: ['deploy.sh', 'CLAUDE.md', 'README.md', 'dfx.json', '.json']
};

// Function to count lines in a file
const countLines = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    return 0; // Return 0 if file cannot be read
  }
};

// Check if file should be included based on patterns
const shouldIncludeFile = (fileName, parentDir) => {
  // Check ignore prefixes
  if (ignoreFilePrefixes.some(prefix => fileName.startsWith(prefix))) {
    return false;
  }

  // Check ignore suffixes
  if (ignoreFileSuffixes.some(suffix => fileName.endsWith(suffix))) {
    return false;
  }

  // Include essential files
  const ext = path.extname(fileName);
  const isRust = essentialPatterns.rust.some(pattern => fileName.endsWith(pattern));
  const isFrontend = essentialPatterns.frontend.some(pattern => fileName.endsWith(pattern));
  const isRoot = essentialPatterns.root.some(pattern => fileName.includes(pattern));

  return isRust || isFrontend || isRoot || fileName === 'package.json';
};

const createTree = (dir, indent = '', basePath = dir) => {
  let tree = '';

  try {
    const files = fs.readdirSync(dir);
    const filteredFiles = files
      .filter(file => !ignoreDirs.includes(file))
      .sort((a, b) => {
        // Directories first, then files
        const aPath = path.join(dir, a);
        const bPath = path.join(dir, b);
        const aIsDir = fs.statSync(aPath).isDirectory();
        const bIsDir = fs.statSync(bPath).isDirectory();

        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });

    filteredFiles.forEach((file, index) => {
      const fullPath = path.join(dir, file);
      const isLastFile = index === filteredFiles.length - 1;
      const stats = fs.statSync(fullPath);
      const lineEnd = isLastFile ? '└── ' : '├── ';

      if (stats.isDirectory()) {
        tree += `${indent}${lineEnd}${file}/\n`;
        tree += createTree(fullPath, `${indent}${isLastFile ? '    ' : '│   '}`, basePath);
      } else if (shouldIncludeFile(file, path.basename(dir))) {
        // Count lines for files and add the count in parentheses
        const lineCount = countLines(fullPath);
        tree += `${indent}${lineEnd}${file} (${lineCount} lines)\n`;
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return tree;
};

console.log('Generating file tree for daopad repository...');
const tree = createTree('.');
fs.writeFileSync('tree.txt', tree);
console.log('File tree generated successfully in tree.txt');

// Calculate total lines
const lines = tree.split('\n')
  .filter(line => line.includes('lines)'))
  .map(line => {
    const match = line.match(/\((\d+) lines\)/);
    return match ? parseInt(match[1]) : 0;
  })
  .reduce((sum, count) => sum + count, 0);

console.log(`Total lines of code: ${lines.toLocaleString()}`);
