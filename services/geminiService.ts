
import { GoogleGenAI, Type } from "@google/genai";
import { SummaryResult, ProcessingOptions } from "../types";

// As per guidelines, API key must be from process.env.API_KEY
// Assume this is configured in the environment where the app is running.
if (!process.env.API_KEY) {
  // This is a developer-facing error. For users, a more graceful message is thrown in the function.
  console.error("API_KEY environment variable not set.");
}

// FIX: Correctly instantiate GoogleGenAI with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });


/**
 * Converts a File or Blob into a GoogleGenAI.Part object for the Gemini API.
 * It reads the file as a base64 encoded string.
 * @param file The audio file (Blob or File) to convert.
 * @returns A promise that resolves to a Part object.
 */
const fileToGenerativePart = async (file: Blob) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // The result includes the data URL prefix (e.g., 'data:audio/webm;base64,').
        // We need to extract just the base64 part.
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read file as a base64 string."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      mimeType: file.type,
      data: base64EncodedData,
    },
  };
};

/**
 * Sends audio data to the Gemini API to generate a transcript and/or summary.
 * @param audioSource The audio data as a Blob or File.
 * @param options An object specifying whether to generate a transcript and/or summary.
 * @returns A promise that resolves to a SummaryResult object.
 */
export const generateSummaryFromAudio = async (audioSource: Blob, options: ProcessingOptions): Promise<SummaryResult> => {
  if (!process.env.API_KEY) {
    throw new Error("AI服務目前無法使用，缺少必要的設定。");
  }

  if (!options.generateSummary && !options.generateTranscript) {
    return { summary: "未選擇處理選項。", transcript: [] };
  }

  // FIX: Use the 'gemini-2.5-flash' model as per the guidelines for multimodal tasks.
  const model = "gemini-2.5-flash";

  const audioPart = await fileToGenerativePart(audioSource);

  // Dynamically build prompt based on options
  const promptTasks: string[] = [];
  if (options.generateTranscript) {
    promptTasks.push(`1.  **逐字稿**：將音訊內容轉換為逐字稿。請盡可能準確，並為每個段落或重要的發言點加上時間戳記（格式為 HH:MM:SS）。如果無法辨識出確切時間，請估算。`);
  }
  if (options.generateSummary) {
    promptTasks.push(`2.  **會議摘要**：根據音訊內容，生成一份詳細的會議摘要。摘要應以 Markdown 格式呈現，並包括：
    *   一個簡潔明瞭的 **標題**。
    *   以點列方式列出會議中討論的 **主要議題**。
    *   總結會議達成的 **結論與行動項目**（如果有的話）。`);
  }

  const prompt = `請根據提供的音訊執行以下任務：
${promptTasks.join('\n\n')}

請嚴格按照指定的 JSON 格式回傳結果。如果某個項目 (例如逐字稿) 未被請求，請在對應的欄位中回傳空值 (例如空陣列 [] 或空字串 "")。`;


  // Dynamically build schema based on options
  const schemaProperties: Record<string, any> = {};
  const requiredProperties: string[] = [];

  if (options.generateTranscript) {
    schemaProperties.transcript = {
        type: Type.ARRAY,
        description: "音訊的逐字稿，包含時間戳記。",
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING, description: "時間戳記 (HH:MM:SS)" },
            text: { type: Type.STRING, description: "該時間點的逐字稿文字。" }
          },
          required: ["timestamp", "text"]
        }
      };
    requiredProperties.push("transcript");
  }
   if (options.generateSummary) {
    schemaProperties.summary = {
        type: Type.STRING,
        description: "Markdown 格式的詳細會議摘要，包含標題、討論要點和結論/行動項目。"
      };
    requiredProperties.push("summary");
  }
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: schemaProperties,
    required: requiredProperties,
  };
  
  try {
    // FIX: Call the generateContent method with the model, multimodal contents, and JSON config.
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [audioPart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    // FIX: Extract text and parse it as JSON, cleaning up potential markdown formatting.
    const jsonString = response.text.trim();
    const cleanedJsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const result = JSON.parse(cleanedJsonString);

    // Normalize the result to ensure it always matches the SummaryResult type.
    const normalizedResult: SummaryResult = {
        transcript: result.transcript || [],
        summary: result.summary || ""
    };

    return normalizedResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
     if (error instanceof Error) {
        if (error.message.includes('SAFETY')) {
            throw new Error("請求因安全設定被封鎖。音訊內容可能包含敏感資訊。");
        }
        if (error.message.includes('400')) { // Bad request, often due to invalid input
            throw new Error("音檔格式無效或已損壞，AI 服務無法處理。");
        }
    }
    throw new Error("呼叫 AI 服務時發生錯誤，請檢查您的網路連線或稍後再試。");
  }
};
