import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ModelPoolItem, QuestionPool, Experiment, Question } from "../types";
import {
  createTest as createTestRequest,
  createQuestion,
  createInputPool,
  createQuestionsBulk,
  deleteQuestion as deleteQuestionRequest,
  deleteInputPool as deleteInputPoolRequest,
  getModels as getModelsRequest,
  getInputPoolById,
  getInputPools,
  getQuestionById as getQuestionByIdRequest,
  getQuestions,
  getQuestionsByCategory as getQuestionsByCategoryRequest,
  getQuestionsByPool,
  getQuestionsByType as getQuestionsByTypeRequest,
  startTest as startTestRequest,
  updateQuestion as updateQuestionRequest,
  updateInputPool,
} from "../lib/authApi";

interface AppContextType {
  // Models
  models: ModelPoolItem[];
  loadModels: () => Promise<void>;
  addModel: (model: Omit<ModelPoolItem, "id" | "createdAt">) => void;
  updateModel: (id: string, updates: Partial<ModelPoolItem>) => void;
  
  // Question Pools
  questionPools: QuestionPool[];
  loadQuestionPools: () => Promise<void>;
  addQuestionPool: (pool: Omit<QuestionPool, "id" | "createdAt">) => Promise<void>;
  updateQuestionPool: (id: string, updates: Partial<QuestionPool>) => Promise<void>;
  deleteQuestionPool: (id: string) => Promise<void>;
  addQuestionToPool: (poolId: string, question: Omit<Question, "id">) => Promise<void>;
  deleteQuestionFromPool: (poolId: string, questionId: string) => Promise<void>;
  updateQuestionInPool: (
    poolId: string,
    questionId: string,
    updates: Partial<Question>
  ) => Promise<void>;
  getQuestionById: (questionId: string) => Promise<Question>;
  getAllQuestions: () => Promise<Question[]>;
  getQuestionsByCategory: (category: string) => Promise<Question[]>;
  getQuestionsByType: (questionType: string) => Promise<Question[]>;
  refreshQuestionPool: (poolId: string) => Promise<void>;
  
  // Experiments
  experiments: Experiment[];
  addExperiment: (experiment: Omit<Experiment, "id" | "createdAt">) => Promise<void>;
  updateExperiment: (id: string, updates: Partial<Experiment>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = "bt_access_token";
const USER_KEY = "bt_user";

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [models, setModels] = useState<ModelPoolItem[]>([]);
  const [questionPools, setQuestionPools] = useState<QuestionPool[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);

  const getAuthContext = () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) {
      throw new Error("Authentication required.");
    }
    const parsedUser = JSON.parse(rawUser) as { organizationId?: string };
    if (!parsedUser.organizationId) {
      throw new Error("Organization context is missing.");
    }
    return {
      accessToken: token,
      organizationId: parsedUser.organizationId,
    };
  };

  const mapQuestion = (question: {
    id: string;
    text: string;
    category?: string | null;
  }): Question => ({
    id: question.id,
    text: question.text,
    category: question.category || undefined,
  });

  const formatProviderName = (provider: string) =>
    provider
      .split(/[-_/]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const getProviderFromModelString = (modelString?: string) => {
    if (!modelString) {
      return "Unknown";
    }
    const provider = modelString.split("/")[0]?.trim();
    return provider ? formatProviderName(provider) : "Unknown";
  };

  const mapModel = (model: {
    id: string;
    name: string;
    api_key: string;
    model_string: string;
    is_active: boolean;
  }): ModelPoolItem => ({
    id: model.id,
    name: model.name,
    provider: getProviderFromModelString(model.model_string),
    apiKey: model.api_key,
    createdAt: undefined,
    modelString: model.model_string,
    isActive: model.is_active,
  });

  const buildTestDescription = (experiment: Omit<Experiment, "id" | "createdAt">) => {
    const parts: string[] = [];

    if (experiment.evaluationCriteria?.trim()) {
      parts.push(`Evaluation Criteria: ${experiment.evaluationCriteria.trim()}`);
    }

    const customQuestionTexts =
      experiment.customQuestions
        ?.map((question) => question.text.trim())
        .filter(Boolean) ?? [];

    if (customQuestionTexts.length > 0) {
      parts.push(`Additional Questions: ${customQuestionTexts.join(" | ")}`);
    }

    return parts.join("\n");
  };

  const loadModels = async () => {
    const { accessToken } = getAuthContext();
    const backendModels = await getModelsRequest(accessToken);
    setModels(backendModels.map(mapModel));
  };

  const addModel = (model: Omit<ModelPoolItem, "id" | "createdAt">) => {
    const newModel: ModelPoolItem = {
      ...model,
      id: `model-${Date.now()}`,
      createdAt: new Date(),
    };
    setModels((prev) => [...prev, newModel]);
  };

  const updateModel = (id: string, updates: Partial<ModelPoolItem>) => {
    setModels((prev) =>
      prev.map((model) => (model.id === id ? { ...model, ...updates } : model))
    );
  };

  const loadQuestionPools = async () => {
    const { accessToken } = getAuthContext();
    const pools = await getInputPools(accessToken);

    const poolsWithQuestions = await Promise.all(
      pools.map(async (pool) => {
        const questions = await getQuestionsByPool(accessToken, pool.id);
        return {
          id: pool.id,
          name: pool.name,
          createdAt: new Date(pool.created_at),
          questions: questions.map(mapQuestion),
        } as QuestionPool;
      })
    );

    setQuestionPools(poolsWithQuestions);
  };

  const addQuestionPool = async (pool: Omit<QuestionPool, "id" | "createdAt">) => {
    const { accessToken, organizationId } = getAuthContext();
    const createdPool = await createInputPool(accessToken, {
      organization_id: organizationId,
      name: pool.name,
      description: `${pool.questions.length} questions`,
    });

    const createdQuestions = await createQuestionsBulk(accessToken, {
      input_pool_id: createdPool.id,
      questions: pool.questions.map((question) => ({
        text: question.text,
        category: question.category,
        type: "open_ended",
      })),
    });

    const newPool: QuestionPool = {
      id: createdPool.id,
      name: createdPool.name,
      createdAt: new Date(createdPool.created_at),
      questions: createdQuestions.map(mapQuestion),
    };
    setQuestionPools((prev) => [newPool, ...prev]);
  };

  const updateQuestionPool = async (id: string, updates: Partial<QuestionPool>) => {
    const { accessToken } = getAuthContext();
    const pool = questionPools.find((item) => item.id === id);
    if (!pool) {
      throw new Error("Question pool not found.");
    }

    const updated = await updateInputPool(accessToken, id, {
      name: updates.name ?? pool.name,
      description: updates.name
        ? `${pool.questions.length} questions`
        : undefined,
    });

    setQuestionPools((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name: updated.name,
            }
          : item
      )
    );
  };

  const deleteQuestionPool = async (id: string) => {
    const { accessToken } = getAuthContext();
    await deleteInputPoolRequest(accessToken, id);
    setQuestionPools((prev) => prev.filter(pool => pool.id !== id));
  };

  const addQuestionToPool = async (
    poolId: string,
    question: Omit<Question, "id">
  ) => {
    const { accessToken } = getAuthContext();
    const created = await createQuestion(accessToken, {
      input_pool_id: poolId,
      text: question.text,
      category: question.category,
      type: "open_ended",
    });

    setQuestionPools((prev) =>
      prev.map((pool) =>
        pool.id === poolId
          ? {
              ...pool,
              questions: [
                ...pool.questions,
                mapQuestion(created),
              ],
            }
          : pool
      )
    );
  };

  const deleteQuestionFromPool = async (poolId: string, questionId: string) => {
    const { accessToken } = getAuthContext();
    await deleteQuestionRequest(accessToken, questionId);
    setQuestionPools((prev) =>
      prev.map((pool) =>
        pool.id === poolId
          ? {
              ...pool,
              questions: pool.questions.filter(
                (question) => question.id !== questionId
              ),
            }
          : pool
      )
    );
  };

  const updateQuestionInPool = async (
    poolId: string,
    questionId: string,
    updates: Partial<Question>
  ) => {
    const { accessToken } = getAuthContext();
    const updated = await updateQuestionRequest(accessToken, questionId, {
      text: updates.text,
      category: updates.category,
      type: "open_ended",
    });

    setQuestionPools((prev) =>
      prev.map((pool) =>
        pool.id === poolId
          ? {
              ...pool,
              questions: pool.questions.map((question) =>
                question.id === questionId ? mapQuestion(updated) : question
              ),
            }
          : pool
      )
    );
  };

  const getQuestionById = async (questionId: string): Promise<Question> => {
    const { accessToken } = getAuthContext();
    const question = await getQuestionByIdRequest(accessToken, questionId);
    return mapQuestion(question);
  };

  const getAllQuestions = async (): Promise<Question[]> => {
    const { accessToken } = getAuthContext();
    const questions = await getQuestions(accessToken);
    return questions.map(mapQuestion);
  };

  const getQuestionsByCategory = async (category: string): Promise<Question[]> => {
    const { accessToken } = getAuthContext();
    const questions = await getQuestionsByCategoryRequest(accessToken, category);
    return questions.map(mapQuestion);
  };

  const getQuestionsByType = async (questionType: string): Promise<Question[]> => {
    const { accessToken } = getAuthContext();
    const questions = await getQuestionsByTypeRequest(accessToken, questionType);
    return questions.map(mapQuestion);
  };

  const refreshQuestionPool = async (poolId: string): Promise<void> => {
    const { accessToken } = getAuthContext();
    const pool = await getInputPoolById(accessToken, poolId);
    const questions = await getQuestionsByPool(accessToken, poolId);

    const nextPool: QuestionPool = {
      id: pool.id,
      name: pool.name,
      createdAt: new Date(pool.created_at),
      questions: questions.map(mapQuestion),
    };

    setQuestionPools((prev) =>
      prev.map((existing) => (existing.id === poolId ? nextPool : existing))
    );
  };

  const addExperiment = async (experiment: Omit<Experiment, "id" | "createdAt">) => {
    const { accessToken, organizationId } = getAuthContext();

    const createdTest = await createTestRequest(accessToken, {
      name: experiment.title,
      description: buildTestDescription(experiment) || undefined,
      status: "DRAFT",
      input_pool_id: experiment.questionPoolId,
      organization_id: organizationId,
      model_ids: experiment.selectedModels.map((model) => model.id),
    });

    await startTestRequest(accessToken, createdTest.id);

    const newExperiment: Experiment = {
      ...experiment,
      id: createdTest.id,
      createdAt: new Date(createdTest.created_at),
      status: "in-progress",
    };

    setExperiments((prev) => [newExperiment, ...prev]);
  };

  const updateExperiment = (id: string, updates: Partial<Experiment>) => {
    setExperiments((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    );
  };

  useEffect(() => {
    loadModels().catch(() => {
      setModels([]);
    });
    loadQuestionPools().catch(() => {
      setQuestionPools([]);
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        models,
        loadModels,
        addModel,
        updateModel,
        questionPools,
        loadQuestionPools,
        addQuestionPool,
        updateQuestionPool,
        deleteQuestionPool,
        addQuestionToPool,
        deleteQuestionFromPool,
        updateQuestionInPool,
        getQuestionById,
        getAllQuestions,
        getQuestionsByCategory,
        getQuestionsByType,
        refreshQuestionPool,
        experiments,
        addExperiment,
        updateExperiment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

