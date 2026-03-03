---
description: How to use the Stitch MCP server and apply the generated design directly to the project
---

## Stitch Design Workflow

Use this workflow whenever generating UI designs with the Stitch MCP server.

### Step 1: Create a Stitch project
Use `mcp_StitchMCP_create_project` with a descriptive title.

### Step 2: Generate the screen
Use `mcp_StitchMCP_generate_screen_from_text` or `mcp_StitchMCP_generate_variants` with a detailed design prompt.

### Step 3: Get the download URL
From the tool output, extract the `htmlCode.downloadUrl` field from each generated screen. It looks like:
```
https://contribution.usercontent.google.com/download?c=...
```

### Step 4: Download the HTML directly using PowerShell
// turbo
Run this command to save the raw HTML file to disk (DO NOT use read_url_content — it strips the HTML into plain text):

```powershell
Invoke-WebRequest -Uri "<stitch_download_url>" -OutFile "stitch_design.html"
```

### Step 5: Read and apply the design
Use `view_file` to read `stitch_design.html`, then extract the CSS and HTML structure and apply it to the project files (e.g. `style.css`, `index.html`).

### Step 6: Clean up
Delete the temporary `stitch_design.html` file after applying the design.

---

> **IMPORTANT:** Never use `read_url_content` to fetch Stitch download URLs — it converts HTML to markdown and loses all CSS/layout code. Always use `Invoke-WebRequest` (PowerShell) or `curl` to download the raw file.
