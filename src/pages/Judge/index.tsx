import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Toast, Textarea } from "../../components";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  createPreference,
  drawBlindTest,
  getActiveExperiments,
  getActiveJudgeExperiments,
  getEvaluationQuestionsByExperiment,
  type BackendDrawBlindTestResponse,
  type BackendEvaluationQuestion,
  type BackendExperiment,
} from "../../lib/authApi";
import type { EvaluationOption } from "../../types";

type TestSelections = Record<string, EvaluationOption>;
type SavedEvaluation = Record<string, TestSelections>;
type FeedbackEntry = { commentA: string; commentB: string };

const renderInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return parts
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={`${part}-${index}`}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.95em]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={`${part}-${index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>
        );
      }

      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    });
};

const MarkdownResponse: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    const paragraphText = paragraphLines.join(" ").trim();
    if (paragraphText) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="leading-7 text-foreground">
          {renderInlineMarkdown(paragraphText)}
        </p>
      );
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(
      <ul
        key={`ul-${blocks.length}`}
        className="list-disc space-y-2 pl-5 leading-7 text-foreground"
      >
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} className="border-border" />);
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();

      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const className =
        level === 1
          ? "text-lg font-semibold text-foreground"
          : level === 2
            ? "text-base font-semibold text-foreground"
            : "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

      blocks.push(
        <div key={`h-${blocks.length}`} className={className}>
          {renderInlineMarkdown(headingText)}
        </div>
      );
      return;
    }

    const listMatch = trimmed.match(/^([-*]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[2]);
      return;
    }

    paragraphLines.push(trimmed);
  });

  flushParagraph();
  flushList();

  return <div className="space-y-4 text-sm">{blocks}</div>;
};

export const Judge: React.FC = () => {
  const { user } = useAuth();
  const [backendExperiments, setBackendExperiments] = useState<BackendExperiment[]>([]);
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(true);
  const [isLoadingBlindTest, setIsLoadingBlindTest] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [currentBlindTest, setCurrentBlindTest] = useState<BackendDrawBlindTestResponse | null>(null);
  const [evaluationQuestions, setEvaluationQuestions] = useState<BackendEvaluationQuestion[]>([]);
  const [draftSelections, setDraftSelections] = useState<SavedEvaluation>({});
  const [showToast, setShowToast] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [evaluations, setEvaluations] = useState<SavedEvaluation>({});
  const [feedback, setFeedback] = useState<Record<string, FeedbackEntry>>({});
  const [drawnTestsByExperiment, setDrawnTestsByExperiment] = useState<
    Record<string, BackendDrawBlindTestResponse[]>
  >({});
  const responsesSectionRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToResponsesRef = useRef(false);

  const selectedExperiment = useMemo(
    () => backendExperiments.find((experiment) => experiment.id === selectedExperimentId) || null,
    [backendExperiments, selectedExperimentId]
  );

  const availableOptions: EvaluationOption[] = ["A", "B", "tie", "both-poor", "dont-know"];
  const currentTestId = currentBlindTest?.test.id ?? null;
  const currentFeedback = currentTestId ? feedback[currentTestId] : undefined;
  const savedSelectionsForCurrentTest = currentTestId ? evaluations[currentTestId] || {} : {};
  const draftSelectionsForCurrentTest = currentTestId ? draftSelections[currentTestId] || {} : {};
  const isCurrentTestSaved =
    currentTestId !== null &&
    evaluationQuestions.length > 0 &&
    evaluationQuestions.every(
      (question) => savedSelectionsForCurrentTest[question.id] !== undefined
    );
  const sessionDrawsForExperiment =
    (selectedExperimentId && drawnTestsByExperiment[selectedExperimentId]) || [];
  const sessionSavedCount = sessionDrawsForExperiment.filter(
    (draw) => {
      const savedSelections = evaluations[draw.test.id] || {};
      return (
        evaluationQuestions.length > 0 &&
        evaluationQuestions.every(
          (question) => savedSelections[question.id] !== undefined
        )
      );
    }
  ).length;

  const getAccessToken = () => {
    const accessToken = localStorage.getItem("bt_access_token");
    if (!accessToken) {
      throw new Error("Missing access token.");
    }
    return accessToken;
  };

  const handleFeedbackChange = (model: "A" | "B", value: string) => {
    if (!currentTestId || isCurrentTestSaved) {
      return;
    }

    setFeedback((prev) => ({
      ...prev,
      [currentTestId]: {
        commentA: model === "A" ? value : prev[currentTestId]?.commentA || "",
        commentB: model === "B" ? value : prev[currentTestId]?.commentB || "",
      },
    }));
  };

  const appendDrawnTest = (experimentId: string, draw: BackendDrawBlindTestResponse) => {
    setDrawnTestsByExperiment((prev) => {
      const existing = prev[experimentId] || [];
      if (existing.some((item) => item.test.id === draw.test.id)) {
        return prev;
      }
      return {
        ...prev,
        [experimentId]: [...existing, draw],
      };
    });
  };

  const loadExperiments = async () => {
    try {
      const accessToken = getAccessToken();
      const rows =
        user?.isHead
          ? await getActiveExperiments(accessToken)
          : await getActiveJudgeExperiments(accessToken);
      setBackendExperiments(rows);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Experiments could not be loaded."
      );
      setShowAlertToast(true);
      setBackendExperiments([]);
    } finally {
      setIsLoadingExperiments(false);
    }
  };

  useEffect(() => {
    setIsLoadingExperiments(true);
    loadExperiments();
  }, [user?.isHead]);

  useEffect(() => {
    if (!currentBlindTest || !shouldScrollToResponsesRef.current) {
      return;
    }

    shouldScrollToResponsesRef.current = false;
    requestAnimationFrame(() => {
      responsesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [currentBlindTest]);

  const openExperiment = async (experiment: BackendExperiment) => {
    setIsLoadingBlindTest(true);
    setAlertMessage("");
    setShowAlertToast(false);
    try {
      const accessToken = getAccessToken();
      const [draw, questions] = await Promise.all([
        drawBlindTest(accessToken, experiment.id),
        getEvaluationQuestionsByExperiment(accessToken, experiment.id),
      ]);

      setSelectedExperimentId(experiment.id);
      setEvaluationQuestions(questions);
      setCurrentBlindTest(draw);
      appendDrawnTest(experiment.id, draw);
    } catch (error) {
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "Experiment details could not be loaded."
      );
      setShowAlertToast(true);
    } finally {
      setIsLoadingBlindTest(false);
    }
  };

  const handleBackToList = () => {
    setSelectedExperimentId(null);
    setCurrentBlindTest(null);
    setEvaluationQuestions([]);
  };

  const handleSave = async () => {
    if (!currentTestId) {
      return;
    }
    if (isCurrentTestSaved) {
      return;
    }
    const selections = draftSelectionsForCurrentTest;
    const missingSelections = evaluationQuestions.filter(
      (question) => selections[question.id] === undefined
    );
    if (missingSelections.length > 0) {
      setAlertMessage("Please answer all evaluation questions before saving.");
      setShowAlertToast(true);
      return;
    }
    if (evaluationQuestions.length === 0) {
      setAlertMessage("No evaluation questions found for this experiment.");
      setShowAlertToast(true);
      return;
    }
    setIsSavingPreference(true);
    try {
      const accessToken = getAccessToken();
      const modelPreferenceQuestions = evaluationQuestions.filter((question) => {
        const selection = selections[question.id];
        return selection === "A" || selection === "B";
      });

      await Promise.all(
        modelPreferenceQuestions.map((question) =>
          createPreference(accessToken, {
            evaluation_question_id: question.id,
            test_id: currentTestId,
            preferred_model_id:
              selections[question.id] === "A"
                ? currentBlindTest!.test.model_a_id
                : currentBlindTest!.test.model_b_id,
          })
        )
      );

      setEvaluations((prev) => ({
        ...prev,
        [currentTestId]: selections,
      }));
    } catch (error) {
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "Preference could not be saved."
      );
      setShowAlertToast(true);
      return;
    } finally {
      setIsSavingPreference(false);
    }
    setShowSaveToast(true);
  };

  const handleNext = async () => {
    if (!selectedExperimentId || !currentTestId) {
      return;
    }

    if (evaluations[currentTestId] === undefined) {
      setAlertMessage("Please save your evaluation before continuing.");
      setShowAlertToast(true);
      return;
    }

    setIsLoadingBlindTest(true);
    try {
      const accessToken = getAccessToken();
      const draw = await drawBlindTest(accessToken, selectedExperimentId);
      shouldScrollToResponsesRef.current = true;
      setCurrentBlindTest(draw);
      appendDrawnTest(selectedExperimentId, draw);
      setShowToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "A new blind test could not be drawn."
      );
      setShowAlertToast(true);
    } finally {
      setIsLoadingBlindTest(false);
    }
  };

  if (!selectedExperimentId) {
    return (
      <div className="space-y-8">
        {showAlertToast && (
          <Toast
            message={alertMessage}
            type="error"
            onClose={() => setShowAlertToast(false)}
          />
        )}

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
            random blind responses from active experiments in your organization.
          </p>
        </div>

        <Card title="Available Experiments">
          {isLoadingExperiments ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading experiments...
            </div>
          ) : backendExperiments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No active experiments available for this account.
            </div>
          ) : (
            <div className="space-y-3">
              {backendExperiments.map((experiment) => {
                const drawn = drawnTestsByExperiment[experiment.id] || [];
                const saved = drawn.filter(
                  (item) => evaluations[item.test.id] !== undefined
                ).length;

                return (
                  <button
                    key={experiment.id}
                    type="button"
                    className="w-full border border-border rounded-lg p-4 text-left hover:border-primary/50 hover:shadow-md transition-all"
                    onClick={() => openExperiment(experiment)}
                    disabled={isLoadingBlindTest}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {experiment.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Created: {new Date(experiment.created_at).toLocaleString()}
                        </p>
                        {experiment.evaluation_criteria && (
                          <div className="bg-primary/10 border border-primary/30 rounded px-3 py-2 mb-2">
                            <p className="text-sm text-primary">
                              <strong>Evaluation Criteria:</strong>{" "}
                              {experiment.evaluation_criteria}
                            </p>
                          </div>
                        )}
                        {drawn.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Session progress: {saved}/{drawn.length} blind tests saved
                          </p>
                        )}
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                        {experiment.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (!selectedExperiment || !currentBlindTest) {
    return null;
  }

  return (
    <div className="space-y-8">
      {showToast && (
        <Toast
          message="Blind test loaded."
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
      {showSaveToast && (
        <Toast
          message="Evaluation saved."
          type="success"
          onClose={() => setShowSaveToast(false)}
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
              {selectedExperiment.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Current blind test: {currentBlindTest.test.id}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Session Progress</div>
          <div className="text-lg font-semibold text-foreground">
            {sessionSavedCount}/{sessionDrawsForExperiment.length}
          </div>
        </div>
      </div>

      {selectedExperiment.evaluation_criteria && (
        <Alert className="bg-primary/10 border-primary">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-primary">
            <strong>Evaluation Criteria:</strong>{" "}
            {selectedExperiment.evaluation_criteria}
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <span className="font-semibold">Instructions:</span> Read both blind
          responses carefully and make your selection based on the question and
          evaluation criteria below.
        </AlertDescription>
      </Alert>

      <Card title="Question">
        <div className="bg-muted/30 p-4 rounded-lg">
          <p className="text-foreground text-lg whitespace-pre-wrap">
            {currentBlindTest.question_text}
          </p>
        </div>
      </Card>

      <div className="space-y-6" ref={responsesSectionRef}>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-foreground mb-3">Model A</h3>
            </div>
            <div className="max-h-[42rem] overflow-y-auto rounded-lg border-2 border-border bg-muted/30 p-4">
              <MarkdownResponse content={currentBlindTest.response_a.model_response} />
            </div>

            <div className="mt-4">
              <Textarea
                label="Optional feedback for Model A"
                placeholder="What worked well? What was missing or incorrect?"
                value={currentFeedback?.commentA || ""}
                onChange={(e) => handleFeedbackChange("A", e.target.value)}
                rows={3}
                disabled={isCurrentTestSaved}
              />
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-foreground mb-3">Model B</h3>
            </div>
            <div className="max-h-[42rem] overflow-y-auto rounded-lg border-2 border-border bg-muted/30 p-4">
              <MarkdownResponse content={currentBlindTest.response_b.model_response} />
            </div>

            <div className="mt-4">
              <Textarea
                label="Optional feedback for Model B"
                placeholder="What worked well? What was missing or incorrect?"
                value={currentFeedback?.commentB || ""}
                onChange={(e) => handleFeedbackChange("B", e.target.value)}
                rows={3}
                disabled={isCurrentTestSaved}
              />
            </div>
          </Card>
        </div>

        <Card title="Evaluation Questions">
          <div className="space-y-6">
            {evaluationQuestions.map((question, index) => {
              const displayVote =
                savedSelectionsForCurrentTest[question.id] ??
                draftSelectionsForCurrentTest[question.id] ??
                "";

              return (
                <div key={question.id} className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {index + 1}. {question.evaluation_question}
                  </h3>
                  <RadioGroup
                    value={displayVote}
                    onValueChange={(value) => {
                      if (isCurrentTestSaved || !currentTestId) return;
                      setDraftSelections((prev) => ({
                        ...prev,
                        [currentTestId]: {
                          ...(prev[currentTestId] || {}),
                          [question.id]: value as EvaluationOption,
                        },
                      }));
                    }}
                    disabled={isCurrentTestSaved}
                    className={`grid grid-cols-2 gap-3 ${
                      availableOptions.length === 2
                        ? "md:grid-cols-2"
                        : availableOptions.length === 3
                          ? "md:grid-cols-3"
                          : availableOptions.length === 4
                            ? "md:grid-cols-4"
                            : "md:grid-cols-5"
                    }`}
                  >
                    {availableOptions.map((option) => {
                      const isSelected = displayVote === option;
                      const destructive = option === "both-poor";
                      const optionLabel =
                        option === "A"
                          ? "Model A"
                          : option === "B"
                            ? "Model B"
                            : option === "tie"
                              ? "Both Good"
                              : option === "both-poor"
                                ? "Both Poor"
                                : "I don't know";

                      return (
                        <label
                          key={`${question.id}-${option}`}
                          className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                            isCurrentTestSaved
                              ? "cursor-not-allowed opacity-90"
                              : "cursor-pointer"
                          } ${
                            isSelected
                              ? destructive
                                ? "border-destructive bg-destructive/10"
                                : option === "dont-know"
                                  ? "border-muted-foreground bg-muted/30"
                                  : "border-primary bg-primary/10"
                              : destructive
                                ? "border-border hover:border-destructive/50"
                                : option === "dont-know"
                                  ? "border-border hover:border-muted-foreground/50"
                                  : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem
                            value={option}
                            className={`mb-2 ${destructive ? "text-destructive border-destructive" : ""}`}
                            disabled={isCurrentTestSaved}
                          />
                          <span className="font-medium text-foreground text-center text-sm">
                            {optionLabel}
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="flex justify-end items-center gap-3">
        <Button
          onClick={handleSave}
          variant="outline"
          size="lg"
          disabled={
            evaluationQuestions.length === 0 ||
            isCurrentTestSaved ||
            isSavingPreference
          }
        >
          {isSavingPreference ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button onClick={handleNext} size="lg" disabled={!isCurrentTestSaved || isLoadingBlindTest}>
          {isLoadingBlindTest ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Next →"
          )}
        </Button>
      </div>

      <Card title="Session Progress">
        <div className="space-y-2">
          {sessionDrawsForExperiment.map((draw, index) => {
            const savedSelections = evaluations[draw.test.id] || {};
            const answeredCount = Object.keys(savedSelections).length;
            return (
              <div
                key={draw.test.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  draw.test.id === currentBlindTest.test.id
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30"
                }`}
              >
                <span className="text-sm text-muted-foreground">
                  Blind Test {index + 1}: {draw.test.id}
                </span>
                {answeredCount > 0 ? (
                  <span className="text-sm font-medium text-primary">
                    {answeredCount} question{answeredCount !== 1 ? "s" : ""} saved
                  </span>
                ) : draw.test.id === currentBlindTest.test.id ? (
                  <span className="text-sm text-primary font-medium">Current</span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">Not saved</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
