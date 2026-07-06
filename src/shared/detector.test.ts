import { ResponseCompletionDetector } from "./detector";

const detector = () => new ResponseCompletionDetector({ quietMs: 1000, minimumResponseChars: 1 });

describe("ResponseCompletionDetector", () => {
  it("dings once after a normal streamed answer becomes quiet", () => {
    const subject = detector();

    expect(subject.ingest({ now: 0, text: "", isBusy: false })).toEqual([]);
    expect(subject.ingest({ now: 100, text: "Hel", isBusy: true, assistantTurnId: "a1" })).toEqual([]);
    expect(subject.ingest({ now: 400, text: "Hello", isBusy: true, assistantTurnId: "a1" })).toEqual([]);
    expect(subject.ingest({ now: 800, text: "Hello", isBusy: false, assistantTurnId: "a1" })).toEqual([]);
    expect(subject.ingest({ now: 1400, text: "Hello", isBusy: false, assistantTurnId: "a1" })).toEqual([
      { type: "completed", assistantTurnId: "a1" },
    ]);
    expect(subject.ingest({ now: 2400, text: "Hello", isBusy: false, assistantTurnId: "a1" })).toEqual([]);
  });

  it("does not ding early during a long thinking pause", () => {
    const subject = detector();

    expect(subject.ingest({ now: 0, text: "", isBusy: false })).toEqual([]);
    expect(subject.ingest({ now: 100, text: "Thinking", isBusy: true, assistantTurnId: "a1" })).toEqual([]);
    expect(subject.ingest({ now: 5000, text: "Thinking", isBusy: true, assistantTurnId: "a1" })).toEqual([]);
    expect(subject.ingest({ now: 5200, text: "Final answer", isBusy: true, assistantTurnId: "a1" })).toEqual([]);
    expect(subject.ingest({ now: 6500, text: "Final answer", isBusy: false, assistantTurnId: "a1" })).toEqual([
      { type: "completed", assistantTurnId: "a1" },
    ]);
  });

  it("dings once per assistant turn", () => {
    const subject = detector();

    subject.ingest({ now: 0, text: "", isBusy: false });
    subject.ingest({ now: 100, text: "One", isBusy: true, assistantTurnId: "a1" });
    expect(subject.ingest({ now: 1200, text: "One", isBusy: false, assistantTurnId: "a1" })).toEqual([
      { type: "completed", assistantTurnId: "a1" },
    ]);

    subject.ingest({ now: 1300, text: "Two", isBusy: true, assistantTurnId: "a2" });
    expect(subject.ingest({ now: 2400, text: "Two", isBusy: false, assistantTurnId: "a2" })).toEqual([
      { type: "completed", assistantTurnId: "a2" },
    ]);
  });

  it("does not ding for already-complete history on initial load", () => {
    const subject = detector();

    expect(subject.ingest({ now: 0, text: "Old response", isBusy: false, assistantTurnId: "a1" })).toEqual([]);
    expect(subject.ingest({ now: 2000, text: "Old response", isBusy: false, assistantTurnId: "a1" })).toEqual([]);
  });

  it("treats regenerate or continue as a new active turn", () => {
    const subject = detector();

    subject.ingest({ now: 0, text: "", isBusy: false });
    subject.ingest({ now: 100, text: "Old", isBusy: true, assistantTurnId: "a1" });
    subject.ingest({ now: 1200, text: "Old", isBusy: false, assistantTurnId: "a1" });

    expect(subject.ingest({ now: 2000, text: "New", isBusy: true, assistantTurnId: "a1-regenerated" })).toEqual([]);
    expect(subject.ingest({ now: 3100, text: "New", isBusy: false, assistantTurnId: "a1-regenerated" })).toEqual([
      { type: "completed", assistantTurnId: "a1-regenerated" },
    ]);
  });

  it("requires a later quiet-window check after the busy control disappears", () => {
    const subject = detector();

    subject.ingest({ now: 0, text: "", isBusy: false });
    subject.ingest({ now: 100, text: "Draft", isBusy: true, assistantTurnId: "a1" });
    subject.ingest({ now: 600, text: "Final response text.", isBusy: true, assistantTurnId: "a1" });

    expect(subject.ingest({ now: 1100, text: "Final response text.", isBusy: false, assistantTurnId: "a1" })).toEqual(
      [],
    );
    expect(subject.ingest({ now: 1700, text: "Final response text.", isBusy: false, assistantTurnId: "a1" })).toEqual([
      { type: "completed", assistantTurnId: "a1" },
    ]);
  });
});
