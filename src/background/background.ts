import { getBrowserApi, type RuntimeMessage } from "../shared/browser";
import { loadSettings } from "../shared/settings";

const api = getBrowserApi();

api.runtime.onMessage?.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type !== "response-complete") {
    return false;
  }

  void (async () => {
    const settings = await loadSettings(api);
    if (!settings.enabled || !settings.notificationFallback || !api.notifications) {
      sendResponse({ ok: false });
      return;
    }

    await api.notifications.create(`chatgpt-ding-${Date.now()}`, {
      type: "basic",
      iconUrl: api.runtime.getURL("icons/icon-128.png"),
      title: "ChatGPT finished responding",
      message: message.conversationTitle || "Your ChatGPT response is ready.",
    });
    sendResponse({ ok: true });
  })();

  return true;
});
