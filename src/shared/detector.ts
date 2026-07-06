export type DetectorSnapshot = {
  now: number;
  text: string;
  isBusy: boolean;
  assistantTurnId?: string;
};

export type DetectorOptions = {
  quietMs: number;
  minimumResponseChars: number;
};

export type DetectorEvent = {
  type: "completed";
  assistantTurnId: string;
};

type RespondingTurn = {
  id: string;
  firstSeenAt: number;
  lastChangedAt: number;
  lastText: string;
  hasMeaningfulText: boolean;
  completed: boolean;
};

const DEFAULT_OPTIONS: DetectorOptions = {
  quietMs: 1800,
  minimumResponseChars: 2,
};

export class ResponseCompletionDetector {
  private readonly options: DetectorOptions;
  private turn: RespondingTurn | null = null;
  private initialized = false;

  constructor(options: Partial<DetectorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  ingest(snapshot: DetectorSnapshot): DetectorEvent[] {
    const id = snapshot.assistantTurnId;

    if (!this.initialized) {
      this.initialized = true;
      if (id && snapshot.isBusy) {
        this.startTurn(snapshot, true);
      }
      return [];
    }

    if (!id) {
      this.turn = null;
      return [];
    }

    if (!this.turn || this.turn.id !== id) {
      this.startTurn(snapshot, false);
      return [];
    }

    const turn = this.turn;
    if (snapshot.text !== turn.lastText) {
      turn.lastText = snapshot.text;
      turn.lastChangedAt = snapshot.now;
      turn.hasMeaningfulText = turn.hasMeaningfulText || snapshot.text.trim().length >= this.options.minimumResponseChars;
      turn.completed = false;
    }

    if (snapshot.isBusy) {
      turn.completed = false;
      return [];
    }

    const quietLongEnough = snapshot.now - turn.lastChangedAt >= this.options.quietMs;
    if (!turn.completed && turn.hasMeaningfulText && quietLongEnough) {
      turn.completed = true;
      return [{ type: "completed", assistantTurnId: turn.id }];
    }

    return [];
  }

  private startTurn(snapshot: DetectorSnapshot, suppressExisting: boolean): void {
    this.turn = {
      id: snapshot.assistantTurnId ?? `turn-${snapshot.now}`,
      firstSeenAt: snapshot.now,
      lastChangedAt: snapshot.now,
      lastText: snapshot.text,
      hasMeaningfulText: !suppressExisting && snapshot.text.trim().length >= this.options.minimumResponseChars,
      completed: false,
    };
  }
}
