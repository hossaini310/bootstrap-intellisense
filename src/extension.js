const vscode = require('vscode');
const {
  getBsClasses,
  getBsVersion,
  setBsVersion,
  clearCache,
  setStatusBarItem,
} = require('./bootstrap');

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
];

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('bootstrap-intellisense.enable', () => {
      vscode.window.showInformationMessage('Activated Bootstrap IntelliSense');
    }),
  );

  const disposable = vscode.languages.registerCompletionItemProvider(
    languageSupport,
    {
      async provideCompletionItems(document, position) {
        const lineText = document.lineAt(position).text;
        if (
          lineText.lastIndexOf('class=', position.character) === -1 &&
          lineText.lastIndexOf('className=', position.character) === -1
        ) {
          return undefined;
        }
        const classes = await getBsClasses();
        const completionItems = [];
        for (const className of classes) {
          const completionItem = new vscode.CompletionItem();
          completionItem.label = `${className} `;

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

  setStatusBarItem(getBsVersion());

  context.subscriptions.push(
    vscode.commands.registerCommand('bootstrap-intellisense.changeVersion', () => {
      selectBootstrapVersion();
    }),
  );
}

function deactivate() {
  clearCache();
}

function selectBootstrapVersion() {
  const versionList5 = ['Bootstrap v5.3', 'Bootstrap v5.2', 'Bootstrap v5.1', 'Bootstrap v5.0'];
  const versionList4 = [
    'Bootstrap v4.6',
    'Bootstrap v4.5',
    'Bootstrap v4.4',
    'Bootstrap v4.3',
    'Bootstrap v4.2',
    'Bootstrap v4.1',
    'Bootstrap v4.0',
  ];

  const versionList = [...versionList5, ...versionList4];

  const currentVersion = getBsVersion();

  const version = vscode.window.createQuickPick();

  version.items = versionList.map((version) => {
    return {
      label: version,
      description: version === currentVersion ? 'Version Selected' : '',
    };
  });

  version.onDidChangeSelection((selection) => {
    if (selection[0]) {
      setStatusBarItem(selection[0].label);
      setBsVersion(selection[0].label);
      vscode.window.showInformationMessage(`Selected Bootstrap version: ${selection[0].label}`);

      version.dispose();
    }
  });
  version.show();
}

module.exports = {
  activate,
  deactivate,
};
