import React, { useState } from "react";
import { Button, Card, Toast, Textarea } from "../../components";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Progress } from "../../components/ui/progress";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Info } from "lucide-react";
import { dummyComparisons } from "../../utils/dummyData";
// TODO: Connect to actual experiments from AppContext when experiment-to-pair mapping is implemented
// import { useApp } from "../../context/AppContext";
import type { ModelPair, EvaluationOption } from "../../types";

// Dummy experiment pairs for judges to evaluate
const dummyComparisonPairs: ModelPair[] = [
  {
    id: "pair-1",
    title: "GPT-4 vs Claude 3 - Creative Writing",
    purpose:
      "Select the model that demonstrates better creative writing skills and engaging storytelling",
    model1: {
      id: "1",
      name: "Model A",
      provider: "Hidden",
      apiKey: "***",
      userId: "user1",
      createdAt: new Date("2024-01-15"),
      status: "evaluating",
    },
    model2: {
      id: "2",
      name: "Model B",
      provider: "Hidden",
      apiKey: "***",
      userId: "user2",
      createdAt: new Date("2024-01-15"),
      status: "evaluating",
    },
    prompts: [
      "Explain quantum computing in simple terms",
      "Write a short poem about artificial intelligence",
    ],
    createdAt: new Date("2024-01-15"),
    status: "in-progress",
    totalEvaluations: 2,
    completedEvaluations: 0,
  },
  {
    id: "pair-2",
    title: "Gemini vs GPT-4 - Technical Analysis",
    purpose:
      "Select the model that provides shorter and more accurate technical answers",
    model1: {
      id: "3",
      name: "Model A",
      provider: "Hidden",
      apiKey: "***",
      userId: "user3",
      createdAt: new Date("2024-01-16"),
      status: "evaluating",
    },
    model2: {
      id: "4",
      name: "Model B",
      provider: "Hidden",
      apiKey: "***",
      userId: "user4",
      createdAt: new Date("2024-01-16"),
      status: "evaluating",
    },
    prompts: [
      "What are the benefits of renewable energy?",
      "Describe the process of photosynthesis",
    ],
    createdAt: new Date("2024-01-16"),
    status: "pending",
    totalEvaluations: 2,
    completedEvaluations: 0,
  },
];

export const Judge: React.FC = () => {
  // TODO: Connect to actual experiments from AppContext when experiment-to-pair mapping is implemented
  // const { experiments } = useApp();
  const [comparisonPairs] = useState<ModelPair[]>(dummyComparisonPairs);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [selectedWinner, setSelectedWinner] = useState<
    "A" | "B" | "tie" | "both-poor" | "dont-know" | null
  >(null);
  const [showToast, setShowToast] = useState(false);
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [evaluations, setEvaluations] = useState<
    Record<string, Record<number, "A" | "B" | "tie" | "both-poor" | "dont-know">>
  >({});
  const [feedback, setFeedback] = useState<
    Record<
      string,
      Record<
        number,
        {
          commentA: string;
          commentB: string;
        }
      >
    >
  >({});

  const selectedPair = comparisonPairs.find((p) => p.id === selectedPairId);
  
  // All evaluation options are always available
  const availableOptions: EvaluationOption[] = ["A", "B", "tie", "both-poor", "dont-know"];
  const evaluationCriteria = selectedPair?.purpose;
  
  const currentPrompt = selectedPair?.prompts[currentPromptIndex];
  const currentFeedback =
    (selectedPairId &&
      feedback[selectedPairId] &&
      feedback[selectedPairId][currentPromptIndex]) || undefined;

  const handleFeedbackChange = (
    model: "A" | "B",
    value: string
  ) => {
    if (!selectedPairId) return;

    setFeedback((prev) => ({
      ...prev,
      [selectedPairId]: {
        ...(prev[selectedPairId] || {}),
        [currentPromptIndex]: {
          commentA:
            model === "A"
              ? value
              : prev[selectedPairId]?.[currentPromptIndex]?.commentA || "",
          commentB:
            model === "B"
              ? value
              : prev[selectedPairId]?.[currentPromptIndex]?.commentB || "",
        },
      },
    }));
  };

  const handleBackToList = () => {
    setSelectedPairId(null);
    setCurrentPromptIndex(0);
    setSelectedWinner(null);
  };


  const handlePrevious = () => {
    if (currentPromptIndex > 0) {
      setCurrentPromptIndex(currentPromptIndex - 1);
      const prevVote = evaluations[selectedPairId!]?.[currentPromptIndex - 1];
      setSelectedWinner(prevVote || null);
    }
  };

  const handleNext = () => {
    if (!selectedWinner || !selectedPairId) {
      setAlertMessage("Please select an option before proceeding");
      setShowAlertToast(true);
      return;
    }

    // Save evaluation before moving
    setEvaluations({
      ...evaluations,
      [selectedPairId]: {
        ...evaluations[selectedPairId],
        [currentPromptIndex]: selectedWinner,
      },
    });

    if (selectedPair && currentPromptIndex < selectedPair.prompts.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
      const nextVote = evaluations[selectedPairId]?.[currentPromptIndex + 1];
      setSelectedWinner(nextVote || null);
    } else {
      // Finished all prompts
      setShowToast(true);
      setTimeout(() => {
        handleBackToList();
      }, 1500);
    }
  };

  // List view
  if (!selectedPairId) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Judge Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Select an experiment to start evaluating
            </p>
          </div>
        </div>

        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">💡 Your Role:</span> You'll compare
            responses from two anonymous models. Select the experiment below to
            begin evaluating. Your votes help determine which models perform
            best.
          </p>
        </div>

        <Card title="Available Experiments">
          <div className="space-y-3">
            {comparisonPairs.map((pair) => {
              const pairEvaluations = evaluations[pair.id] || {};
              const completed = Object.keys(pairEvaluations).length;
              const total = pair.prompts.length;
              const progress = (completed / total) * 100;

              return (
                <div
                  key={pair.id}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedPairId(pair.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {pair.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Compare two anonymous models on {pair.prompts.length}{" "}
                        prompts
                      </p>
                      {pair.purpose && (
                        <div className="bg-primary/10 border border-primary/30 rounded px-3 py-2 mb-2">
                          <p className="text-sm text-primary">
                            <strong>📋 Evaluation Criteria:</strong>{" "}
                            {pair.purpose}
                          </p>
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        completed === total
                          ? "bg-primary/20 text-primary"
                          : completed > 0
                          ? "bg-accent/20 text-accent-foreground"
                          : "bg-muted/30 text-foreground"
                      }`}
                    >
                      {completed === total
                        ? "Completed"
                        : completed > 0
                        ? "In Progress"
                        : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">
                          {completed}/{total}
                        </span>
                      </div>
                      <Progress value={progress} className="w-full h-2" />
                    </div>
                    <Button size="sm" variant="outline">
                      {completed === 0
                        ? "Start"
                        : completed === total
                        ? "Review"
                        : "Continue"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  // Evaluation view
  if (!selectedPair) return null;

  return (
    <div className="space-y-8">
      {showToast && (
        <Toast
          message="Vote submitted successfully!"
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handleBackToList}>
            ← Back to List
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {selectedPair.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Prompt {currentPromptIndex + 1} of {selectedPair.prompts.length}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Overall Progress</div>
          <div className="text-lg font-semibold text-foreground">
            {Object.keys(evaluations[selectedPairId] || {}).length}/
            {selectedPair.prompts.length}
          </div>
        </div>
      </div>

      {evaluationCriteria && (
        <Alert className="bg-primary/10 border-primary">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-primary">
            <strong>Evaluation Criteria:</strong> {evaluationCriteria}
          </AlertDescription>
        </Alert>
      )}

        <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <span className="font-semibold">Instructions:</span> Read the prompt
          and both responses carefully.{" "}
          {evaluationCriteria
            ? "Use the evaluation criteria above to guide your decision."
            : "Select the response you believe is better based on accuracy, clarity, and helpfulness."}{" "}
          Model identities are hidden to ensure unbiased evaluation.
        </AlertDescription>
      </Alert>

      <Card title="Prompt">
        <div className="bg-muted/30 p-4 rounded-lg">
          <p className="text-foreground text-lg">{currentPrompt}</p>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-foreground mb-3">Model A</h3>
            </div>
            <div className="p-4 rounded-lg border-2 border-border bg-muted/30">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dummyComparisons[currentPromptIndex % 3]?.responseA}
              </p>
            </div>

            <div className="mt-4">
              <Textarea
                label="Optional feedback for Model A"
                placeholder="What worked well? What was missing or incorrect?"
                value={currentFeedback?.commentA || ""}
                onChange={(e) => handleFeedbackChange("A", e.target.value)}
                rows={3}
              />
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-foreground mb-3">Model B</h3>
            </div>
            <div className="p-4 rounded-lg border-2 border-border bg-muted/30">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dummyComparisons[currentPromptIndex % 3]?.responseB}
              </p>
            </div>

            <div className="mt-4">
              <Textarea
                label="Optional feedback for Model B"
                placeholder="What worked well? What was missing or incorrect?"
                value={currentFeedback?.commentB || ""}
                onChange={(e) => handleFeedbackChange("B", e.target.value)}
                rows={3}
              />
            </div>
          </Card>
        </div>

        {/* Voting Options - Dynamic based on experiment settings */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Select the Better Response
          </h3>
          <RadioGroup
            value={selectedWinner || ""}
            onValueChange={(value) => setSelectedWinner(value as EvaluationOption)}
            className={`grid grid-cols-2 gap-3 ${
              availableOptions.length === 2 ? "md:grid-cols-2" :
              availableOptions.length === 3 ? "md:grid-cols-3" :
              availableOptions.length === 4 ? "md:grid-cols-4" :
              "md:grid-cols-5"
            }`}
          >
            {availableOptions.includes("A") && (
              <label
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedWinner === "A"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="A" className="mb-2" />
                <span className="font-medium text-foreground text-center">Model A</span>
              </label>
            )}

            {availableOptions.includes("B") && (
              <label
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedWinner === "B"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="B" className="mb-2" />
                <span className="font-medium text-foreground text-center">Model B</span>
              </label>
            )}

            {availableOptions.includes("tie") && (
              <label
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedWinner === "tie"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="tie" className="mb-2" />
                <span className="font-medium text-foreground text-center">Both Good</span>
              </label>
            )}

            {availableOptions.includes("both-poor") && (
              <label
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedWinner === "both-poor"
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:border-destructive/50"
                }`}
              >
                <RadioGroupItem value="both-poor" className="mb-2 text-destructive border-destructive" />
                <span className="font-medium text-foreground text-center">Both Poor</span>
              </label>
            )}

            {availableOptions.includes("dont-know") && (
              <label
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedWinner === "dont-know"
                    ? "border-muted-foreground bg-muted/30"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <RadioGroupItem value="dont-know" className="mb-2" />
                <span className="font-medium text-foreground text-center text-sm">I don't know</span>
              </label>
            )}
          </RadioGroup>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <Button
          onClick={handlePrevious}
          variant="outline"
          disabled={currentPromptIndex === 0}
        >
          ← Previous
        </Button>

        {currentPromptIndex < selectedPair.prompts.length - 1 ? (
          <Button
            onClick={handleNext}
            size="lg"
            disabled={!selectedWinner}
          >
            Next →
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            size="lg"
            disabled={!selectedWinner}
          >
            Finish
          </Button>
        )}
      </div>

      {/* Progress indicator */}
      <Card title="Evaluation Progress">
        <div className="space-y-2">
          {selectedPair.prompts.map((prompt, idx) => {
            const voted = evaluations[selectedPairId]?.[idx];
            const getVoteLabel = (vote: string) => {
              switch (vote) {
                case "A":
                  return "✓ Model A";
                case "B":
                  return "✓ Model B";
                case "tie":
                  return "🤝 Both Equal";
                case "both-poor":
                  return "❌ Both Poor";
                case "dont-know":
                  return "❓ I don't know";
                default:
                  return "";
              }
            };

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  idx === currentPromptIndex
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30"
                }`}
              >
                <span className="text-sm text-muted-foreground">
                  Prompt {idx + 1}: {prompt.substring(0, 50)}
                  {prompt.length > 50 ? "..." : ""}
                </span>
                {voted ? (
                  <span className="text-sm font-medium text-primary">
                    {getVoteLabel(voted)}
                  </span>
                ) : idx === currentPromptIndex ? (
                  <span className="text-sm text-primary font-medium">
                    Current
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">Not voted</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
