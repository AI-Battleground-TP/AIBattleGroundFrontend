import React, { useState } from "react";
import { Button, Input, Card, Toast, Textarea } from "../../components";
import { Checkbox } from "../../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Info, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { Question } from "../../types";

export const Dashboard: React.FC = () => {
  const { models, questionPools, addExperiment } = useApp();
  
  // Form state
  const [experimentTitle, setExperimentTitle] = useState("");
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [evaluationCriteria, setEvaluationCriteria] = useState("");
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(0);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModelToggle = (modelId: string) => {
    if (selectedModelIds.includes(modelId)) {
      setSelectedModelIds(selectedModelIds.filter(id => id !== modelId));
    } else {
      setSelectedModelIds([...selectedModelIds, modelId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!experimentTitle.trim()) {
      setAlertMessage("Please enter an experiment title");
      setShowAlertToast(true);
      return;
    }

    if (selectedModelIds.length < 2) {
      setAlertMessage("Please select at least 2 models to compare");
      setShowAlertToast(true);
      return;
    }

    if (!selectedPoolId) {
      setAlertMessage("Please select a question pool");
      setShowAlertToast(true);
      return;
    }

    setIsSubmitting(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const selectedModels = models.filter(m => selectedModelIds.includes(m.id));
    const selectedPool = questionPools.find(p => p.id === selectedPoolId);

    if (!selectedPool) {
      setAlertMessage("Selected question pool not found");
      setShowAlertToast(true);
      setIsSubmitting(false);
      return;
    }

    // Convert custom questions strings to Question objects
    const customQuestionObjects: Question[] = customQuestions
      .filter(q => q.trim())
      .map((text, index) => ({
        id: `custom-q-${Date.now()}-${index}`,
        text: text.trim(),
      }));

    addExperiment({
      title: experimentTitle,
      questionPoolId: selectedPool.id,
      questionPoolName: selectedPool.name,
      selectedModels: selectedModels,
      status: "in-progress",
      evaluationCriteria: evaluationCriteria.trim() || undefined,
      customQuestions: customQuestionObjects.length > 0 ? customQuestionObjects : undefined,
    });

    // Reset form
    setExperimentTitle("");
    setSelectedModelIds([]);
    setSelectedPoolId("");
    setEvaluationCriteria("");
    setCustomQuestionCount(0);
    setCustomQuestions([]);
    setShowToast(true);
    setIsSubmitting(false);
  };

  const selectedPool = questionPools.find(p => p.id === selectedPoolId);

  const handleCustomQuestionCountChange = (count: number) => {
    setCustomQuestionCount(count);
    // Resize the array to match the count
    const newQuestions = [...customQuestions];
    if (count > customQuestions.length) {
      // Add empty strings for new questions
      newQuestions.push(...Array(count - customQuestions.length).fill(""));
    } else {
      // Remove excess questions
      newQuestions.splice(count);
    }
    setCustomQuestions(newQuestions);
  };

  const handleCustomQuestionChange = (index: number, value: string) => {
    const newQuestions = [...customQuestions];
    newQuestions[index] = value;
    setCustomQuestions(newQuestions);
  };

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
                  Creating experiment with {selectedModelIds.length} models...
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
            <label className="block text-lg font-semibold text-foreground mb-3">
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
              <div className="space-y-2">
                {models.map((model) => (
                  <label
                    key={model.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedModelIds.includes(model.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedModelIds.includes(model.id)}
                      onCheckedChange={() => handleModelToggle(model.id)}
                      disabled={isSubmitting}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-foreground">
                          {model.name}
                        </span>
                        <Badge variant="outline">
                          {model.provider}
                        </Badge>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectedModelIds.length > 0 && (
              <div className="mt-3 text-sm text-primary">
                ✓ {selectedModelIds.length} model{selectedModelIds.length !== 1 ? 's' : ''} selected
                {selectedModelIds.length >= 2 && (
                  <span className="ml-2">
                    ({(selectedModelIds.length * (selectedModelIds.length - 1)) / 2} pairwise
                    experiment{(selectedModelIds.length * (selectedModelIds.length - 1)) / 2 !== 1 ? 's' : ''} will be created)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Question Pool Selection */}
          <div className="border-t-2 border-border pt-6">
            <label className="block text-lg font-semibold text-foreground mb-3">
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
              <RadioGroup
                value={selectedPoolId}
                onValueChange={(value) => setSelectedPoolId(value)}
                disabled={isSubmitting}
                className="space-y-2"
              >
                {questionPools.map((pool) => (
                  <label
                    key={pool.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPoolId === pool.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem
                      value={pool.id}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {pool.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {pool.questions.length} question{pool.questions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
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
              Evaluation Criteria (Optional)
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Provide guidance for judges on how to evaluate the models. For example: "Select the model that demonstrates better accuracy" or "Choose the response that is more helpful and truthful".
            </p>
            <Textarea
              placeholder="e.g., Select the model that demonstrates better accuracy in its responses"
              value={evaluationCriteria}
              onChange={(e) => setEvaluationCriteria(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Custom Questions */}
          <div className="border-t-2 border-border pt-6">
            <label className="block text-lg font-semibold text-foreground mb-3">
              Additional Questions (Optional)
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Add custom questions that will be included in this experiment in addition to the selected question pool.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                How many additional questions?
              </label>
              <Select
                value={customQuestionCount.toString()}
                onValueChange={(value) => handleCustomQuestionCountChange(parseInt(value))}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num === 0 ? "None" : `${num} question${num !== 1 ? "s" : ""}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {customQuestionCount > 0 && (
              <div className="space-y-3">
                {Array.from({ length: customQuestionCount }).map((_, index) => (
                  <Input
                    key={index}
                    label={`Question ${index + 1}`}
                    placeholder={`Enter question ${index + 1}...`}
                    value={customQuestions[index] || ""}
                    onChange={(e) => handleCustomQuestionChange(index, e.target.value)}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={
              isSubmitting ||
              selectedModelIds.length < 2 ||
              !selectedPoolId ||
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
