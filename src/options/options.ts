import { DingPlayer } from "../content/audio";
import { getBrowserApi } from "../shared/browser";
import { loadSettings, saveSettings, type DingSettings } from "../shared/settings";
import "./styles.css";

const api = getBrowserApi();
const player = new DingPlayer(api);

const enabledInput = document.querySelector<HTMLInputElement>("#enabled");
const volumeInput = document.querySelector<HTMLInputElement>("#volume");
const notificationInput = document.querySelector<HTMLInputElement>("#notificationFallback");
const testButton = document.querySelector<HTMLButtonElement>("#testDing");
const statusElement = document.querySelector<HTMLParagraphElement>("#status");

if (!enabledInput || !volumeInput || !notificationInput || !testButton || !statusElement) {
  throw new Error("Options UI failed to initialize.");
}

let settings: DingSettings | undefined;

const setStatus = (text: string): void => {
  statusElement.textContent = text;
  window.setTimeout(() => {
    if (statusElement.textContent === text) {
      statusElement.textContent = "";
    }
  }, 1800);
};

const render = (): void => {
  if (!settings) {
    return;
  }

  enabledInput.checked = settings.enabled;
  volumeInput.value = String(settings.volume);
  notificationInput.checked = settings.notificationFallback;
};

const persist = async (): Promise<void> => {
  settings = {
    enabled: enabledInput.checked,
    volume: Number(volumeInput.value),
    notificationFallback: notificationInput.checked,
  };
  await saveSettings(api, settings);
  setStatus("Saved");
};

const initialize = async (): Promise<void> => {
  settings = await loadSettings(api);
  render();

  enabledInput.addEventListener("change", () => void persist());
  volumeInput.addEventListener("input", () => void persist());
  notificationInput.addEventListener("change", () => void persist());
  testButton.addEventListener("click", async () => {
    await persist();
    try {
      await player.play(settings?.volume ?? 0.75);
      setStatus("Played");
    } catch {
      setStatus("Audio playback was blocked");
    }
  });
};

void initialize();
