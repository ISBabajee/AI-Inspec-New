

import { InspectionRecord, AnalysisOutput, NameplateData } from "../types";

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = localStorage.getItem("user_gemini_api_key");
  if (key) {
    headers["x-gemini-api-key"] = key.trim();
  }
  return headers;
};

export const analyzeNameplateWithGemini = async (imageBase64: string): Promise<{data: NameplateData[] | null, error?: string}> => {
  try {
    const response = await fetch("/api/gemini/analyze-nameplate", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ imageBase64 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const { data } = await response.json();
    if (Array.isArray(data)) {
      const dataWithIds: NameplateData[] = data.map(item => ({
        ...item,
        id: crypto.randomUUID()
      }));
      return { data: dataWithIds };
    } else {
      return { data: null, error: "AI response was not in the expected format. Please try another image or enter data manually." };
    }
  } catch (error: any) {
    console.error("Error in analyzeNameplateWithGemini client call:", error);
    return { data: null, error: error?.message || "An unknown error occurred while communicating with the AI service." };
  }
};

export const analyzeMeterDisplayWithGemini = async (imageBase64: string): Promise<{data: NameplateData[] | null, error?: string}> => {
  try {
    const response = await fetch("/api/gemini/analyze-meter", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ imageBase64 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const { data } = await response.json();
    if (Array.isArray(data)) {
      const dataWithIds: NameplateData[] = data.map(item => ({
        ...item,
        id: crypto.randomUUID()
      }));
      return { data: dataWithIds };
    } else {
      return { data: null, error: "AI response was not in the expected format. Please try another image or enter data manually." };
    }
  } catch (error: any) {
    console.error("Error in analyzeMeterDisplayWithGemini client call:", error);
    return { data: null, error: error?.message || "An unknown error occurred while communicating with the AI service." };
  }
};

export const analyzeImagesWithGemini = async (
  inspection: InspectionRecord
): Promise<AnalysisOutput> => {
  if (!inspection.irImageBase64) {
    return { error: "IR Image is required for analysis." };
  }

  try {
    const response = await fetch("/api/gemini/analyze-images", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ inspection }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error in analyzeImagesWithGemini client call:", error);
    return { error: error?.message || "An unknown error occurred while communicating with the AI service." };
  }
};