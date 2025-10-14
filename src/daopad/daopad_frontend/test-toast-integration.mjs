import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function isInComment(index, content) {
  // Get substring before the match
  const before = content.substring(0, index);

  // Check if in single-line comment
  const lastNewline = before.lastIndexOf('\n');
  const lineBeforeMatch = before.substring(lastNewline + 1);
  if (lineBeforeMatch.includes('//')) {
    return true;
  }

  // Check if in multi-line comment
  const lastCommentStart = before.lastIndexOf('/*');
  const lastCommentEnd = before.lastIndexOf('*/');
  if (lastCommentStart > lastCommentEnd) {
    return true;
  }

  return false;
}

function getLineNumber(index, content) {
  return content.substring(0, index).split('\n').length;
}

async function testToastSyntax() {
  // Find all JSX files in components/
  const files = getAllFiles('src');

  let errors = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');

    // Check for old shadcn/ui toast syntax
    const oldSyntaxPattern = /toast\(\{\s*(variant|title|description):/g;
    let match;

    while ((match = oldSyntaxPattern.exec(content)) !== null) {
      // Verify it's not a comment or in a different context
      if (!isInComment(match.index, content)) {
        errors.push({
          file: file,
          line: getLineNumber(match.index, content),
          match: match[0],
          type: 'old-toast-syntax'
        });
      }
    }

    // Verify correct sonner syntax is present if useToast is imported
    if (content.includes('useToast')) {
      // Should have toast.error(), toast.success(), etc.
      const hasSonnerSyntax = /toast\.(error|success|warning|info)\(/.test(content);
      const hasToastCall = content.includes('toast(');

      if (!hasSonnerSyntax && hasToastCall) {
        errors.push({
          file: file,
          type: 'missing-sonner-syntax',
          message: 'File imports useToast but doesn\'t use sonner API'
        });
      }
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error('❌ Toast API errors found:');
    errors.forEach(err => {
      if (err.type === 'old-toast-syntax') {
        console.error(`  ${err.file}:${err.line} - Old toast syntax: ${err.match}`);
      } else {
        console.error(`  ${err.file} - ${err.message}`);
      }
    });
    process.exit(1);
  } else {
    console.log('✅ All toast API calls use correct sonner syntax');
  }
}

testToastSyntax();
