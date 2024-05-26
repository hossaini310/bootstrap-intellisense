const vscode = require('vscode');
const { Position, Range } = vscode;
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

function activate(context) {
  setStatusBarItem();

  const classRegex = /class(?:Name)?=["']([ -\w]*)(?!["'])$/;

  const disposable = vscode.languages.registerCompletionItemProvider(
    languageSupport,
    {
      async provideCompletionItems(document, position) {
        const lineUntilPos = document.getText(new Range(new Position(position.line, 0), position));
        const matches = lineUntilPos.match(classRegex);
        if (!matches) {
          return null;
        }

        const classes = await getBsClasses();
        const completionItems = [];

        matches[1].split(' ').forEach((className) => {
          const index = classes.indexOf(className);
          if (index !== -1) {
            classes.splice(index, 1);
          }
        });

        for (const className of classes) {
          const completionItem = new vscode.CompletionItem(className);

          completionItem.kind = vscode.CompletionItemKind.Value;
          completionItem.detail = 'Bootstrap IntelliSense';

          completionItems.push(completionItem);
        }
        return completionItems;
      },
    },
    ' ',
    '"',
    "'",
  );
  context.subscriptions.push(disposable);
}

module.exports = {
  activate,
};
