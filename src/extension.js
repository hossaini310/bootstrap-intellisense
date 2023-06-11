const vscode = require('vscode');
const {
  getBsClasses,
  getBsVersion,
  setBsVersion,
  clearCache,
  setStatusBarItem,
} = require('./bootstrap');

const lenguageSupport = [
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
];

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('bootstrap-intellisense.showOutput', () => {
      vscode.window.showInformationMessage('Activated Bootstrap IntelliSense');
    }),
  );

  const disposable = vscode.languages.registerCompletionItemProvider(
    lenguageSupport,
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
          completionItem.label = className;
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
    vscode.commands.registerCommand('extension.selectBootstrapVersion', () => {
      selectBootstrapVersion();
    }),
  );
}

function deactivate() {
  clearCache();
}

function selectBootstrapVersion() {
  const versionList5 = ['bs v5.3', 'bs v5.2', 'bs v5.1', 'bs v5.0'];
  const versionList4 = [
    'bs v4.6',
    'bs v4.5',
    'bs v4.4',
    'bs v4.3',
    'bs v4.2',
    'bs v4.1',
    'bs v4.0',
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
