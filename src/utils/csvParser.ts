export const parseCSV = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const prompts: string[] = [];

        // Skip header row if it exists
        const startIndex = lines[0]?.toLowerCase().includes("prompt") ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            // Handle CSV with quotes
            const prompt = line.replace(/^"(.*)"$/, "$1").trim();
            if (prompt) {
              prompts.push(prompt);
            }
          }
        }

        resolve(prompts);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const downloadSampleCSV = () => {
  const sampleData = `prompt
"Explain quantum computing in simple terms"
"Write a short story about a robot"
"What are the benefits of meditation?"
"Describe the water cycle"`;

  const blob = new Blob([sampleData], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample-prompts.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export interface ParsedQuestion {
  text: string;
  category?: string;
}

export const parseQuestionsCSV = (file: File): Promise<ParsedQuestion[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const questions: ParsedQuestion[] = [];

        // Check if first line is a header
        const firstLine = lines[0]?.toLowerCase();
        const hasHeader = firstLine?.includes("question") || firstLine?.includes("text");
        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            // Split by comma (handle quoted strings)
            const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            
            if (parts.length >= 1) {
              const questionText = parts[0].replace(/^"(.*)"$/, "$1").trim();
              const category = parts[1]?.replace(/^"(.*)"$/, "$1").trim();
              
              if (questionText) {
                questions.push({
                  text: questionText,
                  category: category || undefined,
                });
              }
            }
          }
        }

        resolve(questions);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const downloadQuestionsCSVTemplate = () => {
  const sampleData = `question,category
"What is artificial intelligence?","Technology"
"Explain the water cycle","Science"
"Who wrote Romeo and Juliet?","Literature"
"What are the benefits of exercise?","Health"`;

  const blob = new Blob([sampleData], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample-questions.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export interface ParsedImportExperimentCSV {
  name: string;
  inputPoolName: string;
  description?: string;
  inputPoolDescription?: string;
  evaluationCriteria?: string;
  evaluationQuestions: { evaluation_question: string }[];
  questions: { text: string; category?: string; type: "open" }[];
  models: { name: string }[];
  responses: { model_name: string; question_index: number; text: string }[];
}

const createEmptyImportCsvResult = (): ParsedImportExperimentCSV => ({
  name: "",
  inputPoolName: "",
  evaluationQuestions: [],
  questions: [],
  models: [],
  responses: [],
});

const parseCsvRow = (line: string) => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"(.*)"$/, "$1").trim());
};

export const parseExperimentImportCSV = (file: File): Promise<ParsedImportExperimentCSV> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = String(e.target?.result || "");
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length === 0) {
          throw new Error("CSV file is empty.");
        }

        const header = parseCsvRow(lines[0]).map((value) => value.toLowerCase());
        const requiredColumns = [
          "row_type",
          "name",
          "input_pool_name",
          "description",
          "input_pool_description",
          "evaluation_criteria",
          "evaluation_question",
          "question_text",
          "question_category",
          "question_type",
          "model_name",
          "question_index",
          "response_text",
        ];

        const hasExpectedHeader = requiredColumns.some((column) => header.includes(column));
        const startIndex = hasExpectedHeader ? 1 : 0;

        const result = createEmptyImportCsvResult();

        const isSpreadsheetHeader =
          header.length >= 3 && header[0] === "question" && header[1] === "category";

        if (isSpreadsheetHeader) {
          const modelNames = parseCsvRow(lines[0]).slice(2).map((value) => value.trim());
          const filteredModelNames = modelNames.filter(Boolean);

          if (filteredModelNames.length < 2) {
            throw new Error("Spreadsheet CSV must include at least two model columns.");
          }

          result.models = filteredModelNames.map((name) => ({ name }));

          for (let i = 1; i < lines.length; i += 1) {
            const cells = parseCsvRow(lines[i]);
            if (cells.every((cell) => !cell.trim())) {
              continue;
            }

            const questionText = cells[0]?.trim() || "";
            const category = cells[1]?.trim() || "";
            if (!questionText) {
              continue;
            }

            const questionIndex = result.questions.length;
            result.questions.push({
              text: questionText,
              category: category || undefined,
              type: "open",
            });

            filteredModelNames.forEach((modelName, modelIndex) => {
              const responseText = cells[modelIndex + 2]?.trim() || "";
              result.responses.push({
                model_name: modelName,
                question_index: questionIndex,
                text: responseText,
              });
            });
          }

          resolve(result);
          return;
        }

        for (let i = startIndex; i < lines.length; i += 1) {
          const cells = parseCsvRow(lines[i]);
          if (cells.length === 0) {
            continue;
          }

          const rowType = (cells[0] || "").toLowerCase();
          const get = (index: number) => cells[index]?.trim() || "";

          if (rowType === "meta" || rowType === "experiment") {
            result.name = result.name || get(1);
            result.inputPoolName = result.inputPoolName || get(2);
            result.description = result.description || get(3) || undefined;
            result.inputPoolDescription = result.inputPoolDescription || get(4) || undefined;
            result.evaluationCriteria = result.evaluationCriteria || get(5) || undefined;
            continue;
          }

          if (rowType === "evaluation_question") {
            const evaluationQuestion = get(6) || get(1);
            if (evaluationQuestion) {
              result.evaluationQuestions.push({ evaluation_question: evaluationQuestion });
            }
            continue;
          }

          if (rowType === "question") {
            const text = get(7) || get(1);
            if (text) {
              result.questions.push({
                text,
                category: get(8) || undefined,
                type: "open",
              });
            }
            continue;
          }

          if (rowType === "model") {
            const name = get(10) || get(1);
            if (name) {
              result.models.push({ name });
            }
            continue;
          }

          if (rowType === "response") {
            const modelName = get(10) || get(1);
            const questionIndexRaw = get(11) || get(2);
            const text = get(12) || get(3);
            const questionIndex = Number(questionIndexRaw);
            if (modelName && Number.isInteger(questionIndex) && text) {
              result.responses.push({
                model_name: modelName,
                question_index: questionIndex,
                text,
              });
            }
            continue;
          }

          // Backward-friendly fallbacks if the CSV is written without row_type.
          if (!result.name && get(0) && get(1)) {
            result.name = get(0);
            result.inputPoolName = get(1);
          }
        }

        if (!result.name || !result.inputPoolName) {
          throw new Error(
            "Missing meta row. Include a row with row_type=meta to provide experiment and input pool names."
          );
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const downloadExperimentImportCSVTemplate = () => {
  const sampleData = `question,category,GPT-4,Claude
"What is artificial intelligence?","Technology","Artificial intelligence is the field of building systems that perform tasks requiring human-like intelligence.","AI refers to computer systems that learn patterns, reason, and generate responses."
"Explain the water cycle","Science","The water cycle includes evaporation, condensation, precipitation, and collection.","Water moves through evaporation, cloud formation, rainfall, and return to rivers or seas."`;

  const blob = new Blob([sampleData], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample-experiment-import.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export interface ParsedImportExperimentJSON {
  name: string;
  input_pool_name: string;
  description?: string;
  input_pool_description?: string;
  evaluation_criteria?: string;
  evaluation_questions: { evaluation_question: string }[];
  questions: { text: string; category?: string; type?: string }[];
  models: { name: string }[];
  responses: { model_name: string; question_index: number; text: string }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const parseExperimentImportJSON = (text: string): ParsedImportExperimentJSON => {
  const parsed = JSON.parse(text);
  if (!isRecord(parsed)) {
    throw new Error("Import JSON must be an object.");
  }

  const evaluationQuestions = Array.isArray(parsed.evaluation_questions)
    ? parsed.evaluation_questions
        .filter(isRecord)
        .map((item) => ({
          evaluation_question:
            typeof item.evaluation_question === "string" ? item.evaluation_question : "",
        }))
    : [];

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .filter(isRecord)
        .map((item) => ({
          text: typeof item.text === "string" ? item.text : "",
          category: typeof item.category === "string" ? item.category : undefined,
          type: typeof item.type === "string" ? item.type : "open",
        }))
    : [];

  const models = Array.isArray(parsed.models)
    ? parsed.models
        .filter(isRecord)
        .map((item) => ({
          name: typeof item.name === "string" ? item.name : "",
        }))
    : [];

  const responses = Array.isArray(parsed.responses)
    ? parsed.responses
        .filter(isRecord)
        .map((item) => ({
          model_name: typeof item.model_name === "string" ? item.model_name : "",
          question_index:
            typeof item.question_index === "number" ? item.question_index : Number.NaN,
          text: typeof item.text === "string" ? item.text : "",
        }))
    : [];

  return {
    name: typeof parsed.name === "string" ? parsed.name : "",
    input_pool_name: typeof parsed.input_pool_name === "string" ? parsed.input_pool_name : "",
    description: typeof parsed.description === "string" ? parsed.description : undefined,
    input_pool_description:
      typeof parsed.input_pool_description === "string"
        ? parsed.input_pool_description
        : undefined,
    evaluation_criteria:
      typeof parsed.evaluation_criteria === "string" ? parsed.evaluation_criteria : undefined,
    evaluation_questions: evaluationQuestions,
    questions,
    models,
    responses,
  };
};

export const downloadExperimentImportJSONTemplate = () => {
  const sampleData = {
    name: "Mini Blind Test",
    input_pool_name: "Mini Question Pool",
    description: "Short import example",
    input_pool_description: "Short pool description",
    evaluation_criteria: "Pick the more accurate answer.",
    evaluation_questions: [{ evaluation_question: "Which answer is more accurate?" }],
    questions: [
      { text: "What is AI?", category: "Technology", type: "open" },
    ],
    models: [{ name: "GPT-4" }, { name: "Claude" }],
    responses: [
      {
        model_name: "GPT-4",
        question_index: 0,
        text: "AI is the field of creating systems that can perform tasks requiring human intelligence.",
      },
      {
        model_name: "Claude",
        question_index: 0,
        text: "AI is a system that can learn patterns and generate answers.",
      },
    ],
  };

  const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample-experiment-import.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
