

import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import { GEMINI_MODEL_TEXT_IMAGE_INPUT } from '../constants';
import { InspectionRecord, AnalysisOutput, NameplateData } from "../types";

let ai: GoogleGenAI | null = null;
let geminiInitializationError: string | null = null;

try {
  // Defensively access process.env to prevent ReferenceError in browser-only environments.
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

  if (!apiKey) {
    throw new Error("Gemini API Key is not configured. AI features will not work. Please ensure the API_KEY environment variable is set.");
  }
  ai = new GoogleGenAI({ apiKey });
} catch (e) {
    if (e instanceof Error) {
        geminiInitializationError = e.message;
    } else {
        geminiInitializationError = "An unknown error occurred during Gemini AI initialization.";
    }
    console.error("Gemini AI Initialization Error:", geminiInitializationError);
}

const getInitializationError = (): AnalysisOutput => ({
  error: geminiInitializationError || "AI Client is not available.",
  rawText: `Initialization failed: ${geminiInitializationError || "AI Client is not available."}`
});
const getInitializationErrorForScanner = (): { data: null, error: string } => ({
  data: null,
  error: geminiInitializationError || "AI Client is not available."
});


export const analyzeNameplateWithGemini = async (imageBase64: string): Promise<{data: NameplateData[] | null, error?: string}> => {
  if (!ai) {
    return getInitializationErrorForScanner();
  }

  const imagePart: Part = {
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

  const textPart: Part = { text: promptText };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT_IMAGE_INPUT,
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    let jsonStr = response.text.trim();
    
    try {
      const parsedData = JSON.parse(jsonStr);
      if (Array.isArray(parsedData)) {
         // Add a unique ID to each row for client-side state management
        const dataWithIds: NameplateData[] = parsedData.map(item => ({...item, id: crypto.randomUUID()}));
        return { data: dataWithIds };
      } else {
        console.warn("AI nameplate response was not in the expected format:", parsedData);
        return { data: null, error: "AI response was not in the expected format. Please try another image or enter data manually." };
      }
    } catch (e) {
      console.error("Failed to parse JSON from nameplate analysis:", e, "Raw text:", jsonStr);
      return { data: null, error: "Failed to parse AI response. The nameplate might be unclear. Please try another image or enter data manually." };
    }

  } catch (error) {
    console.error("Error analyzing nameplate with Gemini:", error);
    if (error instanceof Error) {
      return { data: null, error: `Gemini API Error: ${error.message}` };
    }
    return { data: null, error: "An unknown error occurred while communicating with the AI analysis service." };
  }
};

export const analyzeMeterDisplayWithGemini = async (imageBase64: string): Promise<{data: NameplateData[] | null, error?: string}> => {
  if (!ai) {
    return getInitializationErrorForScanner();
  }

  const imagePart: Part = {
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

  const textPart: Part = { text: promptText };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT_IMAGE_INPUT,
      contents: { parts: [textPart, imagePart] },
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    let jsonStr = response.text.trim();
    
    try {
      const parsedData = JSON.parse(jsonStr);
      if (Array.isArray(parsedData)) {
        const dataWithIds: NameplateData[] = parsedData.map(item => ({...item, id: crypto.randomUUID()}));
        return { data: dataWithIds };
      } else {
        console.warn("AI meter response was not in the expected format:", parsedData);
        return { data: null, error: "AI response was not in the expected format. Please try another image or enter data manually." };
      }
    } catch (e) {
      console.error("Failed to parse JSON from meter analysis:", e, "Raw text:", jsonStr);
      return { data: null, error: "Failed to parse AI response. The meter display might be unclear. Please try another image or enter data manually." };
    }

  } catch (error) {
    console.error("Error analyzing meter with Gemini:", error);
    if (error instanceof Error) {
      return { data: null, error: `Gemini API Error: ${error.message}` };
    }
    return { data: null, error: "An unknown error occurred while communicating with the AI analysis service." };
  }
};


export const analyzeImagesWithGemini = async (
  inspection: InspectionRecord
): Promise<AnalysisOutput> => {
  if (!ai) {
    return getInitializationError();
  }
  if (!inspection.irImageBase64) {
    return { error: "IR Image is required for analysis." };
  }

  const irImagePart: Part = {
    inlineData: { mimeType: 'image/png', data: inspection.irImageBase64 },
  };

  const imagePartsToSend: Part[] = [irImagePart];
  
  let userContext = 'User-Provided Context:\n';
  if (inspection.ambientTemp) userContext += `- Ambient Temperature: ${inspection.ambientTemp}°C\n`;
  if (inspection.measuredCurrent) userContext += `- Measured Current: ${inspection.measuredCurrent} Amps\n`;
  if (inspection.nominalMaxCurrent) userContext += `- Nominal Maximum Current: ${inspection.nominalMaxCurrent} Amps\n`;
  if (inspection.referenceTemp) userContext += `- Reference Temperature: ${inspection.referenceTemp}°C\n`;
  if (inspection.voltage) userContext += `- Voltage: ${inspection.voltage} Volts\n`;
  if (!inspection.dsImageBase64) {
    userContext += `- Note: Digital Still (DS) image was not provided. Base contextual analysis on the IR image only.\n`
  } else {
    const dsImagePart: Part = { inlineData: { mimeType: 'image/png', data: inspection.dsImageBase64 }};
    imagePartsToSend.push(dsImagePart);
  }

  // A more direct prompt works better when a strict response schema is enforced.
  // The prompt should clearly state the task and point to the context and schema.
  const promptText = `You are an expert electrical thermographer. Your task is to analyze the provided infrared (IR) image, digital still (DS) image (if available), and user-provided context to generate a thermographic inspection report. Your response must conform strictly to the provided JSON schema. All temperature values should be in Celsius.

IMPORTANT: When analyzing temperature, you must consider the 'IR Temperature vs Load' relationship. If the user provides load data (e.g., Measured Current and Nominal Maximum Current), use this to assess the severity of any thermal anomaly. A high temperature at low load is more critical than at high load. If possible, calculate the projected temperature at maximum load and include this calculation ('Temperature at Max Load') and other related values in the 'derivedData' array. Use the principle that temperature rise over ambient is proportional to the square of the current (ΔT ∝ I²).
  
${userContext}`;

  const textPart: Part = { text: promptText };
  // Best practice for multimodal prompts is often to provide the text instruction first to set the context for the images.
  const allParts: Part[] = [textPart, ...imagePartsToSend];

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

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT_IMAGE_INPUT,
      contents: { parts: allParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      }
    });
    
    const rawTextOutput = response.text;
    
    try {
      const jsonData = JSON.parse(rawTextOutput);
      return { ...jsonData, rawText: rawTextOutput };
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", e, "Raw text:", rawTextOutput);
      return { 
        error: "Failed to interpret AI response as structured data. Please check the raw output.",
        rawText: rawTextOutput
      };
    }

  } catch (error) {
    console.error("Error analyzing images with Gemini:", error);
    const message = error instanceof Error ? `Gemini API Error: ${error.message}` : "An unknown error occurred while communicating with the AI analysis service.";
    return { error: message };
  }
};