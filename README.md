# UN-Cookie Browser Extension

A Chrome extension for managing cookie consent banners and notifications using configurable JSON schemas.

## Features

- Remove cookie banners and consent popups automatically
- Custom rules using JSON schemas
- Support for remote schemas via GitHub Gists
- Debug mode for troubleshooting
- Counter showing total elements removed
- Domain-specific handling
- Supports both inline and remote rule definitions

## Configuration

Rules can be defined using JSON schemas in two ways:

1. Direct JSON schema:
```json
[
  {
    "domain": "mydomain.com",
    "actions": [{
        "action": "click",
        "target": "[data-role='b_decline']",
        "onSuccess": {
            "action": "remove",
            "target": "#cl-consent"
        }
    }]
  }
]
```

2. Remote schema (GitHub Gist):
```json
{
  "rulesetName": "my_ruleset.json",
  "schema": "https://gist.githubusercontent.com/user/gistid/raw"
}
```

### Actions

Available actions:
- `click`: Click an element
- `remove`: Remove an element
- `hide`: Hide an element
- `style`: Apply custom styles
- `delete-cookies`: Delete cookies
- `remove-class`: Remove CSS class

## Development

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request