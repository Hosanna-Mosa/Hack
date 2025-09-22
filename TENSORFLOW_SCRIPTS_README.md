# TensorFlow Management Scripts

This directory contains two Node.js scripts to easily enable and disable TensorFlow dependencies and functionality in the project.

## Scripts Overview

### 1. `disable-tensorflow.js`
**Purpose**: Comments out all TensorFlow dependencies and functionality
**Usage**: `node disable-tensorflow.js`

**What it does**:
- Moves TensorFlow dependencies from `dependencies` to `xTempDisabledDependencies` in `package.json` files
- Comments out TensorFlow imports in JavaScript files
- Adds dummy code to prevent runtime errors
- Affects files:
  - `Backend/package.json`
  - `App/package.json`
  - `Backend/scripts/embed.js`
  - `Backend/scripts/embed-image.js`
  - `Backend/controllers/embeddingController.js`

### 2. `enable-tensorflow.js`
**Purpose**: Uncomments all TensorFlow dependencies and functionality
**Usage**: `node enable-tensorflow.js`

**What it does**:
- Restores TensorFlow dependencies from `xTempDisabledDependencies` back to `dependencies` in `package.json` files
- Uncomments TensorFlow imports in JavaScript files
- Removes dummy code
- Cleans up extra empty lines

## Quick Start

### To Disable TensorFlow:
```bash
cd Hack
node disable-tensorflow.js
```

### To Enable TensorFlow:
```bash
cd Hack
node enable-tensorflow.js
```

## When to Use These Scripts

### Use `disable-tensorflow.js` when:
- You encounter TensorFlow installation issues during development
- You want to run the project without TensorFlow functionality
- You need to deploy to an environment where TensorFlow is not available
- You're debugging non-TensorFlow related issues

### Use `enable-tensorflow.js` when:
- You want to restore full TensorFlow functionality
- You're ready to work with face recognition features
- You're deploying to production where TensorFlow is available
- You need to test TensorFlow-dependent features

## Important Notes

1. **After enabling TensorFlow**, run `npm install` to install the dependencies:
   ```bash
   cd Backend
   npm install
   
   cd ../App
   npm install
   ```

2. **The scripts are safe to run multiple times** - they won't cause issues if run repeatedly

3. **Backup your work** before running these scripts if you have uncommitted changes

4. **The scripts only affect the files listed above** - other TensorFlow references in the codebase are not modified

## Files Modified

| File | Type | Changes |
|------|------|---------|
| `Backend/package.json` | JSON | Moves TensorFlow deps to/from `xTempDisabledDependencies` |
| `App/package.json` | JSON | Moves TensorFlow deps to/from `xTempDisabledDependencies` |
| `Backend/scripts/embed.js` | JS | Comments/uncomments TensorFlow imports and adds/removes dummy code |
| `Backend/scripts/embed-image.js` | JS | Comments/uncomments TensorFlow imports and adds/removes dummy code |
| `Backend/controllers/embeddingController.js` | JS | Comments/uncomments TensorFlow imports |

## Troubleshooting

### If the scripts fail:
1. Make sure you're running them from the `Hack` directory
2. Check that all target files exist
3. Ensure you have write permissions to the files
4. Check the console output for specific error messages

### If TensorFlow still doesn't work after enabling:
1. Run `npm install` in both `Backend` and `App` directories
2. Clear `node_modules` and reinstall if needed
3. Check that your Node.js version is compatible with TensorFlow

## Example Workflow

```bash
# Start development without TensorFlow
cd Hack
node disable-tensorflow.js

# Work on non-TensorFlow features
# ... your development work ...

# When ready to work with TensorFlow features
node enable-tensorflow.js
cd Backend && npm install
cd ../App && npm install

# Test TensorFlow functionality
# ... your TensorFlow development work ...
```
