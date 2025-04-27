export class RemoteLoader {
  constructor(logger) {
    this.logger = logger;
    this.cache = new Map();
    this.cacheExpiry = 1000 * 60 * 60; // 1 hour cache expiry
  }

  /**
   * Loads a schema from a URL with caching
   * @param {string} url - URL to load schema from
   * @returns {Promise<Object|Array>} The loaded schema
   */
  async loadFromUrl(url) {
    this.logger.log(`Loading schema from URL: ${url}`);

    try {
      // Check if it's a GitHub Gist URL and convert to raw if needed
      if (url.includes("gist.github.com")) {
        url = this._convertGistUrl(url);
        this.logger.log(`Converted to raw Gist URL: ${url}`);
      }

      // Check cache first
      const cached = this._getFromCache(url);
      if (cached) {
        this.logger.log("Returning cached schema");
        return cached;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
        },
        cache: "no-cache",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
      }

      const text = await response.text();
      this.logger.log("Schema loaded successfully");

      // Cache the response
      this._addToCache(url, text);

      return text;
    } catch (error) {
      this.logger.error("Error loading schema from URL:", error);
      throw error;
    }
  }

  /**
   * Get cached response if valid
   * @param {string} url
   * @returns {string|null}
   */
  _getFromCache(url) {
    const cached = this.cache.get(url);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      // Cache expired
      this.cache.delete(url);
      return null;
    }

    return cached.data;
  }

  /**
   * Add response to cache
   * @param {string} url
   * @param {string} data
   */
  _addToCache(url, data) {
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Converts a GitHub Gist URL to its raw content URL
   * @param {string} gistUrl - The GitHub Gist URL
   * @returns {string} Raw content URL
   */
  _convertGistUrl(gistUrl) {
    // Handle URLs that are already in raw format
    if (gistUrl.includes("raw")) {
      return gistUrl;
    }

    // Extract gist ID from URL - handles different Gist URL formats
    let gistId = null;

    // Format: https://gist.github.com/username/gistId
    const userGistMatch = gistUrl.match(
      /gist\.github\.com\/[^\/]+\/([a-f0-9]+)/i
    );
    if (userGistMatch) {
      gistId = userGistMatch[1];
    }

    // Format: https://gist.github.com/gistId
    const directGistMatch = gistUrl.match(/gist\.github\.com\/([a-f0-9]+)$/i);
    if (!gistId && directGistMatch) {
      gistId = directGistMatch[1];
    }

    if (!gistId) {
      this.logger.warn("Could not extract Gist ID from URL:", gistUrl);
      return gistUrl;
    }

    // Return the raw URL using the extracted Gist ID
    const rawUrl = `https://gist.githubusercontent.com/raw/${gistId}/`;
    this.logger.log(`Converted ${gistUrl} to ${rawUrl}`);
    return rawUrl;
  }
}
