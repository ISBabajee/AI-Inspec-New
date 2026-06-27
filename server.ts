import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

function loadEnvFiles() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          
          if (trimmed.includes("=")) {
            const index = trimmed.indexOf("=");
            const key = trimmed.substring(0, index).trim();
            let val = trimmed.substring(index + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          } else {
            // No '=' sign: the entire file might just be the raw API key (User's case!)
            if (trimmed.length > 20 && !trimmed.includes(" ")) {
              if (!process.env.GEMINI_API_KEY) {
                process.env.GEMINI_API_KEY = trimmed;
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error reading env file ${file}:`, err);
      }
    }
  }
}

function getAiClient(req?: express.Request) {
  loadEnvFiles();
  let apiKey = req?.headers["x-gemini-api-key"] as string | undefined;

  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  }

  if (!apiKey) {
    throw new Error("Gemini API Key is not configured. Please supply an API Key in the Settings menu or configure GEMINI_API_KEY in the server environment.");
  }
  return {
    ai: new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    }),
    apiKey
  };
}

async function generateContentWithRetry(
  ai: any,
  params: {
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let retries = 2;
    while (retries >= 0) {
      try {
        console.log(`[Gemini API] Attempting model: ${model} (${retries} retries left)`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient = errMsg.includes("503") || 
                            errMsg.includes("Service Unavailable") || 
                            errMsg.includes("UNAVAILABLE") || 
                            errMsg.includes("429") || 
                            errMsg.includes("ResourceExhausted") || 
                            errMsg.includes("high demand") || 
                            errMsg.includes("Overloaded") ||
                            errMsg.includes("500") ||
                            err?.status === 503 ||
                            err?.status === 429;
        
        console.warn(`[Gemini API] Warning using model ${model}: ${errMsg}. Transient: ${isTransient}`);
        
        if (isTransient && retries > 0) {
          const delay = (3 - retries) * 1000;
          console.log(`[Gemini API] Transient error detected. Waiting ${delay}ms before retrying ${model}...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          retries--;
        } else {
          console.log(`[Gemini API] Switching fallback from model ${model} to next available...`);
          break;
        }
      }
    }
  }

  throw lastError || new Error("All fallback models failed to respond.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser limit increase for base64 images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/gemini/analyze-nameplate", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64 data" });
      }

      const { ai, apiKey } = getAiClient(req);

      const imagePart = {
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64,
        },
      };
      
      const promptText = `You are an expert OCR system specialized in reading industrial equipment nameplates. Your task is to analyze the provided image and extract all identifiable key-value pairs.

Your response MUST be a single, valid JSON array of objects. Do not wrap the JSON in markdown fences like \`\`\`json.
Each object in the array represents a single piece of data from the nameplate and must have two string keys: "parameter" and "value".

- "parameter": The label or description of the data point (e.g., "VOLTS", "S/N", "RPM").
- "value": The corresponding value for that parameter (e.g., "460", "A9Z-8274", "1750").

Example of a valid response:
[
  { "parameter": "MODEL", "value": "5K254SL321" },
  { "parameter": "VOLTS", "value": "460" },
  { "parameter": "HP", "value": "50" },
  { "parameter": "RPM", "value": "1750" },
  { "parameter": "FRAME", "value": "254T" },
  { "parameter": "S/N", "value": "A9Z-8274" }
]

Guidelines:
- If you cannot identify a clear label for a value, use a descriptive placeholder for the "parameter", such as "Identifier" or "Rating".
- Be as accurate as possible.
- Do NOT include any explanations, introductory text, or concluding remarks in your response. The output must be ONLY the JSON array.`;

      const response = await generateContentWithRetry(ai, {
        contents: { parts: [{ text: promptText }, imagePart] },
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const jsonStr = response.text.trim();
      const parsedData = JSON.parse(jsonStr);
      res.json({ data: parsedData });
    } catch (error: any) {
      console.error("Server Error in analyze-nameplate:", error);
      res.status(500).json({ error: error?.message || "An unknown error occurred during server nameplate analysis." });
    }
  });

  app.post("/api/gemini/analyze-meter", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64 data" });
      }

      const { ai, apiKey } = getAiClient(req);

      const imagePart = {
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64,
        },
      };
      
      const promptText = `You are an expert OCR system for reading various electrical meter displays, including digital LCDs and analog dials. Your task is to analyze the provided image of an electrical panel meter and extract all readings.

Your response MUST be a single, valid JSON array of objects. Do not wrap the JSON in markdown fences.
Each object in the array represents a single reading from the meter and must have two string keys: "parameter" and "value".

- "parameter": The label for the reading, including its phase or type if identifiable (e.g., "Voltage L1-N", "Current L2", "Frequency", "Total kWh").
- "value": The corresponding numerical value and its unit (e.g., "480.5 V", "25.7 A", "60.01 Hz", "15033.5 kWh").

Example of a valid response for a digital meter:
[
  { "parameter": "Voltage L1-N", "value": "230.5 V" },
  { "parameter": "Current L1", "value": "15.2 A" },
  { "parameter": "Frequency", "value": "50.01 Hz" },
  { "parameter": "Power Factor", "value": "0.98" }
]

Example of a valid response for an analog meter:
[
  { "parameter": "Line Voltage", "value": "~480 V" }
]

Guidelines:
- For digital meters, capture the exact numbers and units displayed.
- For analog meters, estimate the value indicated by the needle and specify the unit shown on the dial. Use a tilde (~) to indicate an estimated value.
- If a label is not clear, use a descriptive name like "Reading 1" for the parameter.
- Be as accurate as possible.
- If the image is unreadable or not a meter, return an empty array.
- Do NOT include any explanations, introductory text, or concluding remarks. Your output must be ONLY the JSON array.`;

      const response = await generateContentWithRetry(ai, {
        contents: { parts: [{ text: promptText }, imagePart] },
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const jsonStr = response.text.trim();
      const parsedData = JSON.parse(jsonStr);
      res.json({ data: parsedData });
    } catch (error: any) {
      console.error("Server Error in analyze-meter:", error);
      res.status(500).json({ error: error?.message || "An unknown error occurred during server meter analysis." });
    }
  });

  app.post("/api/gemini/analyze-images", async (req, res) => {
    try {
      const { inspection } = req.body;
      if (!inspection || !inspection.irImageBase64) {
        return res.status(400).json({ error: "Missing inspection or IR Image data" });
      }

      const { ai, apiKey } = getAiClient(req);

      const irImagePart = {
        inlineData: { mimeType: 'image/png', data: inspection.irImageBase64 },
      };

      const imagePartsToSend: any[] = [irImagePart];
      
      let userContext = 'User-Provided Context:\n';
      if (inspection.ambientTemp) userContext += `- Ambient Temperature: ${inspection.ambientTemp}°C\n`;
      if (inspection.measuredCurrent) userContext += `- Measured Current: ${inspection.measuredCurrent} Amps\n`;
      if (inspection.nominalMaxCurrent) userContext += `- Nominal Maximum Current: ${inspection.nominalMaxCurrent} Amps\n`;
      if (inspection.referenceTemp) userContext += `- Reference Temperature: ${inspection.referenceTemp}°C\n`;
      if (inspection.voltage) userContext += `- Voltage: ${inspection.voltage} Volts\n`;
      if (!inspection.dsImageBase64) {
        userContext += `- Note: Digital Still (DS) image was not provided. Base contextual analysis on the IR image only.\n`
      } else {
        const dsImagePart = { inlineData: { mimeType: 'image/png', data: inspection.dsImageBase64 }};
        imagePartsToSend.push(dsImagePart);
      }

      const promptText = `You are an expert electrical thermographer. Your task is to analyze the provided infrared (IR) image, digital still (DS) image (if available), and user-provided context to generate a thermographic inspection report. Your response must conform strictly to the provided JSON schema. All temperature values should be in Celsius.

IMPORTANT: When analyzing temperature, you must consider the 'IR Temperature vs Load' relationship. If the user provides load data (e.g., Measured Current and Nominal Maximum Current), use this to assess the severity of any thermal anomaly. A high temperature at low load is more critical than at high load. If possible, calculate the projected temperature at maximum load and include this calculation ('Temperature at Max Load') and other related values in the 'derivedData' array. Use the principle that temperature rise over ambient is proportional to the square of the current (ΔT ∝ I²).
  
${userContext}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          faultItemDescription: { type: Type.STRING, description: "A concise description of the fault, like 'CB1FD-L2'."},
          problemItem: { type: Type.STRING, description: "The component with the problem, e.g., 'CONTACTORS'." },
          problemType: { type: Type.STRING, description: "The type or rating of the item, e.g., '100A'." },
          problemManufacturer: { type: Type.STRING, description: "The manufacturer, e.g., 'MERLIN GERIN'." },
          problemAnomaly: { type: Type.STRING, description: "The observed anomaly, e.g., 'INDICATED HIGHER TEMPERATURE THAN EXPECTED'." },
          problemRootCause: { type: Type.STRING, description: "The suspected root cause, e.g., 'SUSPECTED LOOSE, DETERIORATED OR INADEQUATE CONNECTION'." },
          problemRemedial: { type: Type.STRING, description: "The recommended remedial action, e.g., 'CHECK, CLEAN & RE-MAKE CONNECTION TO PRESCRIBED STANDARD'." },
          derivedData: {
            type: Type.ARRAY,
            description: "An array of all key data points from the IR image and subsequent calculations. Extract everything visible from the image (scale, spot points (Sp), areas/boxes (Bx), delta T, etc.) AND include all calculated values like 'Temperature Load Corrected', 'Excess of Reference Temp', and 'Max Safe Load to Apply'.",
            items: {
              type: Type.OBJECT,
              properties: {
                parameter: { type: Type.STRING, description: "The name of the measurement or data point (e.g., 'Max Temperature', 'Sp1', 'Temperature Load Corrected')." },
                value: { type: Type.STRING, description: "The value of the measurement, including units (e.g., '105.7°C', '95.1 Amps')." }
              },
              required: ['parameter', 'value']
            }
          },
          findings: {
            type: Type.ARRAY,
            description: "A list of observed findings, their details, priority, and recommended actions.",
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "A category for the finding, e.g., 'Connection Issues', 'Component Failure'." },
                finding: { type: Type.STRING, description: "The specific component or observation, e.g., 'Main Breaker L2 Lug'." },
                details: { type: Type.STRING, description: "Detailed observation about the finding, e.g., 'Shows signs of overheating compared to other phases'." },
                priority: { type: Type.STRING, description: "Priority level: 'High', 'Medium', or 'Low'." },
                recommendation: { type: Type.STRING, description: "Recommended action, e.g., 'Investigate for loose connection and re-torque'." }
              }
            }
          }
        }
      };

      const response = await generateContentWithRetry(ai, {
        contents: { parts: [{ text: promptText }, ...imagePartsToSend] },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.2,
        }
      });
      
      const rawTextOutput = response.text;
      const jsonData = JSON.parse(rawTextOutput);
      res.json({ ...jsonData, rawText: rawTextOutput });
    } catch (error: any) {
      console.error("Server Error in analyze-images:", error);
      res.status(500).json({ error: error?.message || "An unknown error occurred during server image analysis." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
