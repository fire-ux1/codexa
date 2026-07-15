export interface InlinePatchWidgetConfig {
  id: string;
  lineNumber: number;
  headerText: string;
  bodyText: string;
  showActions: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function createInlinePatchWidget(
  editor: any,
  monacoInstance: any,
  config: InlinePatchWidgetConfig
) {
  const domNode = document.createElement("div");
  domNode.className = "monaco-inline-patch-widget";
  domNode.innerHTML = `
    <div class="ip-header">${config.headerText}</div>
    <div class="ip-body font-mono text-[11px] text-soft whitespace-pre-wrap">${config.bodyText}</div>
    <div class="ip-actions" style="display: ${config.showActions ? "flex" : "none"};">
      <button class="ip-reject">Reject</button>
      <button class="ip-accept">Accept</button>
    </div>
  `;

  const widget = {
    getId: () => config.id,
    getDomNode: () => domNode,
    getPosition: () => ({
      position: { lineNumber: config.lineNumber, column: 1 },
      preference: [
        monacoInstance.editor.ContentWidgetPositionPreference.BELOW,
        monacoInstance.editor.ContentWidgetPositionPreference.ABOVE,
      ],
    }),
  };

  domNode.querySelector(".ip-reject")?.addEventListener("click", config.onReject);
  domNode.querySelector(".ip-accept")?.addEventListener("click", config.onAccept);

  editor.addContentWidget(widget);
  editor.layoutContentWidget(widget);

  return {
    widget,
    domNode,
    destroy: () => {
      try {
        editor.removeContentWidget(widget);
      } catch {
        // Safe catch if widget already removed
      }
    },
  };
}
