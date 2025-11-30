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