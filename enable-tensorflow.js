#!/usr/bin/env node

/**
 * Script to enable TensorFlow dependencies and functionality
 * This script uncomments all TensorFlow-related code in the project
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Enabling TensorFlow dependencies and functionality...\n');

// Files to modify
const filesToModify = [
  {
    path: 'Backend/package.json',
    type: 'json',
    operations: [
      {
        action: 'restore_dependencies',
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
        action: 'restore_dependencies',
        dependencies: ['@tensorflow/tfjs']
      }
    ]
  },
  {
    path: 'Backend/scripts/embed.js',
    type: 'js',
    operations: [
      {
        action: 'uncomment_imports',
        lines: [
          "// tf = require('@tensorflow/tfjs-node');",
          "// console.log('Using @tensorflow/tfjs-node backend');",
          "// tf = require('@tensorflow/tfjs');",
          "// console.log('Falling back to @tensorflow/tfjs (pure JS) backend');",
          "// const use = require('@tensorflow-models/universal-sentence-encoder');"
        ]
      },
      {
        action: 'remove_dummy_code',
        lines: [
          "// TensorFlow functionality disabled",
          "console.log('TensorFlow functionality disabled - returning dummy vector');",
          "return [0.1, 0.2, 0.3]; // Dummy vector"
        ]
      }
    ]
  },
  {
    path: 'Backend/scripts/embed-image.js',
    type: 'js',
    operations: [
      {
        action: 'uncomment_imports',
        lines: [
          "// tf = require('@tensorflow/tfjs-node');",
          "// console.log('Using @tensorflow/tfjs-node backend');",
          "// tf = require('@tensorflow/tfjs');",
          "// console.log('Falling back to @tensorflow/tfjs (pure JS) backend');",
          "// const mobilenet = require('@tensorflow-models/mobilenet');"
        ]
      },
      {
        action: 'remove_dummy_code',
        lines: [
          "// TensorFlow functionality disabled",
          "console.log('TensorFlow functionality disabled - returning dummy vector');",
          "return [0.1, 0.2, 0.3]; // Dummy vector"
        ]
      }
    ]
  },
  {
    path: 'Backend/controllers/embeddingController.js',
    type: 'js',
    operations: [
      {
        action: 'uncomment_imports',
        lines: [
          "// tf = require('@tensorflow/tfjs-node');",
          "// tf = require('@tensorflow/tfjs');"
        ]
      }
    ]
  }
];

function restoreJsonDependencies(filePath, dependencies) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // Restore TensorFlow dependencies from disabled section
    if (packageJson.xTempDisabledDependencies) {
      dependencies.forEach(dep => {
        if (packageJson.xTempDisabledDependencies[dep]) {
          if (!packageJson.dependencies) {
            packageJson.dependencies = {};
          }
          packageJson.dependencies[dep] = packageJson.xTempDisabledDependencies[dep];
          delete packageJson.xTempDisabledDependencies[dep];
          console.log(`  ✓ Restored ${dep} to dependencies`);
        }
      });
      
      // Remove empty disabled section
      if (Object.keys(packageJson.xTempDisabledDependencies).length === 0) {
        delete packageJson.xTempDisabledDependencies;
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));
    console.log(`  ✓ Updated ${filePath}`);
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error.message);
  }
}

function uncommentJsImports(filePath, linesToUncomment) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    linesToUncomment.forEach(commentedLine => {
      const uncommentedLine = commentedLine.replace(/^\/\/\s*/, '');
      const regex = new RegExp(`^${commentedLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm');
      
      if (content.includes(commentedLine)) {
        content = content.replace(regex, uncommentedLine);
        console.log(`  ✓ Uncommented: ${uncommentedLine}`);
      }
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Updated ${filePath}`);
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error.message);
  }
}

function removeDummyCode(filePath, linesToRemove) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    linesToRemove.forEach(line => {
      const regex = new RegExp(`^${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm');
      if (content.includes(line)) {
        content = content.replace(regex, '');
        console.log(`  ✓ Removed: ${line}`);
      }
    });
    
    // Clean up extra empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Cleaned up ${filePath}`);
  } catch (error) {
    console.error(`  ❌ Error cleaning up ${filePath}:`, error.message);
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
      case 'restore_dependencies':
        restoreJsonDependencies(fullPath, operation.dependencies);
        break;
      case 'uncomment_imports':
        uncommentJsImports(fullPath, operation.lines);
        break;
      case 'remove_dummy_code':
        removeDummyCode(fullPath, operation.lines);
        break;
    }
  });
  
  console.log('');
});

console.log('✅ TensorFlow functionality has been enabled!');
console.log('\n📝 Summary:');
console.log('  • TensorFlow dependencies restored to dependencies in package.json files');
console.log('  • TensorFlow imports uncommented in JavaScript files');
console.log('  • Dummy code removed');
console.log('\n💡 To disable TensorFlow again, run: node disable-tensorflow.js');
console.log('\n🔧 Next steps:');
console.log('  • Run npm install to install TensorFlow dependencies');
console.log('  • Test the application to ensure everything works correctly');
