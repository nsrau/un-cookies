(async function () {
  // Import modules
  const srcLogger = chrome.runtime.getURL("src/logger.js");
  const srcParser = chrome.runtime.getURL("src/action-parser.js");
  const srcExecutor = chrome.runtime.getURL("src/action-executor.js");
  const srcRemoteLoader = chrome.runtime.getURL("src/remote-loader.js");

  const loggerModule = await import(srcLogger);
  const { ActionParser } = await import(srcParser);
  const { ActionExecutor } = await import(srcExecutor);
  const { RemoteLoader } = await import(srcRemoteLoader);

  const { Logger } = loggerModule;

  // Initialize components
  Logger.init();
  const executor = new ActionExecutor(Logger);
  const remoteLoader = new RemoteLoader(Logger);

  // Function to run both built-in and custom handlers
  async function runAllHandlers() {
    // Then check for custom handlers
    await runCustomHandlers();
  }

  // Function to run custom handlers from storage
  async function runCustomHandlers() {
    try {
      const currentDomain = window.location.hostname;
      const data = await chrome.storage.sync.get("customHandlers");

      if (!data.customHandlers || !Array.isArray(data.customHandlers)) {
        Logger.warn("No custom handlers found in storage.");
        return;
      }

      Logger.log(
        `Found ${data.customHandlers.length} custom handlers, checking matches...`
      );

      // Execute each handler - both global and domain-specific ones
      for (const handler of data.customHandlers) {
        try {
          let schema = handler.schema;

          // Handle remote schemas (gists, etc.)
          if (typeof schema === "string" && schema.trim().startsWith("http")) {
            try {
              schema = await remoteLoader.loadFromUrl(schema.trim());
              Logger.log(
                `Remote schema loaded successfully for ${handler.rulesetName}`
              );
            } catch (e) {
              Logger.error(
                `Failed to load remote schema for handler ${handler.rulesetName}:`,
                e
              );
              continue;
            }
          }

          // Parse and execute the schema
          const parsedSchema = ActionParser.parseSchema(schema);

          if (!parsedSchema) {
            Logger.warn(`Invalid schema in handler: ${handler.rulesetName}`);
            continue;
          }

          // Process the schema based on its structure
          if (Array.isArray(parsedSchema)) {
            // Check if it's a direct action array or array of domain objects
            const hasDomainObjects = parsedSchema.some((item) => item.domain);

            if (hasDomainObjects) {
              // Find actions for current domain
              const domainActions = parsedSchema.filter((item) => {
                return (
                  item.domain === currentDomain ||
                  item.domain === currentDomain.split(".").slice(-2).join(".")
                );
              });

              if (domainActions.length) {
                Logger.log(
                  `Executing domain-specific actions for ${currentDomain} from ${handler.rulesetName}`
                );
                executor.executeActions(domainActions);
              }
            } else {
              // Global actions (apply to all sites)
              if (
                handler.rulesetName === "*" ||
                currentDomain === handler.rulesetName ||
                currentDomain.endsWith("." + handler.rulesetName)
              ) {
                Logger.log(
                  `Executing global actions from ${handler.rulesetName}`
                );
                executor.executeActions(parsedSchema);
              }
            }
          } else if (typeof parsedSchema === "object") {
            // It's an object with domain keys
            const baseDomain = currentDomain.split(".").slice(-2).join(".");

            if (parsedSchema[currentDomain]) {
              Logger.log(
                `Executing actions for exact domain ${currentDomain} from ${handler.rulesetName}`
              );
              executor.executeActions(parsedSchema[currentDomain]);
            } else if (parsedSchema[baseDomain]) {
              Logger.log(
                `Executing actions for base domain ${baseDomain} from ${handler.rulesetName}`
              );
              executor.executeActions(parsedSchema[baseDomain]);
            }
          }
        } catch (e) {
          Logger.error(
            `Error executing handler for ${handler.rulesetName}:`,
            e
          );
        }
      }
    } catch (e) {
      Logger.error("Failed to run custom handlers:", e);
    }
  }

  // Run handlers on page load
  await runAllHandlers();

  // Setup mutation observer to handle dynamically added elements
  const observer = new MutationObserver(async () => {
    await runAllHandlers();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
