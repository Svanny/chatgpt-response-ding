import type { BrowserApi } from "../shared/browser";

export class DingPlayer {
  private readonly api: BrowserApi;
  private audio: HTMLAudioElement | null = null;

  constructor(api: BrowserApi) {
    this.api = api;
  }

  async play(volume: number): Promise<void> {
    const audio = this.audio ?? new Audio(this.api.runtime.getURL("audio/ding.wav"));
    this.audio = audio;
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.currentTime = 0;
    await audio.play();
  }
}
