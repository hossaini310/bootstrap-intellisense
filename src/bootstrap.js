const fs = require('fs');
const vscode = require('vscode');
const axios = require('axios');

const extractCssClasses = (css) => {
  try {
    const classRegex = /\.([a-zA-Z0-9\-_]+)([^{]*?)\s*{([^}]*)}/gs;
    const classes = [];
    let match;

    while ((match = classRegex.exec(css))) {
      const className = match[1];
      let classProperties = match[0];

      classProperties = classProperties
        .replace(/\s*{\s*/, ' {\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\s*}\s*$/, '\n}');

      classes.push({
        className: className,
        classProperties: classProperties,
      });
    }

    return classes;
  } catch (error) {
    console.error(`Error extracting CSS classes: ${error}`);
    return [];
  }
};

const getBootstrapCdnLink = async () => {
  const cdnRegex = /<link[^>]+href=["']((?!cdn)[^"']*bootstrap[^"']*\.css)["']/;

  try {
    const htmlFiles = await vscode.workspace.findFiles('**/*.html');

    for (const file of htmlFiles) {
      const content = await fs.promises.readFile(file.fsPath, 'utf8');
      const match = content.match(cdnRegex);

      if (match) {
        const cdnLink = match[1];
        return cdnLink;
      }
    }

    return null;
  } catch (error) {
    vscode.window.showWarningMessage(`Error finding Bootstrap CDN link: ${error}`);
    return null;
  }
};

const getCssFromCdn = async (url) => {
  try {
    let bootstrapVersion = null;
    const versionRegex = /@(\d+\.\d+\.\d+)/;
    const matches = url.match(versionRegex);
    if (matches && matches[1]) {
      bootstrapVersion = matches[1];
    }

    const response = await axios.get(
      `https://cdn.jsdelivr.net/npm/bootstrap@${bootstrapVersion}/dist/css/bootstrap.css`,
    );
    return response.data;
  } catch (error) {
    vscode.window.showWarningMessage(`Error fetching Bootstrap CSS from CDN: ${error}`);
    return null;
  }
};

const getCssFromLocalFiles = async () => {
  const htmlFiles = await vscode.workspace.findFiles('**/*.html');
  const bootstrapLinkRegex = /<link[^>]+href=["']((?!.*jsdelivr).*\bbootstrap\b[^"']*)["']/g;
  let searchPatterns = ['**/node_modules/bootstrap/dist/css/bootstrap.css'];

  for (const file of htmlFiles) {
    const fileContent = await fs.promises.readFile(file.fsPath, 'utf8');
    const bootstrapLinkMatches = [...fileContent.matchAll(bootstrapLinkRegex)];

    for (const match of bootstrapLinkMatches) {
      const bootstrapFilePath = match[1];
      searchPatterns.push(bootstrapFilePath.split('./')[1]);
    }
  }

  try {
    for (const pattern of searchPatterns) {
      const bootstrapFiles = await vscode.workspace.findFiles(pattern);
      for (const file of bootstrapFiles) {
        const bootstrapPath = file.fsPath;
        if (fs.existsSync(bootstrapPath)) {
          const css = await fs.promises.readFile(bootstrapPath, 'utf8');
          return css;
        } else {
          vscode.window.showInformationMessage(`Bootstrap file not found: ${bootstrapPath}`);
        }
      }
    }
    return null;
  } catch (error) {
    vscode.window.showInformationMessage(`Error finding Bootstrap file in local files: ${error}`);
    return null;
  }
};

const getBootstrapClasses = async () => {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null; // No workspace is open
    }

    let css = await getCssFromLocalFiles();

    if (!css) {
      const cdnLink = await getBootstrapCdnLink();
      if (cdnLink) {
        css = await getCssFromCdn(cdnLink);
      }
    }

    if (css) {
      return extractCssClasses(css);
    }

    return null;
  } catch (error) {
    vscode.window.showInformationMessage(`Error finding Bootstrap classes: ${error}`);
    return null;
  }
};

module.exports = {
  getBootstrapClasses,
};
