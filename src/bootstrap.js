const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const axios = require('axios');

let statusBarItem = null;
let cachedClasses = null;
let cachedFileMtime = null;

const getBootstrapCdnLink = async () => {
  const htmlFiles = await vscode.workspace.findFiles('**/*.html');
  const cdnRegex =
    /<link[^>]+href=["'](https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[\d\.]+\/dist\/css\/bootstrap\.min\.css)["']/;

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file.fsPath, 'utf8');
    const match = cdnRegex.exec(content);
    if (match) {
      return match[1];
    }
  }

  return null;
};

const setStatusBarItem = async () => {
  const packageJsonPath = await vscode.workspace.findFiles(
    '**/node_modules/bootstrap/package.json',
  );
  let bootstrapVersion;

  if (packageJsonPath[0]) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(packageJsonPath[0].fsPath), 'utf8'));
    bootstrapVersion = packageJson.version;
  } else {
    const bootstrapCdnLink = await getBootstrapCdnLink();
    if (bootstrapCdnLink) {
      const versionRegex = /@(\d+\.\d+\.\d+)/;
      const matches = bootstrapCdnLink.match(versionRegex);
      if (matches && matches[1]) {
        bootstrapVersion = matches[1];
      }
    }
  }

  if (statusBarItem === null) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
  }

  if (bootstrapVersion) {
    statusBarItem.text = `$(bootstrap-icon) Bootstrap v${bootstrapVersion
      .split('.')
      .slice(0, 2)
      .join('.')}`;
    statusBarItem.tooltip = 'Your current Bootstrap version in this project';
    statusBarItem.show();
  }
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

const getCssFromCdn = async (url) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    vscode.window.showWarningMessage(`Error fetching Bootstrap CSS from CDN: ${error}`);
    return null;
  }
};

const getBsClasses = async () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null; // No workspace is open
  }

  const bootstrapFiles = await vscode.workspace.findFiles(
    '**/node_modules/bootstrap/dist/css/bootstrap.css',
  );

  let css = null;

  if (bootstrapFiles.length > 0) {
    const bootstrapPath = bootstrapFiles[0].fsPath;

    try {
      if (fs.existsSync(bootstrapPath)) {
        const stats = fs.statSync(bootstrapPath);
        const mtime = stats.mtime.getTime();

        // If the file has not changed, return the cached value
        if (cachedFileMtime === mtime) {
          return cachedClasses;
        }

        // File has changed or is being loaded for the first time
        css = fs.readFileSync(bootstrapPath, 'utf8');
        cachedClasses = extractCssClasses(css);
        cachedFileMtime = mtime;

        return cachedClasses;
      } else {
        vscode.window.showInformationMessage(`Bootstrap file not found: ${bootstrapPath}`);
        return null;
      }
    } catch (error) {
      vscode.window.showInformationMessage(`Error reading Bootstrap file: ${error}`);
      return null;
    }
  } else {
    const cdnLink = await getBootstrapCdnLink();
    if (cdnLink) {
      css = await getCssFromCdn(cdnLink);
    }
  }
  if (css) {
    cachedClasses = extractCssClasses(css);
    return cachedClasses;
  }
  return null;
};

module.exports = {
  getBsClasses,
  setStatusBarItem,
};
