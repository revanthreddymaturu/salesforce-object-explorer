# Salesforce Object Explorer

![Salesforce Object Explorer Logo](icon.png)

A Visual Studio Code extension to explore Salesforce objects, view metadata, and execute SOQL queries directly from your editor.

## Overview

The **Salesforce Object Explorer** simplifies working with Salesforce by integrating object exploration and querying into VS Code. Whether you're a developer debugging Apex or an admin analyzing data, this extension provides a lightweight, intuitive interface to interact with your Salesforce org.

### Key Features

- **Object Selection**: Browse and select Salesforce objects from a sidebar tree view.
- **Metadata Inspection**: View fields, record types, and page layouts for any object.
- **SOQL Query Builder**: Build simple SOQL queries with a UI or write custom queries manually.
- **Query Results**: Display query results in a readable format within VS Code.
- **Webview Interface**: Interactive sidebar powered by a clean UI for a seamless experience.

## What It Does

This extension connects to your Salesforce org via the JSForce library, retrieves metadata, and lets you:

- Explore object structures without leaving VS Code.
- Run ad-hoc SOQL queries to fetch data.
- Debug or prototype queries before using them in Apex or scripts.

## Installation (Development Setup)

To set up the extension locally for development or testing:

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/)
- [Visual Studio Code](https://code.visualstudio.com/)
- A Salesforce org with API access

### Steps

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/revanthreddymaturu/salesforce-object-explorer.git
   cd salesforce-object-explorer
   ```

2. **Install the required dependencies**:

   ```bash
   npm install
   ```

3. **Compile the Extension**:
   Compile the extension using Webpack:

   ```bash
   npm run compile
   ```

   This will bundle TypeScript code into the final extension file located in `out/extension.js`.

4. **Launch the Extension**:
   Open the project in **VS Code**.

   Press `F5` to start debugging. This will open a new VS Code window with the extension loaded.

5. **Connect to Salesforce**:
   Authenticate with your Salesforce org.

   Configure your Salesforce credentials (e.g., username, password, and security token) either through the extension’s settings or via prompt.

### Usage

1. Open the **Explorer** view in **VS Code**.

2. Navigate to **Salesforce Explorer** under the tree view.

3. Select an object to view its metadata or run a SOQL query.

   Example query:

   ```soql
   SELECT Id, Name, CreatedBy.Name, (SELECT Id FROM Opportunities) FROM Account LIMIT 10
   ```
## Demo Video

Here’s a quick demo of the extension in action:

[Watch the demo on Loom](https://www.loom.com/embed/9440531cce0e49e3a199ddf0381b1e66?sid=8929372c-d904-4293-8fdc-6d7655c08040)

## Roadmap

- **Enhanced Query Builder**: Improve the query builder to better handle relationship fields.
- **Export Query Results**: Add functionality to export SOQL query results to CSV/JSON formats.
- **Refresh Button for Metadata**: Add a refresh button to retrieve updated metadata from Salesforce.
- **Nested Subquery Display**: Show nested subqueries in tables for better readability.

## Contributing

We welcome contributions! Here's how to get involved:

1. **Fork the repository**.

2. **Create a new branch**:

   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make your changes** and test them locally with:

   ```bash
   npm run compile
   ```

4. **Commit your changes**:

   ```bash
   git commit -m "Add your message"
   ```

5. **Push your changes**:

   ```bash
   git push origin feature/your-feature
   ```

6. **Open a pull request**.

## License

This extension is licensed under the **MIT License**.

## Acknowledgments

- Inspired by Salesforce Developer Tools.

## Questions?

Feel free to open an issue.

---

**Copyright (c) 2025 none!!**
