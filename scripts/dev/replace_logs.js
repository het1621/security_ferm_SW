const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.js')) {
      callback(path.join(dir, f));
    }
  });
}

let modifiedCount = 0;

walkDir(path.join(__dirname, '../../src'), function(filePath) {
  // skip the logger itself and seed files
  if (filePath.includes('logger.js') || filePath.includes('seed.js')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // If file contains console.log or console.error
  if (content.includes('console.log') || content.includes('console.error') || content.includes('console.warn')) {
    
    // Check if logger is already imported
    if (!content.includes('require(') || !content.includes('logger')) {
      // Find the relative path to logger.js
      let relativePath = path.relative(path.dirname(filePath), path.join(__dirname, '../../src/utils/logger.js'));
      relativePath = relativePath.replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

      // Add logger import at the top
      content = `const logger = require('${relativePath}');\n` + content;
    }

    content = content.replace(/console\.log/g, 'logger.info');
    content = content.replace(/console\.error/g, 'logger.error');
    content = content.replace(/console\.warn/g, 'logger.warn');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Modified: ' + filePath);
      modifiedCount++;
    }
  }
});

console.log(`Replaced console statements in ${modifiedCount} files.`);
