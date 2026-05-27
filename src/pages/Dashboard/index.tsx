import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Card, Toast, Textarea } from "../../components";
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
import { cn } from "@/lib/utils";
import type { ModelPoolItem, Question } from "../../types";

type SelectedModelEntry = {
  selectionId: string;
  modelId: string;
};

type SelectedModelView = ModelPoolItem & {
  selectionId: string;
  displayName: string;
};

export const Dashboard: React.FC = () => {
  const { models, questionPools, addExperiment, loadModels, loadQuestionPools } = useApp();
  
  // Form state
  const [experimentTitle, setExperimentTitle] = useState("");
  const [selectedModelEntries, setSelectedModelEntries] = useState<SelectedModelEntry[]>([]);
  const [modelSystemPrompts, setModelSystemPrompts] = useState<Record<string, string>>({});
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [evaluationCriteria, setEvaluationCriteria] = useState("");
  const [customQuestions, setCustomQuestions] = useState<string[]>([""]);
  const [showToast, setShowToast] = useState(false);
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        status: "in-progress",
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

  useEffect(() => {
    loadModels().catch(() => undefined);
    loadQuestionPools().catch(() => undefined);
  }, []);

  return (
    <div className="space-y-8">
      {showToast && (
        <Toast
          message="Your experiment has started. You can follow progress on the Results page."
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
