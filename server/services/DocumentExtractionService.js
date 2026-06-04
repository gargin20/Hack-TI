import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class DocumentExtractionService {
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async extractTextFromBuffer(buffer, mimeType) {
    try {
      if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.endsWith('csv') || mimeType.includes('csv')) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        let text = '';
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          text += `\nSheet: ${sheetName}\n` + xlsx.utils.sheet_to_csv(sheet);
        }
        return text;
      } else if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml') || mimeType.includes('msword')) {
        const res = await mammoth.extractRawText({ buffer });
        return res.value;
      } else if (mimeType.includes('text') || mimeType.includes('csv') || mimeType.includes('plain')) {
        return buffer.toString('utf-8');
      } else if (mimeType.includes('pdf')) {
        try {
          const data = await pdfParse(buffer);
          return data.text;
        } catch (err) {
          console.warn('[ExtractionService] pdf-parse failed, will try direct Gemini PDF upload:', err.message);
        }
      }
    } catch (err) {
      console.error('[ExtractionService] Text extraction error:', err.message);
    }
    return null;
  }

  static async extractDocumentData(fileBuffer, fileName, mimeType, retries = 2) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Determine if we can send it directly to Gemini as inlineData (images and PDF)
      const isInlineType = mimeType.startsWith('image/') || mimeType.includes('pdf');
      
      let filePart = null;
      let documentContentText = '';

      if (isInlineType) {
        filePart = {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType,
          },
        };
      } else {
        // Parse docx/xlsx/csv/txt to text
        const text = await this.extractTextFromBuffer(fileBuffer, mimeType);
        if (text) {
          documentContentText = `\n--- Document Text Content ---\n${text}\n`;
        } else {
          documentContentText = `\n[Unrecognized file format or empty content. Filename: ${fileName}]\n`;
        }
      }

      const prompt = `
You are the LifeTwin Cross-Domain Document Analysis Engine.
Your task is to analyze the uploaded file, automatically detect its primary domain: "health", "finance", or "career", and extract structured data.
First, read the file name: "${fileName}" and the file content text (if provided) or examine the document data.

In addition to primary domain extraction, you must analyze and extract cross-domain side-effects. For example:
- A restaurant or food delivery bill (primary: finance) has a health side-effect (nutrition, calories consumed, protein consumed).
- A gym membership or wellness center invoice (primary: finance) has a health side-effect (workout sessions/exercise).
- A medical/pharmacy receipt (primary: finance) has a health side-effect (medications, vitals, or deficiencies).
- A paid coding bootcamp or course receipt (primary: finance) has a career side-effect (study hours, course completed).

You MUST categorize the document into one of the following domains:
1. "health": For medical reports, prescription slips, vitamin blood tests, health checkups, gym records.
2. "finance": For bank statements, receipts, invoices, tax documents, mutual fund statements, portfolio sheets.
3. "career": For resumes, transcripts, GitHub commit logs, certificates of course completion, project reports, job offer letters.

Return ONLY a valid, raw JSON object (no markdown formatting, no backticks). The structure MUST be:
{
  "domain": "health" | "finance" | "career",
  "subType": "bank" | "mutual_fund" | "medical_report" | "prescription" | "course_cert" | "project_log" | "generic",
  
  // Primary Domain Data
  "healthData": {
    "deficiencies": ["string"],
    "medications": ["string"],
    "vitals": {
      "systolic": number | null,
      "diastolic": number | null,
      "heartRate": number | null,
      "weight": number | null,
      "bloodSugar": number | null
    }
  },
  "financeData": {
    "portfolioValue": number | null,
    "returns": number | null,
    "moneySpent": number | null,
    "moneyCredited": number | null,
    "transactions": [
      {
        "amount": number,
        "category": string,
        "type": "income" | "expense",
        "isImpulse": boolean
      }
    ],
    "holdings": [
      {
        "assetName": string,
        "value": number,
        "shares": number
      }
    ]
  },
  "careerData": {
    "studyHours": number | null,
    "completedCourses": number | null,
    "githubCommits": number | null,
    "projectsCompleted": number | null
  },

  // Cross-Domain Side Effects (Fill if the primary document has effects on other domains)
  "crossDomainEffects": {
    "health": {
      "caloriesConsumed": number | null, // e.g. estimate calories for food receipts
      "proteinConsumed": number | null,  // e.g. estimate protein for food receipts
      "workouts": [
        {
          "type": string, // e.g. "Gym Session"
          "durationMinutes": number
        }
      ],
      "medications": ["string"]
    },
    "finance": {
      "moneySpent": number | null,
      "moneyCredited": number | null,
      "transactions": [
        {
          "amount": number,
          "category": string,
          "type": "income" | "expense",
          "isImpulse": boolean
        }
      ]
    },
    "career": {
      "studyHours": number | null,
      "completedCourses": number | null
    }
  }
}
`;

      let result;
      if (filePart) {
        result = await model.generateContent([prompt, filePart]);
      } else {
        result = await model.generateContent([prompt + documentContentText]);
      }

      const responseText = result.response.text();
      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);

    } catch (error) {
      if (error.status === 503 && retries > 0) {
        console.warn(`[ExtractionService] Gemini 503 Overload. Retrying in 3 seconds... (${retries} attempts left)`);
        await this.delay(3000);
        return this.extractDocumentData(fileBuffer, fileName, mimeType, retries - 1);
      }
      console.error('[ExtractionService] AI error:', error);
      return null;
    }
  }
}

export default DocumentExtractionService;
