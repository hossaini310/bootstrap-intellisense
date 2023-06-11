const os = require('os');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const vscode = require('vscode');

let url = 'https://cdn.jsdelivr.net/npm/bootstrap@latest/dist/css/bootstrap.css';
let statusBarItem = null;

const setStatusBarItem = (version) => {
  if (statusBarItem === null) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
  }

  statusBarItem.command = 'extension.selectBootstrapVersion';
  statusBarItem.text = version;

  statusBarItem.show();
};

const getBsClasses = async () => {
  const classesCache = getCacheClasses();

  if (classesCache.length === 0) {
    const rootPath = vscode.workspace.workspaceFolders;
    if (rootPath !== undefined) {
      const bootstrapPath = path.join(
        rootPath[0].uri.fsPath,
        'node_modules',
        'bootstrap',
        'dist',
        'css',
        'bootstrap.css',
      );
      if (fs.existsSync(bootstrapPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(
            path.join(rootPath[0].uri.fsPath, 'node_modules', 'bootstrap', 'package.json'),
            'utf8',
          ),
        );
        if (packageJson.config.version_short) {
          setStatusBarItem(`bs v${packageJson.config.version_short}`);
          setBsVersion(`bs v${packageJson.config.version_short}`);
        } else {
          setBsVersion(`bs v${packageJson.version}`);
          setStatusBarItem(`bs v${packageJson.config.version}`);
        }
        const css = fs.readFileSync(bootstrapPath, 'utf8');
        return extractCssClasses(css);
      }
    }

    const version = getBsVersion();
    if (version !== 'latest') {
      url = url.replace('latest', version);
    }

    const response = await fetch(url);
    const responseText = await response.text();
    const classes = extractCssClasses(responseText);

    saveCacheClasses(classes);

    return classes;
  }
  return classesCache;
};

const extractCssClasses = (css) => {
  const classRegex = /\.(?!\d)([\w-]+)/g;
  const classes = new Set();
  let match;
  while ((match = classRegex.exec(css))) {
    classes.add(match[1]);
  }
  return Array.from(classes);
};

const getBsVersion = () => {
  const config = vscode.workspace.getConfiguration('bootstrapIntelliSense');
  return config.get('version') || 'bs v5.3';
};

const setBsVersion = (version) => {
  const config = vscode.workspace.getConfiguration('bootstrapIntelliSense');
  config.update('version', version, true);
};

const saveCacheClasses = (classes) => {
  const cachePath = getCachePath();
  fs.writeFileSync(cachePath, JSON.stringify(classes));
};

const getCacheClasses = () => {
  const cachePath = getCachePath();
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }
  return [];
};

const clearCache = () => {
  const cachePathDir = getCacheDir();
  fs.readdir(cachePathDir, (err, files) => {
    if (err) {
      throw err;
    }
    for (const file of files) {
      fs.unlinkSync(cachePathDir + file);
    }
  });
};

const getCachePath = () => {
  const cacheDir = getCacheDir();
  const version = getBsVersion();
  return path.join(cacheDir, `bootstrap-classes-${version}.json`);
};

const getCacheDir = () => {
  let cachePath;
  if (process.platform === 'win32') {
    cachePath = path.join(os.homedir(), 'AppData', 'Local', 'bootstrap-intelliSense', 'cache');
  } else if (process.platform === 'darwin') {
    cachePath = path.join(os.homedir(), 'Library', 'Caches', 'bootstrap-intelliSense');
  } else {
    cachePath = path.join(os.homedir(), '.cache', 'bootstrap-intelliSense');
  }
  try {
    fs.mkdirSync(cachePath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Failed to create cache directory: ${err.message}`);
    }
  }
  return cachePath;
};

module.exports = {
  getBsClasses,
  getBsVersion,
  setBsVersion,
  clearCache,
  setStatusBarItem,
};
