#!/usr/bin/env node

/**
 * Script to disable TensorFlow dependencies and functionality
 * This script comments out all TensorFlow-related code in the project
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Disabling TensorFlow dependencies and functionality...\n');

// Files to modify
const filesToModify = [
  {
    path: 'Backend/package.json',
    type: 'json',
    operations: [
      {
        action: 'comment_dependencies',
        dependencies: [
          '@tensorflow/tfjs',
          '@tensorflow/tfjs-backend-cpu',
          '@tensorflow/tfjs-converter',
          '@tensorflow/tfjs-core',
          '@tensorflow/tfjs-node',
          '@tensorflow-models/universal-sentence-encoder',
          '@tensorflow-models/mobilenet'
        ]
      }
    ]
  },
  {
    path: 'App/package.json',
    type: 'json',
    operations: [
      {
        action: 'comment_dependencies',
        dependencies: ['@tensorflow/tfjs']
      }
    ]
  },
  {
    path: 'Backend/scripts/embed.js',
    type: 'js',
    operations: [
      {
        action: 'comment_imports',
        lines: [
          "tf = require('@tensorflow/tfjs-node');",
          "console.log('Using @tensorflow/tfjs-node backend');",
          "tf = require('@tensorflow/tfjs');",
          "console.log('Falling back to @tensorflow/tfjs (pure JS) backend');",
          "const use = require('@tensorflow-models/universal-sentence-encoder');"
        ]
      },
      {
        action: 'add_dummy_code',
        afterLine: "const use = require('@tensorflow-models/universal-sentence-encoder');",
        code: `// TensorFlow functionality disabled
console.log('TensorFlow functionality disabled - returning dummy vector');
return [0.1, 0.2, 0.3]; // Dummy vector`
      }
    ]
  },
  {
    path: 'Backend/scripts/embed-image.js',
    type: 'js',
    operations: [
      {
        action: 'comment_imports',
        lines: [
          "tf = require('@tensorflow/tfjs-node');",
          "console.log('Using @tensorflow/tfjs-node backend');",
          "tf = require('@tensorflow/tfjs');",
          "console.log('Falling back to @tensorflow/tfjs (pure JS) backend');",
          "const mobilenet = require('@tensorflow-models/mobilenet');"
        ]
      },
      {
        action: 'add_dummy_code',
        afterLine: "const mobilenet = require('@tensorflow-models/mobilenet');",
        code: `// TensorFlow functionality disabled
console.log('TensorFlow functionality disabled - returning dummy vector');
return [0.1, 0.2, 0.3]; // Dummy vector`
      }
    ]
  },
  {
    path: 'Backend/controllers/embeddingController.js',
    type: 'js',
    operations: [
      {
        action: 'comment_imports',
        lines: [
          "tf = require('@tensorflow/tfjs-node');",
          "tf = require('@tensorflow/tfjs');"
        ]
      },
      {
        action: 'comment_try_catch',
        startLine: "try {",
        endLine: "} catch (err) {",
        lines: [
          "tf = require('@tensorflow/tfjs-node');",
          "} catch (err) {",
          "tf = require('@tensorflow/tfjs');",
          "}"
        ]
      }
    ]
  }
];

function commentJsonDependencies(filePath, dependencies) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // Move TensorFlow dependencies to a commented section
    if (!packageJson.xTempDisabledDependencies) {
      packageJson.xTempDisabledDependencies = {};
    }
    
    dependencies.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        packageJson.xTempDisabledDependencies[dep] = packageJson.dependencies[dep];
        delete packageJson.dependencies[dep];
        console.log(`  ✓ Moved ${dep} to disabled section`);
      }
    });
    
    fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));
    console.log(`  ✓ Updated ${filePath}`);
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error.message);
  }
}

function commentJsImports(filePath, linesToComment) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    linesToComment.forEach(line => {
      const regex = new RegExp(`^${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm');
      if (content.includes(line)) {
        content = content.replace(regex, `// ${line}`);
        console.log(`  ✓ Commented: ${line}`);
      }
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Updated ${filePath}`);
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error.message);
  }
}

function addDummyCode(filePath, afterLine, dummyCode) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(afterLine)) {
      const lines = content.split('\n');
      const afterIndex = lines.findIndex(line => line.includes(afterLine));
      
      if (afterIndex !== -1) {
        // Insert dummy code after the specified line
        lines.splice(afterIndex + 1, 0, '', dummyCode);
        content = lines.join('\n');
        
        fs.writeFileSync(filePath, content);
        console.log(`  ✓ Added dummy code to ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Error adding dummy code to ${filePath}:`, error.message);
  }
}

function commentTryCatch(filePath, lines) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Comment out the entire try-catch block for TensorFlow imports
    const tryCatchPattern = /try\s*\{\s*tf\s*=\s*require\('@tensorflow\/tfjs-node'\);\s*\}\s*catch\s*\(err\)\s*\{\s*tf\s*=\s*require\('@tensorflow\/tfjs'\);\s*\}/g;
    
    if (tryCatchPattern.test(content)) {
      content = content.replace(tryCatchPattern, (match) => {
        return match.split('\n').map(line => `// ${line}`).join('\n');
      });
      
      fs.writeFileSync(filePath, content);
      console.log(`  ✓ Commented try-catch block in ${filePath}`);
    }
  } catch (error) {
    console.error(`  ❌ Error commenting try-catch in ${filePath}:`, error.message);
  }
}

// Process each file
filesToModify.forEach(file => {
  console.log(`📁 Processing ${file.path}...`);
  
  file.operations.forEach(operation => {
    const fullPath = path.join(__dirname, file.path);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`  ⚠️  File not found: ${fullPath}`);
      return;
    }
    
    switch (operation.action) {
      case 'comment_dependencies':
        commentJsonDependencies(fullPath, operation.dependencies);
        break;
      case 'comment_imports':
        commentJsImports(fullPath, operation.lines);
        break;
      case 'comment_try_catch':
        commentTryCatch(fullPath, operation.lines);
        break;
      case 'add_dummy_code':
        addDummyCode(fullPath, operation.afterLine, operation.code);
        break;
    }
  });
  
  console.log('');
});

console.log('✅ TensorFlow functionality has been disabled!');
console.log('\n📝 Summary:');
console.log('  • TensorFlow dependencies moved to xTempDisabledDependencies in package.json files');
console.log('  • TensorFlow imports commented out in JavaScript files');
console.log('  • Dummy code added to prevent runtime errors');
console.log('\n💡 To re-enable TensorFlow, run: node enable-tensorflow.js');
