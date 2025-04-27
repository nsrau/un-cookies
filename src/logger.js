export class Logger {
  static enabled = false;
  static prefix = "🍪 UN-COOKIE:";

  static init() {
    chrome.storage.sync.get("debugMode", (data) => {
      this.enabled = data.debugMode === true;
      if (this.enabled) {
        this.log("Debug logging initialized");
      }
    });

    // Listen for changes to debug setting
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.debugMode) {
        this.enabled = changes.debugMode.newValue === true;
        window["unCookieLogger"] = this.enabled ? this : undefined;
      }
    });
  }

  static log(...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix}`,
      "background: #0B8C4D; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold;",
      ...args
    );
  }

  static warn(...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix}`,
      "background: #FFC107; color: black; padding: 2px 4px; border-radius: 3px; font-weight: bold;",
      ...args
    );
  }

  static error(...args) {
    if (!this.enabled) return;
    console.log(
      `%c${this.prefix}`,
      "background: #F44336; color: white; padding: 2px 4px; border-radius: 3px; font-weight: bold;",
      ...args
    );
  }

  static setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this.log("Debug logging enabled");
    }
  }
}
