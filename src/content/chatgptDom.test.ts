import { readChatGptSnapshot } from "./chatgptDom";

const setBody = (html: string): void => {
  document.body.innerHTML = html;
};

describe("readChatGptSnapshot", () => {
  it("does not treat the composer voice button as a busy response", () => {
    setBody(`
      <main>
        <article data-message-id="a1">
          <div data-message-author-role="assistant">Done</div>
        </article>
        <button data-testid="composer-speech-button">Voice</button>
      </main>
    `);

    expect(readChatGptSnapshot()).toEqual({
      assistantTurnId: "a1",
      isBusy: false,
      text: "Done",
    });
  });

  it("treats a stop control as a busy response", () => {
    setBody(`
      <main>
        <article data-message-id="a1">
          <div data-message-author-role="assistant">Streaming</div>
        </article>
        <button data-testid="stop-button">Stop</button>
      </main>
    `);

    expect(readChatGptSnapshot()).toEqual({
      assistantTurnId: "a1",
      isBusy: true,
      text: "Streaming",
    });
  });

  it("limits thinking text detection to live status regions", () => {
    setBody(`
      <main>
        <article data-message-id="a1">
          <div data-message-author-role="assistant">Here is my thinking about the problem.</div>
        </article>
      </main>
    `);

    expect(readChatGptSnapshot().isBusy).toBe(false);

    setBody(`
      <main>
        <article data-message-id="a1">
          <div data-message-author-role="assistant">Working on it</div>
        </article>
        <div role="status">Thinking</div>
      </main>
    `);

    expect(readChatGptSnapshot().isBusy).toBe(true);
  });
});
