export type RuntimeMessage =
  | { type: "response-complete"; conversationTitle?: string }
  | { type: "test-ding" };

export type StorageArea = {
  get(keys?: string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
};

export type BrowserApi = {
  runtime: {
    getURL(path: string): string;
    sendMessage(message: RuntimeMessage): Promise<unknown>;
    onMessage?: {
      addListener(
        listener: (
          message: RuntimeMessage,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ): void;
    };
  };
  storage: {
    sync?: StorageArea;
    local: StorageArea;
  };
  notifications?: {
    create(id: string, options: Record<string, unknown>): Promise<string>;
  };
};

type CallbackStorageArea = {
  get(
    keys: string[] | Record<string, unknown> | null,
    callback: (items: Record<string, unknown>) => void,
  ): void;
  set(values: Record<string, unknown>, callback?: () => void): void;
};

type CallbackRuntime = {
  lastError?: { message?: string };
  getURL(path: string): string;
  sendMessage(message: RuntimeMessage, callback?: (response: unknown) => void): void;
  onMessage?: BrowserApi["runtime"]["onMessage"];
};

type CallbackNotifications = {
  create(id: string, options: Record<string, unknown>, callback?: (notificationId: string) => void): void;
};

declare const browser: BrowserApi | undefined;
declare const chrome:
  | {
      runtime: CallbackRuntime;
      storage: {
        sync?: CallbackStorageArea;
        local: CallbackStorageArea;
      };
      notifications?: CallbackNotifications;
    }
  | undefined;

const callbackStoreToPromise = (area: CallbackStorageArea, runtime: CallbackRuntime): StorageArea => ({
  get: (keys) =>
    new Promise((resolve, reject) => {
      area.get(keys ?? null, (items) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message ?? "Storage read failed"));
          return;
        }
        resolve(items);
      });
    }),
  set: (values) =>
    new Promise((resolve, reject) => {
      area.set(values, () => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message ?? "Storage write failed"));
          return;
        }
        resolve();
      });
    }),
});

export const getBrowserApi = (): BrowserApi => {
  if (typeof browser !== "undefined") {
    return browser;
  }

  if (typeof chrome === "undefined") {
    throw new Error("WebExtension runtime API is unavailable.");
  }

  return {
    runtime: {
      getURL: (path) => chrome.runtime.getURL(path),
      sendMessage: (message) =>
        new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message ?? "Runtime message failed"));
              return;
            }
            resolve(response);
          });
        }),
      onMessage: chrome.runtime.onMessage,
    },
    storage: {
      sync: chrome.storage.sync ? callbackStoreToPromise(chrome.storage.sync, chrome.runtime) : undefined,
      local: callbackStoreToPromise(chrome.storage.local, chrome.runtime),
    },
    notifications: chrome.notifications
      ? {
          create: (id, options) =>
            new Promise((resolve, reject) => {
              chrome.notifications?.create(id, options, (notificationId) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message ?? "Notification failed"));
                  return;
                }
                resolve(notificationId);
              });
            }),
        }
      : undefined,
  };
};
