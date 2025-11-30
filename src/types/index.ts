export interface Model {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  userId: string;
  createdAt: Date;
  status: "pending" | "evaluating" | "completed";
}

export interface Prompt {
  id: string;
  text: string;
  modelId?: string;
  createdAt: Date;
}

export interface ModelResponse {
  id: string;
  promptId: string;
  modelId: string;
  response: string;
  responseTime: number;
  createdAt: Date;
}

export interface Comparison {
  id: string;
  promptId: string;
  modelAId: string;
  modelBId: string;
  responseA: string;
  responseB: string;
  winner?: "A" | "B";
  judgeId?: string;
  createdAt: Date;
}

export interface LeaderboardEntry {
  id: string;
  modelName: string;
  provider: string;
  eloRating: number;
  winRate: number;
  avgResponseTime: number;
  totalVotes: number;
}

export interface JudgeLeaderboardEntry {
  id: string;
  judgeName: string;
  username: string;
  totalEvaluations: number;
  completedComparisons: number;
  averageRating: number;
  accuracy: number;
  joinedDate: Date;
  lastActive: Date;
}

export interface User {
  id: string;
  name: string;
  role: "user" | "judge";
}

export interface Judge extends User {
  role: "judge";
  votesCount: number;
}

export interface SavedModel {
  id: string;
  name: string;
  provider: string;
  apiKey: string; // In real app, this would be encrypted
  userId: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  savedModels: SavedModel[];
  totalComparisons: number;
  createdAt: Date;
}

export interface JudgeProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  totalEvaluations: number;
  completedComparisons: number;
  averageRating: number;
  joinedDate: Date;
  lastActive: Date;
}

export interface ModelPair {
  id: string;
  title: string;
  purpose?: string;
  model1: Model;
  model2: Model;
  prompts: string[];
  createdAt: Date;
  status: "pending" | "in-progress" | "completed";
  totalEvaluations?: number;
  completedEvaluations?: number;
}

// New types for Model Pool, Question Pool, and Experiments
export interface ModelPoolItem {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  createdAt: Date;
}

export interface Question {
  id: string;
  text: string;
  category?: string;
}

export interface QuestionPool {
  id: string;
  name: string;
  questions: Question[];
  createdAt: Date;
}

export interface Experiment {
  id: string;
  title: string;
  questionPoolId: string;
  questionPoolName: string;
  selectedModels: ModelPoolItem[];
  createdAt: Date;
  status: "in-progress" | "completed";
  comparisons?: ExperimentComparison[];
}

export interface ExperimentComparison {
  questionId: string;
  questionText: string;
  modelAPair: { modelA: ModelPoolItem; modelB: ModelPoolItem };
  responseA?: string;
  responseB?: string;
  votes?: {
    modelA: number;
    modelB: number;
    tie: number;
    bothPoor: number;
  };
}