import { DingPlayer } from "./audio";
import { readChatGptSnapshot } from "./chatgptDom";
import { getBrowserApi } from "../shared/browser";
import { ResponseCompletionDetector } from "../shared/detector";
import { loadSettings } from "../shared/settings";

const api = getBrowserApi();
const player = new DingPlayer(api);
const detector = new ResponseCompletionDetector();

let pendingTimer: number | undefined;
let quietCheckTimer: number | undefined;
let scheduledQuietCheckKey: string | undefined;
let observer: MutationObserver | undefined;

const evaluate = async (): Promise<void> => {
  const snapshot = readChatGptSnapshot(document);
  const events = detector.ingest({
    ...snapshot,
    now: Date.now(),
  });

  for (const event of events) {
    if (event.type !== "completed") {
      continue;
    }

    const settings = await loadSettings(api);
    if (!settings.enabled) {
      continue;
    }

    try {
      await player.play(settings.volume);
    } catch {
      if (settings.notificationFallback) {
        await api.runtime.sendMessage({
          type: "response-complete",
          conversationTitle: document.title.replace(/\s*\|\s*ChatGPT\s*$/i, ""),
        });
      }
    }
  }

  if (snapshot.isBusy) {
    scheduledQuietCheckKey = undefined;
    if (quietCheckTimer) {
      window.clearTimeout(quietCheckTimer);
      quietCheckTimer = undefined;
    }
    return;
  }

  if (snapshot.assistantTurnId) {
    const quietCheckKey = `${snapshot.assistantTurnId}:${snapshot.text.length}:${snapshot.text.slice(-64)}`;
    if (scheduledQuietCheckKey === quietCheckKey) {
      return;
    }

    scheduledQuietCheckKey = quietCheckKey;
    if (quietCheckTimer) {
      window.clearTimeout(quietCheckTimer);
    }

    quietCheckTimer = window.setTimeout(() => {
      quietCheckTimer = undefined;
      void evaluate();
    }, 1900);
  }
};

const scheduleEvaluation = (): void => {
  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
  }

  pendingTimer = window.setTimeout(() => {
    pendingTimer = undefined;
    void evaluate();
  }, 250);
};

const start = (): void => {
  observer?.disconnect();
  observer = new MutationObserver(scheduleEvaluation);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "data-testid", "data-message-author-role", "data-message-id"],
  });

  void evaluate();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
