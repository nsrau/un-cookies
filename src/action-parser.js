export class ActionParser {
  constructor(logger) {
    this.logger = logger ?? { error: () => {} };
  }

  /**
   * Parse JSON action schema into executable actions
   */
  static parseSchema(schema) {
    try {
      // Make sure we have valid JSON
      const actions = typeof schema === "string" ? JSON.parse(schema) : schema;

      if (!Array.isArray(actions)) {
        throw new Error("Schema must be an array of actions");
      }

      return actions;
    } catch (error) {
      this.logger.error("Failed to parse action schema:", error);
      return [];
    }
  }
}
