import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Card, Toast, Textarea } from "../../components";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { ChevronDown, Info, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "@/lib/utils";
import type { ModelPoolItem, Question } from "../../types";
import {
  importExperiment,
  type ExperimentImportRequest,
} from "../../lib/authApi";
import {
  downloadExperimentImportCSVTemplate,
  parseExperimentImportCSV,
} from "../../utils/csvParser";

type SelectedModelEntry = {
  selectionId: string;
  modelId: string;
};

type SelectedModelView = ModelPoolItem & {
  selectionId: string;
  displayName: string;
};

type ImportQuestionRow = {
  text: string;
  category: string;
};

type ImportModelColumn = {
  name: string;
};

type ImportTableCell = {
  text: string;
};

export const Dashboard: React.FC = () => {
  const { models, questionPools, addExperiment, loadModels, loadQuestionPools } = useApp();
  const { user } = useAuth();
  
  // Form state
  const [experimentTitle, setExperimentTitle] = useState("");
  const [selectedModelEntries, setSelectedModelEntries] = useState<SelectedModelEntry[]>([]);
  const [modelSystemPrompts, setModelSystemPrompts] = useState<Record<string, string>>({});
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [evaluationCriteria, setEvaluationCriteria] = useState("");
  const [customQuestions, setCustomQuestions] = useState<string[]>([""]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportingExperiment, setIsImportingExperiment] = useState(false);
  const [importExperimentTitle, setImportExperimentTitle] = useState("");
  const [importInputPoolName, setImportInputPoolName] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importInputPoolDescription, setImportInputPoolDescription] = useState("");
  const [importEvaluationCriteria, setImportEvaluationCriteria] = useState("");
  const [importQuestions, setImportQuestions] = useState<ImportQuestionRow[]>([
    { text: "", category: "" },
  ]);
  const [importModels, setImportModels] = useState<ImportModelColumn[]>([
    { name: "" },
    { name: "" },
  ]);
  const [importResponseGrid, setImportResponseGrid] = useState<ImportTableCell[][]>([
    [{ text: "" }, { text: "" }],
  ]);
  const [importCsvFileName, setImportCsvFileName] = useState("");
  const handleAddModelEntry = (modelId: string) => {
    const selectionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${modelId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSelectedModelEntries((prev) => [...prev, { selectionId, modelId }]);
    setModelSystemPrompts((prev) => ({
      ...prev,
      [modelId]: prev[modelId] ?? "",
    }));
  };

  const handleRemoveModelEntry = (selectionId: string) => {
    setSelectedModelEntries((prev) => prev.filter((entry) => entry.selectionId !== selectionId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!experimentTitle.trim()) {
      setAlertMessage("Please enter an experiment title");
      setShowAlertToast(true);
      return;
    }

    if (selectedModelEntries.length < 2) {
      setAlertMessage("Please select at least 2 models to compare");
      setShowAlertToast(true);
      return;
    }

    if (!selectedPoolId) {
      setAlertMessage("Please select a question pool");
      setShowAlertToast(true);
      return;
    }

    if (!evaluationCriteria.trim()) {
      setAlertMessage("Please provide evaluation criteria");
      setShowAlertToast(true);
      return;
    }

    if (customQuestions.filter((question) => question.trim()).length === 0) {
      setAlertMessage("Please add at least one additional question");
      setShowAlertToast(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedModels: ModelPoolItem[] = selectedModelEntries
        .map((entry) => models.find((m) => m.id === entry.modelId))
        .filter(Boolean) as ModelPoolItem[];
      const selectedPool = questionPools.find(p => p.id === selectedPoolId);

      if (!selectedPool) {
        setAlertMessage("Selected question pool not found");
        setShowAlertToast(true);
        return;
      }

      // Convert custom questions strings to Question objects
      const customQuestionObjects: Question[] = customQuestions
        .filter(q => q.trim())
        .map((text, index) => ({
          id: `custom-q-${Date.now()}-${index}`,
          text: text.trim(),
        }));

      await addExperiment({
        title: experimentTitle,
        questionPoolId: selectedPool.id,
        questionPoolName: selectedPool.name,
        selectedModels: selectedModels,
        status: "in_progress",
        evaluationCriteria: evaluationCriteria.trim() || undefined,
        customQuestions: customQuestionObjects.length > 0 ? customQuestionObjects : undefined,
        modelSystemPrompts,
      });

      // Reset form
      setExperimentTitle("");
      setSelectedModelEntries([]);
      setModelSystemPrompts({});
      setSelectedPoolId("");
      setEvaluationCriteria("");
      setCustomQuestions([""]);
      setToastMessage("Your experiment has started. You can follow progress on the Results page.");
      setShowToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "Experiment could not be started."
      );
      setShowAlertToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPool = questionPools.find(p => p.id === selectedPoolId);
  const selectionCountsByModelId = useMemo(
    () =>
      selectedModelEntries.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.modelId] = (acc[entry.modelId] || 0) + 1;
        return acc;
      }, {}),
    [selectedModelEntries]
  );
  const selectedModelCountBySelectionId = useMemo(() => {
    const runningCount: Record<string, number> = {};
    return selectedModelEntries.reduce<Record<string, number>>((acc, entry) => {
      runningCount[entry.modelId] = (runningCount[entry.modelId] || 0) + 1;
      acc[entry.selectionId] = runningCount[entry.modelId];
      return acc;
    }, {});
  }, [selectedModelEntries]);
  const selectedModels = useMemo<SelectedModelView[]>(
    () =>
      selectedModelEntries
        .map((entry) => {
          const model = models.find((item) => item.id === entry.modelId);
          if (!model) {
            return null;
          }
          const nth = selectedModelCountBySelectionId[entry.selectionId] || 1;
          const total = selectionCountsByModelId[entry.modelId] || 1;
          return {
            ...model,
            selectionId: entry.selectionId,
            displayName: total > 1 ? `${model.name} (${nth})` : model.name,
          };
        })
        .filter((item): item is SelectedModelView => item !== null),
    [models, selectedModelEntries, selectedModelCountBySelectionId, selectionCountsByModelId]
  );

  const modelsDropdownLabel = useMemo(() => {
    if (selectedModelEntries.length === 0) {
      return "-- Select models --";
    }
    const lines = selectedModels.map((m) => `${m.provider} - ${m.displayName}`);
    if (lines.length <= 2) {
      return lines.join(", ");
    }
    return `${selectedModelEntries.length} models selected`;
  }, [selectedModelEntries.length, selectedModels]);

  const handleCustomQuestionChange = (index: number, value: string) => {
    const newQuestions = [...customQuestions];
    newQuestions[index] = value;
    setCustomQuestions(newQuestions);
  };

  const handleAddCustomQuestion = () => {
    setCustomQuestions((prev) => [...prev, ""]);
  };

  const handleRemoveCustomQuestion = (index: number) => {
    if (customQuestions.length <= 1) {
      return;
    }
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleModelSystemPromptChange = (modelId: string, value: string) => {
    setModelSystemPrompts((prev) => ({
      ...prev,
      [modelId]: value,
    }));
  };

  const resetImportGrid = () => {
    setImportExperimentTitle("");
    setImportInputPoolName("");
    setImportDescription("");
    setImportInputPoolDescription("");
    setImportEvaluationCriteria("");
    setImportQuestions([{ text: "", category: "" }]);
    setImportModels([{ name: "" }, { name: "" }]);
    setImportResponseGrid([[{ text: "" }, { text: "" }]]);
    setImportCsvFileName("");
  };

  const syncImportResponseGrid = (
    nextQuestions: ImportQuestionRow[],
    nextModels: ImportModelColumn[],
    previousGrid: ImportTableCell[][]
  ) => {
    const nextGrid = nextQuestions.map((_, rowIndex) =>
      nextModels.map((_, colIndex) => ({
        text: previousGrid[rowIndex]?.[colIndex]?.text ?? "",
      }))
    );
    setImportResponseGrid(nextGrid);
  };

  const handleImportQuestionChange = (index: number, value: string) => {
    setImportQuestions((prev) => {
      const next = prev.map((row) => ({ ...row }));
      next[index] = { ...next[index], text: value };
      return next;
    });
  };

  const handleImportQuestionCategoryChange = (index: number, value: string) => {
    setImportQuestions((prev) => {
      const next = prev.map((row) => ({ ...row }));
      next[index] = { ...next[index], category: value };
      return next;
    });
  };

  const handleAddImportQuestion = () => {
    setImportQuestions((prev) => {
      const next = [...prev, { text: "", category: "" }];
      syncImportResponseGrid(next, importModels, importResponseGrid);
      return next;
    });
  };

  const handleRemoveImportQuestion = (index: number) => {
    if (importQuestions.length <= 1) {
      return;
    }
    setImportQuestions((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      const nextGrid = importResponseGrid.filter((_, itemIndex) => itemIndex !== index);
      setImportResponseGrid(nextGrid);
      return next;
    });
  };

  const handleImportModelChange = (index: number, value: string) => {
    setImportModels((prev) => {
      const next = prev.map((row) => ({ ...row }));
      next[index] = { ...next[index], name: value };
      return next;
    });
  };

  const handleAddImportModel = () => {
    setImportModels((prev) => {
      const next = [...prev, { name: "" }];
      syncImportResponseGrid(importQuestions, next, importResponseGrid);
      return next;
    });
  };

  const handleRemoveImportModel = (index: number) => {
    if (importModels.length <= 2) {
      return;
    }
    setImportModels((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      const nextGrid = importResponseGrid.map((row) =>
        row.filter((_, itemIndex) => itemIndex !== index)
      );
      setImportResponseGrid(nextGrid);
      return next;
    });
  };

  const handleImportResponseChange = (rowIndex: number, colIndex: number, value: string) => {
    setImportResponseGrid((prev) =>
      prev.map((row, currentRowIndex) =>
        currentRowIndex !== rowIndex
          ? row
          : row.map((cell, currentColIndex) =>
              currentColIndex !== colIndex ? cell : { text: value }
            )
      )
    );
  };

  const resetImportState = () => {
    resetImportGrid();
  };

  const validateImportSpreadsheet = () => {
    const errors: string[] = [];
    const questionRows = importQuestions.filter((question) => question.text.trim());
    const modelRows = importModels.filter((model) => model.name.trim());

    if (!importExperimentTitle.trim()) {
      errors.push("Missing experiment name.");
    }
    if (!importInputPoolName.trim()) {
      errors.push("Missing input pool name.");
    }
    if (questionRows.length === 0) {
      errors.push("Add at least one question.");
    }
    if (modelRows.length < 2) {
      errors.push("Add at least two models.");
    }
    if (!importEvaluationCriteria.trim()) {
      errors.push("Missing evaluation criteria.");
    }

    if (questionRows.length > 0 && modelRows.length > 0) {
      const expectedResponseCount = questionRows.length * modelRows.length;
      const actualResponseCount = questionRows.flatMap((_, rowIndex) =>
        modelRows.map((_, colIndex) => importResponseGrid[rowIndex]?.[colIndex]?.text.trim() || "")
      ).length;

      if (actualResponseCount !== expectedResponseCount) {
        errors.push(`Expected ${expectedResponseCount} response cells, but found ${actualResponseCount}.`);
      }
    }

    const missingCells: string[] = [];
    questionRows.forEach((_, rowIndex) => {
      modelRows.forEach((model, colIndex) => {
        const value = importResponseGrid[rowIndex]?.[colIndex]?.text.trim() || "";
        if (!value) {
          missingCells.push(`${model.name.trim()} / Question ${rowIndex + 1}`);
        }
      });
    });

    if (missingCells.length > 0) {
      errors.push(
        `Missing responses for: ${missingCells.slice(0, 5).join(", ")}${missingCells.length > 5 ? "..." : ""}`
      );
    }

    const uniqueModelNames = new Set(modelRows.map((model) => model.name.trim()));
    if (uniqueModelNames.size !== modelRows.length) {
      errors.push("Model names must be unique.");
    }

    if (questionRows.some((question) => !question.text.trim())) {
      errors.push("Question rows cannot be empty.");
    }
    return errors;
  };

  const handleImportCsvFile = async (file: File) => {
    try {
      const parsed = await parseExperimentImportCSV(file);
      setImportCsvFileName(file.name);
      setImportQuestions(
        parsed.questions.length > 0
          ? parsed.questions.map((question) => ({
              text: question.text,
              category: question.category || "",
            }))
          : [{ text: "", category: "" }]
      );
      setImportModels(
        parsed.models.length >= 2
          ? parsed.models.map((model) => ({ name: model.name }))
          : [{ name: "" }, { name: "" }]
      );
      const nextQuestions =
        parsed.questions.length > 0 ? parsed.questions : [{ text: "", category: "" }];
      const nextModels =
        parsed.models.length >= 2 ? parsed.models : [{ name: "" }, { name: "" }];
      setImportResponseGrid(
        nextQuestions.map((_, rowIndex) =>
          nextModels.map((model, colIndex) => ({
            text:
              parsed.responses.find(
                (response) =>
                  response.model_name.trim() === model.name.trim() &&
                  response.question_index === rowIndex
              )?.text || "",
          }))
        )
      );
      setAlertMessage("");
      setShowAlertToast(false);
    } catch (error) {
      setImportCsvFileName("");
      setAlertMessage(
        error instanceof Error ? error.message : "Error parsing CSV file. Please check the format."
      );
      setShowAlertToast(true);
    }
  };

  const handleImportCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setAlertMessage("Please upload a .csv file.");
      setShowAlertToast(true);
      return;
    }
    await handleImportCsvFile(file);
  };

  const handleImportCsvDownloadTemplate = () => {
    downloadExperimentImportCSVTemplate();
  };

  const handleImportExperiment = async () => {
    if (!user?.organizationId) {
      setAlertMessage("Organization context is missing.");
      setShowAlertToast(true);
      return;
    }

    const validationErrors = validateImportSpreadsheet();
    if (validationErrors.length > 0) {
      setAlertMessage(validationErrors[0]);
      setShowAlertToast(true);
      return;
    }

    const questionRows = importQuestions.filter((question) => question.text.trim());
    const modelRows = importModels.filter((model) => model.name.trim());
    const payload: ExperimentImportRequest = {
      name: importExperimentTitle.trim(),
      input_pool_name: importInputPoolName.trim(),
      description: importDescription.trim() || undefined,
      input_pool_description: importInputPoolDescription.trim() || undefined,
      evaluation_criteria: importEvaluationCriteria.trim() || undefined,
      organization_id: user.organizationId,
      evaluation_questions: [
        {
          evaluation_question:
            importEvaluationCriteria.trim() || "Which response is more accurate?",
        },
      ],
      questions: questionRows.map((question) => ({
        text: question.text.trim(),
        category: question.category.trim() || undefined,
        type: "open",
      })),
      models: modelRows.map((model) => ({
        name: model.name.trim(),
      })),
      responses: questionRows.flatMap((_, rowIndex) =>
        modelRows.map((model, colIndex) => ({
          model_name: model.name.trim(),
          question_index: rowIndex,
          text: importResponseGrid[rowIndex]?.[colIndex]?.text.trim() || "",
        }))
      ),
    };

    setIsImportingExperiment(true);
    try {
      const accessToken = localStorage.getItem("bt_access_token");
      if (!accessToken) {
        throw new Error("Missing access token.");
      }
      await importExperiment(accessToken, payload);
      setToastMessage("Experiment imported successfully. It is already completed and ready for judges.");
      setShowToast(true);
      resetImportState();
      await loadModels().catch(() => undefined);
      await loadQuestionPools().catch(() => undefined);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Experiment could not be imported."
      );
      setShowAlertToast(true);
    } finally {
      setIsImportingExperiment(false);
    }
  };

  useEffect(() => {
    loadModels().catch(() => undefined);
    loadQuestionPools().catch(() => undefined);
  }, []);

  return (
    <div className="space-y-8">
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
      {showAlertToast && (
        <Toast
          message={alertMessage}
          type="error"
          onClose={() => setShowAlertToast(false)}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Head Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Create multi-model experiments with question pools
          </p>
        </div>
      </div>

      <Card title="Start New Experiment" className="relative">
        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 rounded-lg">
            <div className="text-center space-y-4">
              <img
                src="/logo.PNG"
                alt="AI Battleground"
                className="w-24 h-24 mx-auto"
              />
              <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-foreground">Setting Up Your Experiment</h3>
                <p className="text-muted-foreground">
                  Creating experiment with {selectedModelEntries.length} models...
                </p>
              </div>
            </div>
          </div>
        )}

                <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> Select at least 2 models from your model
            pool and a question pool. The system will generate pairwise experiments
            (A vs B, B vs C, etc.) for judges to evaluate. Track results on the
            Results page.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Experiment Title"
              placeholder="e.g., Multi-Model Creative Writing Test"
              value={experimentTitle}
              onChange={(e) => setExperimentTitle(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Give your experiment a descriptive name
            </p>
          </div>

          {/* Model Selection */}
          <div className="border-t-2 border-border pt-6">
            <label className="block text-sm font-medium text-foreground mb-1">
              Select Models (Choose at least 2)
            </label>

            {models.length === 0 ? (
              <div className="bg-accent/20 border border-accent/30 rounded-lg p-4">
                <p className="text-sm text-accent-foreground">
                  <strong>⚠️ No models available.</strong> Please add models in the
                  Models page first.
                </p>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={isSubmitting}>
                  <button
                    type="button"
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "truncate text-left",
                        selectedModelEntries.length === 0 && "text-muted-foreground"
                      )}
                    >
                      {modelsDropdownLabel}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-96 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto z-[100]"
                >
                  <DropdownMenuLabel className="font-normal text-muted-foreground">
                    Choose at least 2 models
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {models.map((model) => (
                    <DropdownMenuCheckboxItem
                      key={model.id}
                      checked={false}
                      onCheckedChange={() => handleAddModelEntry(model.id)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {`${model.provider} - ${model.name}`}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {selectedModelEntries.length > 0 && (
              <div className="mt-3 text-sm text-primary">
                ✓ {selectedModelEntries.length} model{selectedModelEntries.length !== 1 ? 's' : ''} selected
                {selectedModelEntries.length >= 2 && (
                  <span className="ml-2">
                    ({(selectedModelEntries.length * (selectedModelEntries.length - 1)) / 2} pairwise
                    experiment{(selectedModelEntries.length * (selectedModelEntries.length - 1)) / 2 !== 1 ? 's' : ''} will be created)
                  </span>
                )}
              </div>
            )}
            {selectedModels.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedModels.map((model) => (
                  <Button
                    key={model.selectionId}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveModelEntry(model.selectionId)}
                    disabled={isSubmitting}
                  >
                    {model.provider} - {model.displayName} ✕
                  </Button>
                ))}
              </div>
            )}

            {selectedModels.length > 0 && (
              <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    System Prompts
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add optional model-specific instructions for this experiment.
                  </p>
                </div>
                <div className="space-y-4">
                  {selectedModels.map((model) => (
                    <div
                      key={model.selectionId}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {model.displayName}
                        </span>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {model.provider}
                        </span>
                      </div>
                      <Textarea
                        placeholder="e.g., Answer concisely and prioritize factual accuracy."
                        value={modelSystemPrompts[model.id] ?? ""}
                        onChange={(e) =>
                          handleModelSystemPromptChange(model.id, e.target.value)
                        }
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Question Pool Selection */}
          <div className="border-t-2 border-border pt-6">
            <label className="block text-sm font-medium text-foreground mb-1">
              Select Question Pool
            </label>

            {questionPools.length === 0 ? (
              <div className="bg-accent/20 border border-accent/30 rounded-lg p-4">
                <p className="text-sm text-accent-foreground">
                  <strong>⚠️ No question pools available.</strong> Please create a
                  question pool in the Question Pool page first.
                </p>
              </div>
            ) : (
              <Select
                value={selectedPoolId || undefined}
                onValueChange={(value) => setSelectedPoolId(value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Select a question pool --" />
                </SelectTrigger>
                <SelectContent className="max-h-96 z-[100]">
                  {questionPools.map((pool) => (
                    <SelectItem key={pool.id} value={pool.id}>
                      {pool.name}
                      <span className="text-muted-foreground">
                        {" "}
                        · {pool.questions.length} question
                        {pool.questions.length !== 1 ? "s" : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedPool && (
              <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm font-semibold text-primary mb-2">
                  Preview: {selectedPool.name}
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedPool.questions.slice(0, 3).map((q, idx) => (
                    <p key={q.id} className="text-xs text-primary">
                      {idx + 1}. {q.text}
                      {q.category && (
                        <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary rounded text-xs">
                          {q.category}
                        </span>
                      )}
                    </p>
                  ))}
                  {selectedPool.questions.length > 3 && (
                    <p className="text-xs text-primary italic">
                      ...and {selectedPool.questions.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Evaluation Criteria */}
          <div className="border-t-2 border-border pt-6">
            <label className="block text-lg font-semibold text-foreground mb-3">
              Evaluation Criteria
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Provide guidance for judges on how to evaluate the models. For example: "Please do not select responses that generate NSFW content." or "Please prefer models that provide shorter and more concise responses when making your selections."
            </p>
            <Textarea
              placeholder="e.g., Select the model that demonstrates better accuracy in its responses"
              value={evaluationCriteria}
              onChange={(e) => setEvaluationCriteria(e.target.value)}
              rows={3}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Custom Questions */}
          <div className="border-t-2 border-border pt-6">
            <label className="block text-lg font-semibold text-foreground mb-3">
              Judge Evaluation Questions
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Add at least one custom question that will be included in this experiment. These questions will be used to evaluate the models.
            </p>
            <div className="space-y-3">
              {customQuestions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <Input
                    label={`Question ${index + 1}`}
                    placeholder={
                      index === 0
                        ? "e.g., Select the Better Response"
                        : `Enter question ${index + 1}...`
                    }
                    value={question}
                    onChange={(e) => handleCustomQuestionChange(index, e.target.value)}
                    disabled={isSubmitting}
                    required={index === 0}
                  />
                  {customQuestions.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveCustomQuestion(index)}
                      disabled={isSubmitting}
                    >
                      Remove Question
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomQuestion}
                disabled={isSubmitting}
              >
                Add Question
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={
              isSubmitting ||
              selectedModelEntries.length < 2 ||
              !selectedPoolId ||
              !evaluationCriteria.trim() ||
              customQuestions.filter((question) => question.trim()).length === 0 ||
              models.length === 0 ||
              questionPools.length === 0
            }
          >
            Start Experiment
          </Button>
        </form>
      </Card>

      <Card title="Import Experiment From CSV">
        <div className="space-y-5">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV import:</strong> Fill the form like a small spreadsheet. You can paste or upload a CSV file, and the import will create a completed experiment directly, without running model generation.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
              <div
                className={cn(
                  "rounded-xl border-2 border-dashed p-5 transition-colors",
                  importCsvFileName ? "border-primary bg-primary/5" : "border-border bg-muted/10"
                )}
                onDragOver={(event) => event.preventDefault()}
                onDrop={async (event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (!file) return;
                  await handleImportCsvFile(file);
                }}
              >
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  id="import-experiment-csv"
                  onChange={handleImportCsvUpload}
                />
                <div className="space-y-3 text-center">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      Drag and drop your CSV here
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Or choose a sample CSV and edit the table below.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("import-experiment-csv")?.click()}
                      disabled={isImportingExperiment}
                    >
                      Choose CSV
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleImportCsvDownloadTemplate}
                      disabled={isImportingExperiment}
                    >
                      Download sample CSV
                    </Button>
                  </div>
                  {importCsvFileName && (
                    <p className="text-sm text-primary">
                      Selected file: <strong>{importCsvFileName}</strong>
                    </p>
                  )}
                  <div className="mx-auto mt-2 max-w-3xl overflow-hidden rounded-xl border border-border bg-background">
                    <img
                      src="/examle-exp.png"
                      alt="Example experiment CSV layout"
                      className="h-auto w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Experiment Title"
                  placeholder="Experiment title"
                  value={importExperimentTitle}
                  onChange={(e) => setImportExperimentTitle(e.target.value)}
                  required
                  disabled={isImportingExperiment}
                />
                <Input
                  label="Question Pool Name"
                  placeholder="Question pool name"
                  value={importInputPoolName}
                  onChange={(e) => setImportInputPoolName(e.target.value)}
                  required
                  disabled={isImportingExperiment}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Textarea
                  label="Experiment Description"
                  placeholder="Optional experiment description"
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                  rows={3}
                  disabled={isImportingExperiment}
                />
                <Textarea
                  label="Question Pool Description"
                  placeholder="Optional question pool description"
                  value={importInputPoolDescription}
                  onChange={(e) => setImportInputPoolDescription(e.target.value)}
                  rows={3}
                  disabled={isImportingExperiment}
                />
              </div>

              <Textarea
                label="Evaluation Criteria"
                placeholder="How should judges decide?"
                value={importEvaluationCriteria}
                onChange={(e) => setImportEvaluationCriteria(e.target.value)}
                rows={3}
                required
                disabled={isImportingExperiment}
              />

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Spreadsheet Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Add questions and models with the + buttons, then fill in every response cell.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleAddImportQuestion} disabled={isImportingExperiment}>
                      + Question
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddImportModel} disabled={isImportingExperiment}>
                      + Model
                    </Button>
                  </div>
                </div>

                <div className="max-h-[460px] overflow-auto rounded-lg border border-border bg-background">
                  <table className="min-w-[1280px] w-full border-collapse text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="w-[260px] border-b border-border px-3 py-2 text-left font-semibold text-foreground">
                          Question
                        </th>
                        <th className="w-[150px] border-b border-border px-3 py-2 text-left font-semibold text-foreground">
                          Category
                        </th>
                        {importModels.map((model, modelIndex) => (
                          <th key={`model-head-${modelIndex}`} className="min-w-[220px] border-b border-border px-3 py-2 text-left font-semibold text-foreground">
                            <div className="mb-2 flex items-center gap-2">
                              <Input
                                placeholder={`Model ${modelIndex + 1}`}
                                value={model.name}
                                onChange={(e) => handleImportModelChange(modelIndex, e.target.value)}
                                disabled={isImportingExperiment}
                                className="mb-0"
                              />
                              {importModels.length > 2 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImportModel(modelIndex)} disabled={isImportingExperiment}>
                                  Remove
                                </Button>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importQuestions.map((question, rowIndex) => (
                        <tr key={`row-${rowIndex}`} className="align-top">
                          <td className="border-b border-border px-3 py-2">
                            <Textarea
                              value={question.text}
                              onChange={(e) => handleImportQuestionChange(rowIndex, e.target.value)}
                              rows={3}
                              placeholder={`Question ${rowIndex + 1}`}
                              disabled={isImportingExperiment}
                              className="mb-0"
                            />
                          </td>
                          <td className="border-b border-border px-3 py-2">
                            <Input
                              value={question.category}
                              onChange={(e) => handleImportQuestionCategoryChange(rowIndex, e.target.value)}
                              placeholder="Optional"
                              disabled={isImportingExperiment}
                              className="mb-0"
                            />
                          </td>
                          {importModels.map((model, colIndex) => (
                            <td key={`cell-${rowIndex}-${colIndex}`} className="border-b border-border px-3 py-2">
                              <Textarea
                                value={importResponseGrid[rowIndex]?.[colIndex]?.text ?? ""}
                                onChange={(e) => handleImportResponseChange(rowIndex, colIndex, e.target.value)}
                                rows={3}
                                placeholder={`${model.name || `Model ${colIndex + 1}`} answer`}
                                disabled={isImportingExperiment}
                                className="mb-0"
                              />
                            </td>
                          ))}
                          <td className="border-b border-border px-3 py-2">
                            {importModels.length > 0 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImportQuestion(rowIndex)} disabled={isImportingExperiment || importQuestions.length <= 1}>
                                Remove
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button
                type="button"
                className="w-full"
                size="lg"
                disabled={isImportingExperiment || !importExperimentTitle.trim() || !importInputPoolName.trim() || importQuestions.length === 0 || importModels.length < 2}
                onClick={() => void handleImportExperiment()}
              >
                {isImportingExperiment ? "Importing Experiment..." : "Import Experiment"}
              </Button>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground">CSV Notes</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The sample CSV only fills the spreadsheet area. Experiment title, pool name, descriptions, and evaluation criteria should still be entered above.
                </p>
              </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{models.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Models Available</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {questionPools.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Question Pools</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {questionPools.reduce((acc, pool) => acc + pool.questions.length, 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Questions</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
