import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { ModelPoolItem, QuestionPool, Experiment } from "../types";

interface AppContextType {
  // Models
  models: ModelPoolItem[];
  addModel: (model: Omit<ModelPoolItem, "id" | "createdAt">) => void;
  updateModel: (id: string, updates: Partial<ModelPoolItem>) => void;
  
  // Question Pools
  questionPools: QuestionPool[];
  addQuestionPool: (pool: Omit<QuestionPool, "id" | "createdAt">) => void;
  updateQuestionPool: (id: string, updates: Partial<QuestionPool>) => void;
  deleteQuestionPool: (id: string) => void;
  
  // Experiments
  experiments: Experiment[];
  addExperiment: (experiment: Omit<Experiment, "id" | "createdAt">) => void;
  updateExperiment: (id: string, updates: Partial<Experiment>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [models, setModels] = useState<ModelPoolItem[]>([]);
  const [questionPools, setQuestionPools] = useState<QuestionPool[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);

  const addModel = (model: Omit<ModelPoolItem, "id" | "createdAt">) => {
    const newModel: ModelPoolItem = {
      ...model,
      id: `model-${Date.now()}`,
      createdAt: new Date(),
    };
    setModels([...models, newModel]);
  };

  const updateModel = (id: string, updates: Partial<ModelPoolItem>) => {
    setModels(models.map(model => 
      model.id === id ? { ...model, ...updates } : model
    ));
  };

  const addQuestionPool = (pool: Omit<QuestionPool, "id" | "createdAt">) => {
    const newPool: QuestionPool = {
      ...pool,
      id: `pool-${Date.now()}`,
      createdAt: new Date(),
    };
    setQuestionPools([...questionPools, newPool]);
  };

  const updateQuestionPool = (id: string, updates: Partial<QuestionPool>) => {
    setQuestionPools(questionPools.map(pool => 
      pool.id === id ? { ...pool, ...updates } : pool
    ));
  };

  const deleteQuestionPool = (id: string) => {
    setQuestionPools(questionPools.filter(pool => pool.id !== id));
  };

  const addExperiment = (experiment: Omit<Experiment, "id" | "createdAt">) => {
    const newExperiment: Experiment = {
      ...experiment,
      id: `exp-${Date.now()}`,
      createdAt: new Date(),
    };
    setExperiments([newExperiment, ...experiments]);
  };

  const updateExperiment = (id: string, updates: Partial<Experiment>) => {
    setExperiments(experiments.map(exp => 
      exp.id === id ? { ...exp, ...updates } : exp
    ));
  };

  return (
    <AppContext.Provider
      value={{
        models,
        addModel,
        updateModel,
        questionPools,
        addQuestionPool,
        updateQuestionPool,
        deleteQuestionPool,
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

