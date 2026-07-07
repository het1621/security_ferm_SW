const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') && f !== 'errors.js'); // skip the errors route itself

let totalReplaced = 0;

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 1. Check if logError is already imported
  if (!content.includes("const { logError } = require('../utils/errorLogger');")) {
    // find the last require statement
    const requireMatches = [...content.matchAll(/require\([^)]+\);?/g)];
    if (requireMatches.length > 0) {
      const lastMatch = requireMatches[requireMatches.length - 1];
      const insertPos = lastMatch.index + lastMatch[0].length;
      content = content.slice(0, insertPos) + "\nconst { logError } = require('../utils/errorLogger');" + content.slice(insertPos);
    } else {
      content = "const { logError } = require('../utils/errorLogger');\n" + content;
    }
  }

  // 2. Replace console.error inside catch blocks
  // This regex looks for `catch (error) { ... console.error('msg', error);` 
  // It handles 'error' or 'err' variable names.
  
  // A simpler approach: Just replace `console.error(` with `logError(error/err, req, { ... }); console.error(` 
  // but we need to know the error variable name. It's better to match the catch block.
  
  // Match catch (variableName) {
  const catchRegex = /catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{/g;
  
  let match;
  let newContent = '';
  let lastIndex = 0;
  
  while ((match = catchRegex.exec(content)) !== null) {
    const errorVar = match[1];
    const catchStartIdx = match.index;
    const blockStartIdx = match.index + match[0].length;
    
    // Find the end of the catch block by matching braces? It's easier to just find the next console.error
    // after the catch statement and inject logError before it.
    
    newContent += content.substring(lastIndex, blockStartIdx);
    
    // Inject logError right at the beginning of the catch block
    const featureName = file.replace('.js', '');
    const injection = `\n    logError(${errorVar}, typeof req !== 'undefined' ? req : {}, { feature: '${featureName}' });`;
    
    // Check if it's already injected
    const nextCode = content.substring(blockStartIdx, blockStartIdx + 150);
    if (!nextCode.includes('logError(')) {
      newContent += injection;
      totalReplaced++;
    }
    
    lastIndex = blockStartIdx;
  }
  
  newContent += content.substring(lastIndex);
  
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated ${file}`);
  }
}

console.log(`Refactoring complete. Injected logError in ${totalReplaced} catch blocks.`);
