import type { BrowserApi } from "./browser";

export type DingSettings = {
  enabled: boolean;
  volume: number;
  notificationFallback: boolean;
};

export const DEFAULT_SETTINGS: DingSettings = {
  enabled: true,
  volume: 0.75,
  notificationFallback: true,
};

const STORAGE_KEY = "dingSettings";

const normalizeSettings = (value: unknown): DingSettings => {
  const input = typeof value === "object" && value !== null ? (value as Partial<DingSettings>) : {};
  const volume = typeof input.volume === "number" ? Math.min(1, Math.max(0, input.volume)) : DEFAULT_SETTINGS.volume;

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_SETTINGS.enabled,
    volume,
    notificationFallback:
      typeof input.notificationFallback === "boolean"
        ? input.notificationFallback
        : DEFAULT_SETTINGS.notificationFallback,
  };
};

export const loadSettings = async (api: BrowserApi): Promise<DingSettings> => {
  const storage = api.storage.sync ?? api.storage.local;
  const items = await storage.get({ [STORAGE_KEY]: DEFAULT_SETTINGS });
  return normalizeSettings(items[STORAGE_KEY]);
};

export const saveSettings = async (api: BrowserApi, settings: DingSettings): Promise<void> => {
  const storage = api.storage.sync ?? api.storage.local;
  await storage.set({ [STORAGE_KEY]: normalizeSettings(settings) });
};
