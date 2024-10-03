const fs = require('fs');
const vscode = require('vscode');
const axios = require('axios');

const extractCssClasses = (css) => {
  try {
    const classRegex = /\.([a-zA-Z0-9\-_]+)([^{]*?)\s*{([^}]*)}/gs;
    const classes = [];
    const uniqueClasses = new Set();
    let match;

    while ((match = classRegex.exec(css))) {
      const className = match[1];
      let classProperties = match[0];

      classProperties = classProperties
        .replace(/\s*{\s*/, ' {\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\s*}\s*$/, '\n}');

      if (!uniqueClasses.has(className)) {
        uniqueClasses.add(className);
        classes.push({
          className: className,
          classProperties: classProperties,
        });
      }
    }

    return classes;
  } catch (error) {
    console.error(`Error extracting CSS classes: ${error}`);
    return [];
  }
};

const getBootstrapCdnLink = async () => {
  try {
    const htmlFiles = await vscode.workspace.findFiles('**/*.html');
    const cdnRegex = /<link[^>]+href=["']((?!cdn)[^"']*bootstrap[^"']*\.css)["']/;

    for (const file of htmlFiles) {
      const content = await fs.promises.readFile(file.fsPath, 'utf8');
      const match = content.match(cdnRegex);

      if (match) return match[1];
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
    const versionRegex = /(?:bootstrap[\/@]?)(\d+\.\d+\.\d+)/;
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

      const normalizedPath = bootstrapFilePath.replace(/^\.\/|^\//, '');

      if (normalizedPath !== bootstrapFilePath) {
        searchPatterns.push(normalizedPath);
      }

      searchPatterns.push(bootstrapFilePath);
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

const getClasses = async () => {
  try {
    let css = await getCssFromLocalFiles();

    if (!css) {
      const cdnLink = await getBootstrapCdnLink();
      if (cdnLink) {
        css = await getCssFromCdn(cdnLink);
      }
    }

    if (css) return extractCssClasses(css);

    return null;
  } catch (error) {
    vscode.window.showInformationMessage(`Error finding Bootstrap classes: ${error}`);
    return null;
  }
};

module.exports = {
  getClasses,
};
