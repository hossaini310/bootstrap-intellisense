const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

let statusBarItem = null;
let cachedClasses = null;
let cachedFileMtime = null;

const setStatusBarItem = async () => {
  const packageJsonPath = await vscode.workspace.findFiles(
    '**/node_modules/bootstrap/package.json',
  );

  if (!packageJsonPath[0]) {
    vscode.window.showWarningMessage('Bootstrap is not included in node_modules');
  }

  const packageJson = await JSON.parse(
    fs.readFileSync(path.join(packageJsonPath[0].fsPath), 'utf8'),
  );

  if (statusBarItem === null) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
  }

  statusBarItem.text = `$(bootstrap-icon) Bootstrap v${packageJson.version
    .split('.')
    .slice(0, 2)
    .join('.')}`;
  statusBarItem.tooltip = 'Your current Bootstrap version in this project';
  statusBarItem.show();
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

const getBsClasses = async () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null; // No workspace is open
  }

  const bootstrap = await vscode.workspace.findFiles(
    '**/node_modules/bootstrap/dist/css/bootstrap.css',
  );

  if (!bootstrap[0]) {
    vscode.window.showWarningMessage('Bootstrap is not included in node_modules');
  }

  const bootstrapPath = bootstrap[0].fsPath;

  try {
    if (fs.existsSync(bootstrapPath)) {
      const stats = fs.statSync(bootstrapPath);
      const mtime = stats.mtime.getTime();

      // If the file has not changed, return the cached value
      if (cachedFileMtime === mtime) {
        return cachedClasses;
      }

      // File has changed or is being loaded for the first time
      const css = fs.readFileSync(bootstrapPath, 'utf8');
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
};

module.exports = {
  getBsClasses,
  setStatusBarItem,
};
