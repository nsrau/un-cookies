function renderHandlers({ list, handlers, emptyList }) {
  list.innerHTML = "";

  if (handlers.length === 0) {
    list.appendChild(emptyList);
    return;
  }

  function handleEdit(e) {
    const index = parseInt(e.target.dataset.id);
    const handler = handlers[index];

    rulesetName.value = handler.rulesetName;
    editor.setValue(handler.schema);

    add.style.display = "none";
    update.style.display = "block";
    cancel.style.display = "block";

    editIndex = index;
  }

  function handleDelete(e) {
    const index = parseInt(e.target.dataset.id);

    if (confirm("Are you sure you want to delete this ruleset?")) {
      handlers.splice(index, 1);

      chrome.storage.sync.set({ customHandlers: handlers }, function () {
        renderHandlers();
        showStatus("Ruleset deleted", "success");
      });
    }
  }

  handlers.forEach((handler, index) => {
    const li = document.createElement("li");

    // Show a preview of the schema
    let schemaPreview;
    if (handler.schema.startsWith("http")) {
      schemaPreview = `<em>Remote schema: ${handler.schema.substring(0, 40)}${
        handler.schema.length > 40 ? "..." : ""
      }</em>`;
    } else {
      try {
        // Parse JSON to extract action property
        const parsedJson = JSON.parse(handler.schema);
        let previewText = "";

        // Handle array of objects or single object
        const jsonItems = Array.isArray(parsedJson) ? parsedJson : [parsedJson];

        // Extract first item's action for preview
        if (jsonItems.length > 0) {
          const firstItem = jsonItems[0];
          const domain = firstItem.domain
            ? `domain: ${firstItem.domain}, `
            : "";
          const action = firstItem.action
            ? `action: ${firstItem.action}, `
            : "";
          const target = firstItem.target ? `target: ${firstItem.target}` : "";

          previewText = `{${domain}${action}${target}}`;

          if (jsonItems.length > 1) {
            previewText += ` + ${jsonItems.length - 1} more`;
          }
        } else {
          previewText = JSON.stringify(parsedJson).substring(0, 50);
        }

        schemaPreview =
          previewText.length > 50
            ? `${previewText.substring(0, 50)}...`
            : previewText;
      } catch (e) {
        schemaPreview =
          handler.schema.substring(0, 50) +
          (handler.schema.length > 50 ? "..." : "");
      }
    }

    li.innerHTML = `
      <div class="handler-info">
        <div class="handler-domain">${handler.rulesetName}</div>
        <div class="handler-code">${schemaPreview}</div>
      </div>
      <div class="handler-actions">
        <button class="edit" data-id="${index}">Edit</button>
        <button class="delete" data-id="${index}">Delete</button>
      </div>
    `;
    list.appendChild(li);

    li.querySelector(".edit").addEventListener("click", handleEdit);
    li.querySelector(".delete").addEventListener("click", handleDelete);
  });
}

function loadHandlers({ list, handlers, emptyList }) {
  chrome.storage.sync.get("customHandlers", function (data) {
    if (data.customHandlers && Array.isArray(data.customHandlers)) {
      handlers = data.customHandlers;
      renderHandlers({ list, handlers, emptyList });
    } else {
      handlers = [];
      renderHandlers({ list, handlers, emptyList });
    }
  });
}

function init({ list, handlers, emptyList }) {
  chrome.storage.sync.get("totalCounter", (data) => {
    if (data.totalCounter) {
      totalCounter = data.totalCounter;
      chrome.action.setBadgeBackgroundColor({ color: "#777777" }); // Gray color

      // Format badge text - show 99+ when over 99
      let badgeText = totalCounter > 99 ? "99+" : totalCounter.toString();
      chrome.action.setBadgeText({ text: badgeText });
    }
  });
  chrome.storage.sync.get("debugMode", (data) => {
    if (data.debugMode === undefined) {
      chrome.storage.sync.set({ debugMode: true });
    }
  });
  chrome.storage.sync.get("customHandlers", (data) => {
    if (!data.customHandlers) {
      chrome.storage.sync.set({
        customHandlers: [
          {
            rulesetName: "un_cookies_list.json",
            schema:
              "https://gist.githubusercontent.com/nsrau/c3a4430e7255223cb2e40844f4f98ca4/raw",
          },
        ],
      });
    }
  });
  loadHandlers({ list, handlers, emptyList });
}

document.addEventListener("DOMContentLoaded", function () {
  const rulesetName = document.getElementById("ruleset-name");
  const add = document.getElementById("add");
  const update = document.getElementById("update");
  const cancel = document.getElementById("cancel");
  const format = document.getElementById("format");
  const useGist = document.getElementById("use-gist");
  const list = document.getElementById("list");
  const emptyList = document.getElementById("empty-list");
  const resetCache = document.getElementById("reset-cache");
  const debugToggle = document.getElementById("debug-toggle");
  const status = document.getElementById("status");
  const resizeHandle = document.getElementById("resize-handle");

  // Initialize CodeMirror
  const editor = CodeMirror(document.getElementById("editor-container"), {
    mode: { name: "javascript", json: true },
    lineNumbers: true,
    theme: "monokai",
    autoCloseBrackets: true,
    matchBrackets: true,
    tabSize: 2,
    gutters: ["CodeMirror-linenumbers"],
    styleActiveLine: true,
  });

  // Default JSON template
  const defaultTemplate = JSON.stringify(
    [
      {
        domain: "*",
        actions: [
          {
            action: "remove",
            target: "#cookie-banner",
          },
        ],
      },
    ],
    null,
    2
  );

  // Set initial content
  editor.setValue(defaultTemplate);

  // Load handlers from storage
  let handlers = [];
  let editIndex = -1;

  // Resizable editor
  let isDragging = false;

  init({ list, handlers, emptyList });

  resizeHandle.addEventListener("mousedown", function (e) {
    isDragging = true;
    e.preventDefault();
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;

    const editorElement = editor.getWrapperElement();
    const newHeight = Math.max(
      100,
      Math.min(400, e.clientY - editorElement.getBoundingClientRect().top)
    );

    editor.setSize(null, newHeight);
  });

  document.addEventListener("mouseup", function () {
    isDragging = false;
  });

  // Load debug setting
  chrome.storage.sync.get("debugMode", function (data) {
    if (data.debugMode !== undefined) {
      debugToggle.checked = data.debugMode;
    }
  });

  // Save debug setting when changed
  debugToggle.addEventListener("change", function () {
    chrome.storage.sync.set({ debugMode: debugToggle.checked });
  });

  // Reset all settings in sync storage
  resetCache.addEventListener("click", function () {
    chrome.storage.sync.clear(function () {
      showStatus("Settings reset", "success");
      init({ list, handlers, emptyList });
    });
  });

  // Format button
  format.addEventListener("click", function () {
    try {
      const input = editor.getValue().trim();
      if (!input) return;

      // Don't format URLs
      if (input.startsWith("http")) return;

      try {
        // Parse and format JSON
        const jsonObj = JSON.parse(input);
        const formatted = JSON.stringify(jsonObj, null, 2);
        editor.setValue(formatted);
        showStatus("JSON formatted", "success");
      } catch (e) {
        showStatus("Invalid JSON: " + e.message, "error");
      }
    } catch (e) {
      showStatus("Error formatting JSON: " + e.message, "error");
    }
  });

  // Use Gist URL
  useGist.addEventListener("click", function () {
    const currentValue = editor.getValue().trim();

    if (currentValue.startsWith("http")) {
      // Already has a URL, do nothing
      return;
    }

    const gistUrl = prompt("Enter Gist URL or raw content URL:");
    if (gistUrl && gistUrl.trim()) {
      editor.setValue(gistUrl.trim());
      showStatus("Gist URL set. Add ruleset to use it.", "info");
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.opacity = "1";

    // Hide after 3 seconds
    setTimeout(() => {
      status.style.opacity = "0";
    }, 3000);
  }

  add.addEventListener("click", () => {
    const rulesetNameValue = rulesetName.value.trim();
    const schema = editor.getValue().trim();

    if (!rulesetNameValue || !schema) {
      showStatus("Please fill all fields", "error");
      return;
    }

    try {
      // Validate the JSON if it's not a URL
      if (!schema.startsWith("http")) {
        JSON.parse(schema);
      }

      handlers.push({
        rulesetName: rulesetNameValue,
        schema,
      });

      chrome.storage.sync.set({ customHandlers: handlers }, () => {
        rulesetName.value = "";
        editor.setValue(defaultTemplate);
        renderHandlers();
        showStatus("Ruleset added", "success");
      });
    } catch (e) {
      showStatus("Invalid JSON: " + e.message, "error");
    }
  });

  update.addEventListener("click", () => {
    const rulesetNameValue = rulesetName.value.trim();
    const schema = editor.getValue().trim();

    if (!rulesetNameValue || !schema) {
      showStatus("Please fill all fields", "error");
      return;
    }

    try {
      // Validate the JSON if it's not a URL
      if (!schema.startsWith("http")) {
        JSON.parse(schema);
      }

      handlers[editIndex] = {
        rulesetName: rulesetNameValue,
        schema,
      };

      chrome.storage.sync.set({ customHandlers: handlers }, () => {
        rulesetName.value = "";
        editor.setValue(defaultTemplate);
        add.style.display = "block";
        update.style.display = "none";
        cancel.style.display = "none";
        editIndex = -1;
        renderHandlers();
        showStatus("Ruleset updated", "success");
      });
    } catch (e) {
      showStatus("Invalid JSON: " + e.message, "error");
    }
  });

  cancel.addEventListener("click", () => {
    rulesetName.value = "";
    editor.setValue(defaultTemplate);
    add.style.display = "block";
    update.style.display = "none";
    cancel.style.display = "none";
    editIndex = -1;
  });
});
