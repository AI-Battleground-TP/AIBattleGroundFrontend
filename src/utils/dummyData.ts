import type {
  Model,
  Prompt,
  Comparison,
  LeaderboardEntry,
  User,
} from "../types";

export const dummyModels: Model[] = [
  {
    id: "1",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    apiKey: "sk-*********************",
    userId: "user1",
    createdAt: new Date("2024-01-15"),
    status: "completed",
  },
  {
    id: "2",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    apiKey: "sk-ant-*********************",
    userId: "user2",
    createdAt: new Date("2024-01-16"),
    status: "evaluating",
  },
  {
    id: "3",
    name: "Gemini Pro",
    provider: "Google",
    apiKey: "AIza*********************",
    userId: "user1",
    createdAt: new Date("2024-01-17"),
    status: "pending",
  },
];

export const dummyPrompts: Prompt[] = [
  {
    id: "1",
    text: "Explain quantum computing in simple terms",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    text: "Write a short poem about artificial intelligence",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "3",
    text: "What are the benefits of renewable energy?",
    createdAt: new Date("2024-01-16"),
  },
  {
    id: "4",
    text: "Describe the process of photosynthesis",
    createdAt: new Date("2024-01-16"),
  },
];

export const dummyComparisons: Comparison[] = [
  {
    id: "1",
    promptId: "1",
    modelAId: "1",
    modelBId: "2",
    responseA:
      "Quantum computing uses quantum bits (qubits) that can exist in multiple states simultaneously, unlike classical bits that are either 0 or 1. This superposition allows quantum computers to process vast amounts of information in parallel, making them exceptionally powerful for specific tasks like cryptography, drug discovery, and complex simulations.",
    responseB:
      "Think of quantum computing like a magical calculator that can try all possible answers at once. Regular computers check one answer at a time, but quantum computers use special quantum properties to check many possibilities simultaneously, making them incredibly fast for certain problems.",
    createdAt: new Date("2024-01-18"),
  },
  {
    id: "2",
    promptId: "2",
    modelAId: "1",
    modelBId: "3",
    responseA:
      "Silicon minds awake at dawn,\nLearning patterns, thinking on.\nNeural networks, deep and bright,\nGuiding humanity toward the light.\nQuestions asked, answers flow,\nArtificial minds continue to grow.",
    responseB:
      "In circuits bright and data streams,\nAI awakens from digital dreams.\nThrough algorithms, swift and wise,\nA new intelligence will rise.\nNot to replace but to enhance,\nHumanity's collaborative dance.",
    createdAt: new Date("2024-01-18"),
  },
  {
    id: "3",
    promptId: "3",
    modelAId: "2",
    modelBId: "3",
    responseA:
      "Renewable energy sources like solar, wind, and hydroelectric power offer numerous benefits. They reduce greenhouse gas emissions, decrease dependence on fossil fuels, create jobs in green sectors, and provide sustainable energy for future generations. Additionally, they help combat climate change and reduce air pollution.",
    responseB:
      "The main advantages of renewable energy include: environmental protection through reduced carbon emissions, energy independence, cost savings over time, job creation in renewable sectors, and unlimited resource availability. Unlike fossil fuels, renewables don't run out and have minimal environmental impact.",
    createdAt: new Date("2024-01-19"),
  },
];

// Generate category-specific leaderboard data
const generateCategoryLeaderboard = (category: string, baseEntries: any[]) => {
  return baseEntries.map((entry) => ({
    ...entry,
    id: `${category}-${entry.id}`,
    eloRating: Math.round(entry.eloRating + (Math.random() * 200 - 100)), // Vary ratings by category
    winRate: Math.round((entry.winRate + (Math.random() * 10 - 5)) * 10) / 10,
    totalVotes: Math.floor(entry.totalVotes * (0.7 + Math.random() * 0.6)),
    category: category as any,
  }));
};

const baseLeaderboard = [
  {
    id: "1",
    modelName: "GPT-4 Turbo",
    provider: "OpenAI",
    eloRating: 1847,
    winRate: 68.5,
    avgResponseTime: 2.3,
    totalVotes: 245,
  },
  {
    id: "2",
    modelName: "Claude 3 Opus",
    provider: "Anthropic",
    eloRating: 1823,
    winRate: 65.2,
    avgResponseTime: 2.1,
    totalVotes: 231,
  },
  {
    id: "3",
    modelName: "Gemini Pro",
    provider: "Google",
    eloRating: 1789,
    winRate: 58.7,
    avgResponseTime: 1.9,
    totalVotes: 198,
  },
  {
    id: "4",
    modelName: "Llama 3 70B",
    provider: "Meta",
    eloRating: 1756,
    winRate: 54.3,
    avgResponseTime: 1.7,
    totalVotes: 187,
  },
  {
    id: "5",
    modelName: "Mistral Large",
    provider: "Mistral AI",
    eloRating: 1721,
    winRate: 51.2,
    avgResponseTime: 1.5,
    totalVotes: 156,
  },
];

// All categories leaderboard (general)
export const dummyLeaderboard: LeaderboardEntry[] = baseLeaderboard.map(entry => ({
  ...entry,
  category: "all" as any,
}));

export const leaderboardCategories = [
  "all",
  "general",
  "reasoning",
  "coding",
  "mathematics",
  "science",
  "health",
  "law",
  "finance",
  "business",
  "education",
  "history",
  "philosophy",
  "religion",
  "creative-writing",
  "summarization",
  "translation",
  "safety",
  "sports",
] as const;

// Category-specific leaderboards
export const dummyLeaderboardByCategory: Record<string, LeaderboardEntry[]> =
  Object.fromEntries(
    leaderboardCategories.map((category) => [
      category,
      category === "all"
        ? dummyLeaderboard
        : generateCategoryLeaderboard(category, baseLeaderboard),
    ])
  );

export const dummyUser: User = {
  id: "user1",
  name: "John Doe",
  email: "john.doe@example.com",
  role: "user",
};

export const dummyJudge: User = {
  id: "judge1",
  name: "Jane Smith",
  email: "jane.smith@example.com",
  role: "judge",
};
