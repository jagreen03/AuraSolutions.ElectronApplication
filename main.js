// Import modules from Electron and Node.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Use the promise-based version for async operations

// This function creates the main browser window.
function createWindow() {
  // Create a new browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      // Security setting to use preload script
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the index.html file into the new window.
  mainWindow.loadFile('index.html');
}

// This event is fired when Electron is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  // Handle the 'analyze-file' event from the renderer process (UI).
  ipcMain.handle('analyze-file', async (event, filePath) => {
    try {
      // Read the content of the file
      const fileContent = await fs.readFile(filePath, 'utf8');

      // Placeholder for your API key
      const apiKey = "AIzaSyAOwsDABoZ-MXaK9GOTgE_NY77UEPSyejY"; // <--- INSERT YOUR API KEY HERE

      if (!apiKey) {
        throw new Error('API Key is missing. Please add your key to main.js.');
      }
      
      const systemPrompt = "Act as an expert financial analyst. Provide a concise, single-paragraph summary of the key findings from this document.";
      const userQuery = `Summarize the key findings from this document:\n\n${fileContent}`;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        const text = candidate.content.parts[0].text;
        
        let sources = [];
        const groundingMetadata = candidate.groundingMetadata;
        if (groundingMetadata && groundingMetadata.groundingAttributions) {
            sources = groundingMetadata.groundingAttributions
                .map(attribution => ({
                    uri: attribution.web?.uri,
                    title: attribution.web?.title,
                }))
                .filter(source => source.uri && source.title);
        }

        return {
            summary: text,
            details: "More details could be added here by performing a different API call or a secondary analysis. For now, this is a placeholder.",
            rawText: fileContent,
            sources: sources
        };

      } else {
        throw new Error("API response was empty or malformed.");
      }

    } catch (error) {
      console.error('Failed to analyze file:', error);
      throw error;
    }
  });

  // On macOS, a new window is often created when the dock icon is clicked
  // and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});