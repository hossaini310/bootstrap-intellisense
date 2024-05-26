const vscode = require('vscode');
const { getBsClasses, setStatusBarItem } = require('./bootstrap');

const languageSupport = [
  'html',
  'php',
  'handlebars',
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
  'vue',
  'vue-html',
  'svelte',
  'astro',
  'twig',
  'erb',
  'django-html',
  'blade',
  'razor',
  'ejs',
  'markdown',
  'css',
  'scss',
  'sass',
  'less',
  'stylus',
  'jade',
  'pug',
  'haml',
  'slim',
  'liquid',
  'edge',
  'jinja',
  'j2',
  'asp',
];

const provideCompletionItems = (document, position) => {
  const classRegex = /class\s*=\s*['"]([^'"]*)/;
  return new Promise(async (resolve, reject) => {
    try {
      const lineUntilPos = document.getText(
        new vscode.Range(new vscode.Position(position.line, 0), position),
      );
      const matches = classRegex.exec(lineUntilPos);
      if (!matches) {
        resolve([]);
        return;
      }

      const usedClasses = matches[1].split(' ').filter((cls) => cls.trim() !== '');
      const availableClasses = await getBsClasses();
      const completionItems = availableClasses
        .filter(({ className }) => !usedClasses.includes(className))
        .map(({ className, classContent }) => {
          const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Value);
          item.detail = 'Bootstrap IntelliSense';
          item.documentation = new vscode.MarkdownString().appendCodeblock(classContent, 'css');
          item.insertText = className;
          return item;
        });

      resolve(completionItems);
    } catch (error) {
      console.error('Error in provideCompletionItems:', error.message, error.stack);
      reject([]);
    }
  });
};

const activate = (context) => {
  setStatusBarItem();

  const disposable = vscode.languages.registerCompletionItemProvider(
    languageSupport,
    {
      provideCompletionItems,
    },
    ' ',
    '"',
    "'",
  );

  context.subscriptions.push(disposable);
};

module.exports = { activate };
