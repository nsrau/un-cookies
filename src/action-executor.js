export class ActionExecutor {
  constructor(logger) {
    this.logger = logger;
    this.elementCount = 0;
    this.cookieCount = 0;
    this.globalStyles = new Map();
    this._initializeStyleSheet();
  }

  async executeActions(context) {
    if (Array.isArray(context)) {
      for (const action of context) {
        await this.executeActions(action);
      }
    } else if (Array.isArray(context.actions)) {
      // Handle domain-specific action groups
      for (const action of context.actions) {
        await this._processAction(action);
      }
    } else {
      await this._processAction(context);
    }

    if (this.elementCount > 0 || this.cookieCount > 0) {
      const count = this.elementCount + this.cookieCount;
      chrome.runtime.sendMessage({
        action: "updateCounter",
        count,
      });

      this.logger.log(
        `Removed ${this.elementCount} elements and ${this.cookieCount} cookies`
      );
    }
  }

  async _processAction(action) {
    try {
      this.logger.log("Processing action:", action);

      // Handle delay if specified
      if (action.delay) {
        await new Promise((resolve) => setTimeout(resolve, action.delay));
      }

      // Execute the main action
      const success = this._executeAction(action);

      // Handle chained actions based on success/failure
      if (success && action.onSuccess) {
        this.logger.log("Executing onSuccess action");
        await this._processAction(action.onSuccess);
      } else if (!success && action.onError) {
        this.logger.log("Executing onError action");
        await this._processAction(action.onError);
      }

      return success;
    } catch (e) {
      this.logger.error(`Error processing action:`, e);
      if (action.onError) {
        await this._processAction(action.onError);
      }
      return false;
    }
  }

  _executeAction(context) {
    if (context.log || context.message) {
      this.logger.log(context.log || context.message);
      return true;
    }

    try {
      switch (context.action) {
        case "click":
          return this._clickElement(context);

        case "reload":
          window.location.reload();

        case "remove":
          return this._removeElement(context);

        case "hide":
          return this._hideElement(context);

        case "style":
          return this._setStyle(context);

        case "delete-cookies":
        case "clear-cookies":
          if (context.target === "*") {
            return this._clearAllCookies();
          } else {
            return this._clearCookie({ name: context.target });
          }

        case "remove-class":
          return this._removeClass(context);

        case "addGlobalStyle":
          return this._addGlobalStyle(context.target, context.styles);

        case "removeGlobalStyle":
          return this._removeGlobalStyle(context.target);

        default:
          this.logger.warn(`Unknown action type: ${context.action}`);
          return false;
      }
    } catch (e) {
      this.logger.error(`Error executing action ${context.action}:`, e);
      return false;
    }
  }

  _initializeStyleSheet() {
    // Create a stylesheet for our dynamic styles
    this.styleSheet = document.createElement("style");
    this.styleSheet.id = "un-cookie-styles";
    document.head.appendChild(this.styleSheet);
  }

  _addGlobalStyle(selector, styles) {
    try {
      // Convert styles object to CSS string
      const cssRules = Object.entries(styles)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(" ");

      const rule = `${selector} { ${cssRules} }`;

      // Add to stylesheet
      if (this.styleSheet.sheet) {
        this.styleSheet.sheet.insertRule(
          rule,
          this.styleSheet.sheet.cssRules.length
        );

        this.globalStyles.set(selector, rule);
        this.logger.log(`Added global style: ${rule}`);
        return true;
      }
    } catch (e) {
      this.logger.error(`Error adding global style for ${selector}:`, e);
      return false;
    }
  }

  _removeGlobalStyle(selector) {
    try {
      if (!this.styleSheet.sheet) return false;

      const rules = this.styleSheet.sheet.cssRules;
      for (let i = 0; i < rules.length; i++) {
        if (rules[i].selectorText === selector) {
          this.styleSheet.sheet.deleteRule(i);
          this.globalStyles.delete(selector);
          this.logger.log(`Removed global style for: ${selector}`);
          return true;
        }
      }
    } catch (e) {
      this.logger.error(`Error removing global style for ${selector}:`, e);
      return false;
    }
  }

  _removeElement(action) {
    const elements = document.querySelectorAll(action.target);
    if (elements.length) {
      elements.forEach((element) => {
        element.remove();
        this.elementCount++;
      });
    }
  }

  _hideElement(action) {
    this._setStyle({
      target: action.target,
      property: "display",
      value: "none",
    });
  }

  _setStyle(action) {
    const elements = document.querySelectorAll(action.target);
    elements.forEach((element) => {
      if (action.property && action.value) {
        element.style[action.property] = action.value;
      } else if (action.styles) {
        // Support for multiple styles
        Object.entries(action.styles).forEach(([prop, value]) => {
          element.style[prop] = value;
        });
      }
    });
  }

  _removeClass(action) {
    const elements = document.querySelectorAll(action.target);
    elements.forEach((element) => {
      element.classList.remove(action.className);
    });
  }

  _clickElement(action) {
    const elements = document.querySelectorAll(action.target);
    if (elements.length > 0) {
      try {
        elements[0].click();
        this.logger.log(`Clicked element: ${action.target}`);
      } catch (e) {
        this.logger.error(`Failed to click element: ${action.target}`, e);
      }
    } else {
      this.logger.warn(`Click target not found: ${action.target}`);
    }
  }

  _clearCookie(action) {
    try {
      const name = action.name;
      this.logger.log("Clearing cookie:", name);

      // Try multiple ways to clear the cookie
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}`;

      const pastDate = new Date(0).toUTCString();
      document.cookie = `${name}=; expires=${pastDate}; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; expires=${pastDate}; path=/`;

      this.cookieCount++;
    } catch (e) {
      this.logger.error("Error clearing cookie:", action.name, e);
    }
  }

  _clearAllCookies() {
    const cookies = document.cookie.split(";");
    this.logger.log(`Attempting to clear ${cookies.length} cookies`);

    cookies.forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        this.cookieCount++;
      }
    });

    // Also send message to background to clear cookies
    chrome.runtime.sendMessage({
      action: "clearAllCookies",
    });
  }
}
