const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const axios = require('axios');

let statusBarItem = null;
let cachedClasses = null;
let cachedFileMtime = null;

const getBootstrapCdnLink = async () => {
  try {
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
  } catch (error) {
    vscode.window.showWarningMessage(`Error finding Bootstrap CDN link: ${error}`);
    return null;
  }
};

const getBootstrapVersion = (cdnLink) => {
  const versionRegex = /@(\d+\.\d+\.\d+)/;
  const matches = cdnLink.match(versionRegex);
  if (matches && matches[1]) {
    return matches[1];
  }
};

const setStatusBarItem = async () => {
  try {
    const packageJsonPath = await vscode.workspace.findFiles(
      '**/node_modules/bootstrap/package.json',
    );
    let bootstrapVersion;

    if (packageJsonPath[0]) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(packageJsonPath[0].fsPath), 'utf8'));
      bootstrapVersion = packageJson.version;
    } else {
      bootstrapVersion = getBootstrapVersion(await getBootstrapCdnLink());
    }

    if (!statusBarItem) {
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
  } catch (error) {
    return null;
  }
};

const extractCssClasses = (css) => {
  try {
    const classRegex = /(?:^|\s)\.([\w-]+)\s*{([^}]*)}/gs;
    const classes = [];
    let match;

    while ((match = classRegex.exec(css))) {
      const className = match[1];
      let classContent = match[2].trim();

      classContent = '{\n  ' + classContent;
      classContent = classContent.replace(/;\s*/g, ';\n  ');
      classContent = classContent.replace(/\s*$/, '\n}');

      classes.push({
        className,
        classContent: `.${className} ${classContent}`,
      });
    }

    return classes;
  } catch (error) {
    vscode.window.showWarningMessage(`Error extracting CSS classes: ${error}`);
    return [];
  }
};

const getCssFromCdn = async (url) => {
  try {
    const bootstrapVersion = getBootstrapVersion(url);
    const response = await axios.get(
      `https://cdn.jsdelivr.net/npm/bootstrap@${bootstrapVersion}/dist/css/bootstrap.css`,
    );
    return response.data;
  } catch (error) {
    vscode.window.showWarningMessage(`Error fetching Bootstrap CSS from CDN: ${error}`);
    return null;
  }
};

const getBsClasses = async () => {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null; // No workspace is open
    }

    const bootstrapFiles = await vscode.workspace.findFiles(
      '**/node_modules/bootstrap/dist/css/bootstrap.css',
    );

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
    } else {
      const cdnLink = await getBootstrapCdnLink();
      if (cdnLink) {
        const css = await getCssFromCdn(cdnLink);
        if (css) {
          cachedClasses = extractCssClasses(css);
          return cachedClasses;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  getBsClasses,
  setStatusBarItem,
};
