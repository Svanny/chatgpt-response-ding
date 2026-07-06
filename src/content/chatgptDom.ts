export type ChatGptSnapshot = {
  text: string;
  isBusy: boolean;
  assistantTurnId?: string;
};

const ASSISTANT_SELECTORS = [
  '[data-message-author-role="assistant"]',
  '[data-testid^="conversation-turn-"] [data-message-author-role="assistant"]',
  "article",
].join(",");

const BUSY_SELECTORS = [
  '[data-testid="stop-button"]',
  '[data-testid="composer-stop-button"]',
  '[data-testid*="stop-button"]',
  '[aria-label*="Stop"]',
  '[aria-label*="stop"]',
  'button[data-testid*="stop"]',
].join(",");

const BUSY_TEXT_PATTERNS = [
  /^\s*(thinking|reasoning|searching|working)\s*$/i,
  /^\s*stop generating\s*$/i,
];

const getStableTurnId = (element: Element, index: number): string => {
  const carrier = element.closest("[data-message-id], [data-testid], article") ?? element;
  const explicitId =
    carrier.getAttribute("data-message-id") ??
    carrier.getAttribute("data-testid") ??
    element.getAttribute("data-message-id");

  if (explicitId) {
    return explicitId;
  }

  const text = element.textContent?.trim() ?? "";
  return `assistant-${index}-${text.slice(0, 64)}`;
};

const getAssistantElements = (root: ParentNode): Element[] => {
  return Array.from(root.querySelectorAll(ASSISTANT_SELECTORS)).filter((element) => {
    const role = element.getAttribute("data-message-author-role");
    if (role) {
      return role === "assistant";
    }

    const text = element.textContent?.trim() ?? "";
    return text.length > 0 && !element.querySelector('[data-message-author-role="user"]');
  });
};

export const readChatGptSnapshot = (root: ParentNode = document): ChatGptSnapshot => {
  const assistantElements = getAssistantElements(root);
  const latestAssistant = assistantElements.at(-1);
  const liveStatusText = Array.from(
    document.querySelectorAll('[role="status"], [aria-live], [data-testid*="status"]'),
  )
    .map((element) => element.textContent?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
  const busyByControl = Boolean(document.querySelector(BUSY_SELECTORS));
  const busyByText = BUSY_TEXT_PATTERNS.some((pattern) => pattern.test(liveStatusText));

  if (!latestAssistant) {
    return {
      text: "",
      isBusy: busyByControl || busyByText,
    };
  }

  return {
    text: latestAssistant.textContent?.trim() ?? "",
    isBusy: busyByControl || busyByText,
    assistantTurnId: getStableTurnId(latestAssistant, assistantElements.length - 1),
  };
};
