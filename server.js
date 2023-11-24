// Extraction Document Code
const express = require('express');
const multer = require('multer');
const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');


const app = express();
const PORT = 3000;

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const endpoint = 'https://goodspacedocumentintelligence.cognitiveservices.azure.com/';
const apiKey = 'a2d51a7da84f4cfda50281cf058477f7';
const modelId = 'prebuilt-read';

const formRecognizerClient = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

// Endpoint to handle document extraction
app.post('/api/extract', upload.single('file'), async (req, res) => {
  try {
    // Perform document analysis using Azure Form Recognizer
    const poller = await formRecognizerClient.beginAnalyzeDocument(modelId, req.file.buffer, {
      onProgress: ({ status }) => {
        console.log(`Analysis status: ${status}`);
      },
    });

    // Wait for the analysis to complete
    const { documents, pages, tables } = await poller.pollUntilDone();

    // Transform the extracted information into a structured JSON response
    const jsonResponse = {
      documents,
      pages: pages.map((page) => ({
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        angle: page.angle,
        lines: page.lines.map((line) => {
          const lineObject = {
            content: line.content,
          };

          // Check if line.words is an array before mapping
          if (Array.isArray(line.words)) {
            lineObject.words = line.words.map((word) => ({ content: word.content }));
          } else {
            console.log('No words detected in this line.');
          }

          return lineObject;
        }),
      })),
      tables,
    };

    // Send the JSON response
    res.json(jsonResponse);
  } catch (error) {
    console.error('Error analyzing document:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
