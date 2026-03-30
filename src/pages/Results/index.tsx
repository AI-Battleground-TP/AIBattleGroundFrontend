import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Toast } from "../../components";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { ChevronDown, ChevronUp, ClipboardList, Loader2 } from "lucide-react";
import {
  getEvaluationQuestionsByExperiment,
  getExperimentModelPreferenceSummary,
  getExperiments,
  getInputPools,
  getModels,
  getPreferencesByTest,
  getQuestionById,
  getResponsesByQuestion,
  getTestsByExperiment,
  type BackendEvaluationQuestion,
  type BackendExperiment,
  type BackendExperimentModelPreferenceSummary,
  type BackendInputPool,
  type BackendModel,
  type BackendPreference,
  type BackendQuestion,
  type BackendResponseItem,
  type BackendTest,
} from "../../lib/authApi";

type ExperimentResultDetail = {
  summary: BackendExperimentModelPreferenceSummary;
  tests: BackendTest[];
  evaluationQuestions: BackendEvaluationQuestion[];
  questionMap: Record<string, BackendQuestion>;
  responsesByQuestion: Record<string, BackendResponseItem[]>;
  preferencesByTest: Record<string, BackendPreference[]>;
};

type SortOption = "newest" | "most-preferences" | "most-tests";
type StatusFilter = "ALL" | "DRAFT" | "ACTIVE" | "COMPLETED";

type QuestionGrouping = {
  questionId: string;
  questionText: string;
  testIds: string[];
  preferenceCount: number;
  modelCounts: Record<string, number>;
};

type EvaluationQuestionSummary = {
  evaluationQuestionId: string;
  evaluationQuestionText: string;
  totalPreferences: number;
  modelCounts: Record<string, number>;
};

type ModelBreakdown = {
  modelId: string;
  modelName: string;
  totalWins: number;
  totalMatchups: number;
  winShare: number;
  strongestQuestions: Array<{
    evaluationQuestionId: string;
    evaluationQuestionText: string;
    wins: number;
  }>;
};

type HeadToHeadEntry = {
  modelAId: string;
  modelBId: string;
  modelAWins: number;
  modelBWins: number;
};

const createEmptySummary = (
  experimentId: string
): BackendExperimentModelPreferenceSummary => ({
  experiment_id: experimentId,
  test_ids: [],
  total_tests: 0,
  total_preferences: 0,
  model_breakdown: [],
  top_preferred_model_ids: [],
  top_preference_count: 0,
});

const getPairKey = (modelAId: string, modelBId: string) =>
  [modelAId, modelBId].sort().join("::");

export const Results: React.FC = () => {
  const [experiments, setExperiments] = useState<BackendExperiment[]>([]);
  const [models, setModels] = useState<BackendModel[]>([]);
  const [inputPools, setInputPools] = useState<BackendInputPool[]>([]);
  const [expandedExpId, setExpandedExpId] = useState<string | null>(null);
  const [detailsByExperiment, setDetailsByExperiment] = useState<
    Record<string, ExperimentResultDetail>
  >({});
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlertToast, setShowAlertToast] = useState(false);

  const getAccessToken = () => {
    const accessToken = localStorage.getItem("bt_access_token");
    if (!accessToken) {
      throw new Error("Missing access token.");
    }
    return accessToken;
  };

  const modelMap = useMemo(
    () => Object.fromEntries(models.map((model) => [model.id, model])),
    [models]
  );

  const inputPoolMap = useMemo(
    () => Object.fromEntries(inputPools.map((pool) => [pool.id, pool])),
    [inputPools]
  );

  const getModelName = (modelId: string, detail?: ExperimentResultDetail) =>
    modelMap[modelId]?.name ||
    detail?.summary.model_breakdown.find((row) => row.model_id === modelId)?.model_name ||
    "Unknown Model";

  const getCompletionMetrics = (detail?: ExperimentResultDetail) => {
    if (!detail) {
      return {
        completed: 0,
        total: 0,
        percentage: 0,
      };
    }

    const totalRequired = detail.tests.length * detail.evaluationQuestions.length;
    const completed = detail.summary.total_preferences;
    const percentage =
      totalRequired > 0 ? Math.min((completed / totalRequired) * 100, 100) : 0;

    return {
      completed,
      total: totalRequired,
      percentage,
    };
  };

  const getExperimentModelNames = (detail?: ExperimentResultDetail) => {
    if (!detail) {
      return [];
    }

    const modelIds = new Set<string>();

    detail.tests.forEach((test) => {
      modelIds.add(test.model_a_id);
      modelIds.add(test.model_b_id);
    });

    detail.summary.model_breakdown.forEach((row) => {
      modelIds.add(row.model_id);
    });

    return [...modelIds].map((modelId) => getModelName(modelId, detail));
  };

  const buildExperimentAnalysis = (detail: ExperimentResultDetail) => {
    const questionGroupingMap = new Map<string, QuestionGrouping>();
    const evaluationQuestionSummaryMap = new Map<string, EvaluationQuestionSummary>();
    const headToHeadMap = new Map<string, HeadToHeadEntry>();
    const modelIds = new Set<string>();

    detail.evaluationQuestions.forEach((question) => {
      evaluationQuestionSummaryMap.set(question.id, {
        evaluationQuestionId: question.id,
        evaluationQuestionText: question.evaluation_question,
        totalPreferences: 0,
        modelCounts: {},
      });
    });

    detail.tests.forEach((test) => {
      modelIds.add(test.model_a_id);
      modelIds.add(test.model_b_id);

      const grouping = questionGroupingMap.get(test.question_id) || {
        questionId: test.question_id,
        questionText:
          detail.questionMap[test.question_id]?.text || "Question text not found.",
        testIds: [],
        preferenceCount: 0,
        modelCounts: {},
      };

      grouping.testIds.push(test.id);

      const preferences = detail.preferencesByTest[test.id] || [];
      preferences.forEach((preference) => {
        grouping.preferenceCount += 1;
        grouping.modelCounts[preference.preferred_model_id] =
          (grouping.modelCounts[preference.preferred_model_id] || 0) + 1;

        const evalSummary =
          evaluationQuestionSummaryMap.get(preference.evaluation_question_id) || {
            evaluationQuestionId: preference.evaluation_question_id,
            evaluationQuestionText:
              detail.evaluationQuestions.find(
                (item) => item.id === preference.evaluation_question_id
              )?.evaluation_question || "Unknown Evaluation Question",
            totalPreferences: 0,
            modelCounts: {},
          };

        evalSummary.totalPreferences += 1;
        evalSummary.modelCounts[preference.preferred_model_id] =
          (evalSummary.modelCounts[preference.preferred_model_id] || 0) + 1;
        evaluationQuestionSummaryMap.set(preference.evaluation_question_id, evalSummary);
      });

      questionGroupingMap.set(test.question_id, grouping);

      const pairKey = getPairKey(test.model_a_id, test.model_b_id);
      const sortedPair = [test.model_a_id, test.model_b_id].sort();
      const existingPair = headToHeadMap.get(pairKey) || {
        modelAId: sortedPair[0],
        modelBId: sortedPair[1],
        modelAWins: 0,
        modelBWins: 0,
      };

      preferences.forEach((preference) => {
        if (preference.preferred_model_id === existingPair.modelAId) {
          existingPair.modelAWins += 1;
        } else if (preference.preferred_model_id === existingPair.modelBId) {
          existingPair.modelBWins += 1;
        }
      });

      headToHeadMap.set(pairKey, existingPair);
    });

    detail.summary.model_breakdown.forEach((row) => {
      modelIds.add(row.model_id);
    });

    const evaluationQuestionSummaries = [...evaluationQuestionSummaryMap.values()].sort(
      (a, b) => b.totalPreferences - a.totalPreferences
    );

    const modelBreakdown = [...modelIds]
      .map((modelId) => {
        const totalWins = Object.values(detail.preferencesByTest).reduce(
          (sum, preferences) =>
            sum +
            preferences.filter(
              (preference) => preference.preferred_model_id === modelId
            ).length,
          0
        );

        const totalMatchups = detail.tests.reduce((sum, test) => {
          if (test.model_a_id === modelId || test.model_b_id === modelId) {
            return sum + (detail.preferencesByTest[test.id] || []).length;
          }
          return sum;
        }, 0);

        const strongestQuestions = evaluationQuestionSummaries
          .map((summary) => ({
            evaluationQuestionId: summary.evaluationQuestionId,
            evaluationQuestionText: summary.evaluationQuestionText,
            wins: summary.modelCounts[modelId] || 0,
          }))
          .filter((item) => item.wins > 0)
          .sort((a, b) => b.wins - a.wins)
          .slice(0, 3);

        return {
          modelId,
          modelName: getModelName(modelId, detail),
          totalWins,
          totalMatchups,
          winShare: totalMatchups > 0 ? (totalWins / totalMatchups) * 100 : 0,
          strongestQuestions,
        } satisfies ModelBreakdown;
      })
      .sort((a, b) => b.totalWins - a.totalWins);

    const questionGroups = [...questionGroupingMap.values()].sort(
      (a, b) => b.preferenceCount - a.preferenceCount
    );

    const headToHeadEntries = [...headToHeadMap.values()].sort(
      (a, b) => a.modelAId.localeCompare(b.modelAId) || a.modelBId.localeCompare(b.modelBId)
    );

    const matrixModelIds = [...modelIds].sort((a, b) =>
      getModelName(a, detail).localeCompare(getModelName(b, detail))
    );

    return {
      questionGroups,
      evaluationQuestionSummaries,
      modelBreakdown,
      headToHeadEntries,
      matrixModelIds,
    };
  };

  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const accessToken = getAccessToken();
      const [experimentRows, modelRows, poolRows] = await Promise.all([
        getExperiments(accessToken),
        getModels(accessToken),
        getInputPools(accessToken),
      ]);

      const overviewEntries = await Promise.all(
        experimentRows.map(async (experiment) => {
          try {
            const [summary, tests, evaluationQuestions] = await Promise.all([
              getExperimentModelPreferenceSummary(accessToken, experiment.id),
              getTestsByExperiment(accessToken, experiment.id),
              getEvaluationQuestionsByExperiment(accessToken, experiment.id),
            ]);

            return [
              experiment.id,
              {
                summary,
                tests,
                evaluationQuestions,
                questionMap: {},
                responsesByQuestion: {},
                preferencesByTest: {},
              } satisfies ExperimentResultDetail,
            ] as const;
          } catch {
            return [
              experiment.id,
              {
                summary: createEmptySummary(experiment.id),
                tests: [],
                evaluationQuestions: [],
                questionMap: {},
                responsesByQuestion: {},
                preferencesByTest: {},
              } satisfies ExperimentResultDetail,
            ] as const;
          }
        })
      );

      setExperiments(experimentRows);
      setModels(modelRows);
      setInputPools(poolRows);
      setDetailsByExperiment(Object.fromEntries(overviewEntries));
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Results could not be loaded."
      );
      setShowAlertToast(true);
      setExperiments([]);
      setDetailsByExperiment({});
    } finally {
      setIsLoadingOverview(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const loadExperimentDetail = async (experimentId: string) => {
    const existing = detailsByExperiment[experimentId];
    const hasDeepDetail =
      !!existing &&
      (existing.tests.length === 0 ||
        (Object.keys(existing.questionMap).length > 0 &&
          Object.keys(existing.preferencesByTest).length > 0));

    if (hasDeepDetail) {
      return;
    }

    setLoadingDetailId(experimentId);
    try {
      const accessToken = getAccessToken();
      const baseDetail = existing;
      const tests =
        baseDetail?.tests || (await getTestsByExperiment(accessToken, experimentId));
      const evaluationQuestions =
        baseDetail?.evaluationQuestions ||
        (await getEvaluationQuestionsByExperiment(accessToken, experimentId));
      const summary =
        baseDetail?.summary ||
        (await getExperimentModelPreferenceSummary(accessToken, experimentId));

      const uniqueQuestionIds = [...new Set(tests.map((test) => test.question_id))];
      const [questionEntries, responseEntries, preferenceEntries] = await Promise.all([
        Promise.all(
          uniqueQuestionIds.map(async (questionId) => [
            questionId,
            await getQuestionById(accessToken, questionId),
          ] as const)
        ),
        Promise.all(
          uniqueQuestionIds.map(async (questionId) => [
            questionId,
            await getResponsesByQuestion(accessToken, questionId),
          ] as const)
        ),
        Promise.all(
          tests.map(async (test) => [
            test.id,
            await getPreferencesByTest(accessToken, test.id),
          ] as const)
        ),
      ]);

      setDetailsByExperiment((prev) => ({
        ...prev,
        [experimentId]: {
          summary,
          tests,
          evaluationQuestions,
          questionMap: Object.fromEntries(questionEntries),
          responsesByQuestion: Object.fromEntries(responseEntries),
          preferencesByTest: Object.fromEntries(preferenceEntries),
        },
      }));
    } catch (error) {
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "Experiment results could not be loaded."
      );
      setShowAlertToast(true);
    } finally {
      setLoadingDetailId((current) => (current === experimentId ? null : current));
    }
  };

  const handleToggleExperiment = async (experimentId: string) => {
    if (expandedExpId === experimentId) {
      setExpandedExpId(null);
      return;
    }

    setExpandedExpId(experimentId);
    await loadExperimentDetail(experimentId);
  };

  const filteredExperiments = useMemo(() => {
    const loweredSearch = searchTerm.trim().toLowerCase();
    const items = experiments.filter((experiment) => {
      const detail = detailsByExperiment[experiment.id];
      const matchesStatus =
        statusFilter === "ALL" || experiment.status === statusFilter;
      const modelNames = getExperimentModelNames(detail);
      const matchesSearch =
        loweredSearch.length === 0 ||
        experiment.name.toLowerCase().includes(loweredSearch) ||
        modelNames.some((name) => name.toLowerCase().includes(loweredSearch));

      return matchesStatus && matchesSearch;
    });

    return [...items].sort((left, right) => {
      const leftDetail = detailsByExperiment[left.id];
      const rightDetail = detailsByExperiment[right.id];

      if (sortBy === "most-preferences") {
        return (
          (rightDetail?.summary.total_preferences || 0) -
          (leftDetail?.summary.total_preferences || 0)
        );
      }

      if (sortBy === "most-tests") {
        return (
          (rightDetail?.summary.total_tests || 0) -
          (leftDetail?.summary.total_tests || 0)
        );
      }

      return (
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
    });
  }, [detailsByExperiment, experiments, searchTerm, sortBy, statusFilter]);

  const visibleSummary = useMemo(() => {
    const totalBlindTests = filteredExperiments.reduce(
      (sum, experiment) => sum + (detailsByExperiment[experiment.id]?.summary.total_tests || 0),
      0
    );
    const totalPreferences = filteredExperiments.reduce(
      (sum, experiment) =>
        sum + (detailsByExperiment[experiment.id]?.summary.total_preferences || 0),
      0
    );
    const averageCompletion =
      filteredExperiments.length > 0
        ? filteredExperiments.reduce((sum, experiment) => {
            const completion = getCompletionMetrics(detailsByExperiment[experiment.id]);
            return sum + completion.percentage;
          }, 0) / filteredExperiments.length
        : 0;

    return {
      totalBlindTests,
      totalPreferences,
      averageCompletion,
    };
  }, [detailsByExperiment, filteredExperiments]);

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
          <h1 className="text-3xl font-bold text-foreground">Results</h1>
          <p className="text-muted-foreground mt-1">
            View, filter, and compare experiment outcomes in detail
          </p>
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong>About Results:</strong> Filter experiments by name, status, or
          model, sort them by key activity metrics, and inspect performance by
          question, evaluation criterion, model breakdown, and head-to-head matchups.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Visible Experiments</p>
            <p className="text-3xl font-bold text-primary">
              {filteredExperiments.length}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Visible Blind Tests</p>
            <p className="text-3xl font-bold text-primary">
              {visibleSummary.totalBlindTests}
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Avg Completion</p>
            <p className="text-3xl font-bold text-accent-foreground">
              {Math.round(visibleSummary.averageCompletion)}%
            </p>
          </div>
        </Card>
      </div>

      <Card title="Filters And Sorting">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Search"
            placeholder="Search by experiment or model name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-0"
          />
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Status</p>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Sort By</p>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="most-preferences">Most Votes</SelectItem>
                <SelectItem value="most-tests">Most Blind Tests</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card title={`Your Experiments (${filteredExperiments.length})`}>
        {isLoadingOverview ? (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin" />
            <p className="text-lg font-medium">Loading experiments...</p>
          </div>
        ) : filteredExperiments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="mb-4">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium">No matching experiments</p>
            <p className="mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExperiments.map((experiment) => {
              const detail = detailsByExperiment[experiment.id];
              const isLoadingDetail = loadingDetailId === experiment.id;
              const questionPoolName =
                inputPoolMap[experiment.input_pool_id]?.name || "Unknown Question Pool";
              const completion = getCompletionMetrics(detail);
              const modelNames = getExperimentModelNames(detail);
              const topRows =
                detail?.summary.model_breakdown.filter((row) =>
                  detail.summary.top_preferred_model_ids.includes(row.model_id)
                ) || [];
              const topBadgeLabel =
                topRows.length > 0
                  ? `${topRows.map((row) => row.model_name).join(", ")} (${Math.round(
                      topRows[0].share_of_total * 100
                    )}%)`
                  : "No preferences yet";
              const hasDeepDetail =
                !!detail &&
                (detail.tests.length === 0 ||
                  (Object.keys(detail.questionMap).length > 0 &&
                    Object.keys(detail.preferencesByTest).length > 0));
              const analysis = hasDeepDetail && detail ? buildExperimentAnalysis(detail) : null;

              return (
                <div
                  key={experiment.id}
                  className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border-b border-border">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold text-foreground">
                            {experiment.name}
                          </h3>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              experiment.status === "COMPLETED"
                                ? "bg-primary/20 text-primary"
                                : "bg-accent/20 text-accent-foreground"
                            }`}
                          >
                            {experiment.status}
                          </span>
                          <Badge variant="secondary">Top Model: {topBadgeLabel}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Question Pool: <strong>{questionPoolName}</strong>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(experiment.created_at).toLocaleString()}
                        </p>
                        {experiment.evaluation_criteria && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Criteria: {experiment.evaluation_criteria}
                          </p>
                        )}
                        {modelNames.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {modelNames.map((modelName) => (
                              <Badge key={`${experiment.id}-${modelName}`} variant="outline">
                                {modelName}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="w-full lg:w-[320px] space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                          <div className="rounded-lg border border-border bg-background px-3 py-2">
                            <p className="text-xs text-muted-foreground">Blind Tests</p>
                            <p className="text-lg font-semibold text-foreground">
                              {detail?.summary.total_tests || 0}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-background px-3 py-2">
                            <p className="text-xs text-muted-foreground">Votes</p>
                            <p className="text-lg font-semibold text-foreground">
                              {detail?.summary.total_preferences || 0}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-background px-3 py-2">
                            <p className="text-xs text-muted-foreground">Questions</p>
                            <p className="text-lg font-semibold text-foreground">
                              {detail?.evaluationQuestions.length || 0}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border bg-background px-3 py-3">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Completion Status</span>
                            <span className="font-medium text-foreground">
                              {completion.completed}/{completion.total || 0}
                            </span>
                          </div>
                          <Progress value={completion.percentage} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleToggleExperiment(experiment.id)}
                      className="w-full"
                    >
                      {isLoadingDetail ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading Detailed Results...
                        </>
                      ) : expandedExpId === experiment.id ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide Detailed Results
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View Detailed Results
                        </>
                      )}
                    </Button>
                  </div>

                  {expandedExpId === experiment.id && (
                    <div className="p-4 bg-card text-card-foreground border-t border-border">
                      {!detail || !analysis ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                          Loading experiment details...
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid gap-4 xl:grid-cols-2">
                            <Card title="Model Preference Summary">
                              {detail.summary.model_breakdown.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No preferences have been recorded for this experiment yet.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {detail.summary.model_breakdown.map((row, index) => (
                                    <div
                                      key={row.model_id}
                                      className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3"
                                    >
                                      <div>
                                        <p className="font-medium text-foreground">
                                          {index + 1}. {row.model_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {Math.round(row.share_of_total * 100)}% of all
                                          recorded preferences
                                        </p>
                                      </div>
                                      <Badge variant="secondary">
                                        {row.preference_count} vote
                                        {row.preference_count !== 1 ? "s" : ""}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Card>

                            <Card title="Per Evaluation Question Summary">
                              {analysis.evaluationQuestionSummaries.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No evaluation-question-level preferences yet.
                                </p>
                              ) : (
                                <div className="space-y-4">
                                  {analysis.evaluationQuestionSummaries.map((summary) => (
                                    <div
                                      key={summary.evaluationQuestionId}
                                      className="rounded-lg border border-border p-4"
                                    >
                                      <div className="flex items-center justify-between gap-3 mb-3">
                                        <p className="font-medium text-foreground">
                                          {summary.evaluationQuestionText}
                                        </p>
                                        <Badge variant="outline">
                                          {summary.totalPreferences} vote
                                          {summary.totalPreferences !== 1 ? "s" : ""}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(summary.modelCounts)
                                          .sort((a, b) => b[1] - a[1])
                                          .map(([modelId, count]) => (
                                            <Badge
                                              key={`${summary.evaluationQuestionId}-${modelId}`}
                                              variant="secondary"
                                            >
                                              {getModelName(modelId, detail)}: {count}
                                            </Badge>
                                          ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Card>
                          </div>

                          <Card title="Question-Level Grouping">
                            {analysis.questionGroups.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No question-level comparisons available yet.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {analysis.questionGroups.map((group, index) => {
                                  const leadingEntries = Object.entries(group.modelCounts).sort(
                                    (a, b) => b[1] - a[1]
                                  );
                                  const leader = leadingEntries[0];

                                  return (
                                    <div
                                      key={group.questionId}
                                      className="rounded-lg border border-border p-4"
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex-1">
                                          <p className="text-sm text-muted-foreground mb-1">
                                            Question {index + 1}
                                          </p>
                                          <p className="text-sm whitespace-pre-wrap text-foreground">
                                            {group.questionText}
                                          </p>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                          <Badge variant="outline">
                                            {group.testIds.length} blind test
                                            {group.testIds.length !== 1 ? "s" : ""}
                                          </Badge>
                                          <Badge variant="outline">
                                            {group.preferenceCount} vote
                                            {group.preferenceCount !== 1 ? "s" : ""}
                                          </Badge>
                                          <Badge variant="secondary">
                                            Lead:{" "}
                                            {leader
                                              ? `${getModelName(leader[0], detail)} (${leader[1]})`
                                              : "No leader yet"}
                                          </Badge>
                                        </div>
                                      </div>

                                      <div className="mt-4 flex flex-wrap gap-2">
                                        {leadingEntries.length === 0 ? (
                                          <span className="text-sm text-muted-foreground">
                                            No votes recorded for this question yet.
                                          </span>
                                        ) : (
                                          leadingEntries.map(([modelId, count]) => (
                                            <Badge
                                              key={`${group.questionId}-${modelId}`}
                                              variant="secondary"
                                            >
                                              {getModelName(modelId, detail)}: {count}
                                            </Badge>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </Card>

                          <Card title="Per Model Breakdown">
                            {analysis.modelBreakdown.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No model-level breakdown available yet.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {analysis.modelBreakdown.map((entry) => (
                                  <div
                                    key={entry.modelId}
                                    className="rounded-lg border border-border p-4"
                                  >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                      <div>
                                        <p className="text-lg font-semibold text-foreground">
                                          {entry.modelName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {entry.totalWins} total wins across{" "}
                                          {entry.totalMatchups} recorded preferences
                                        </p>
                                      </div>
                                      <Badge variant="secondary">
                                        Win Share: {Math.round(entry.winShare)}%
                                      </Badge>
                                    </div>
                                    <div className="mt-4">
                                      <p className="text-sm font-medium text-foreground mb-2">
                                        Strongest Evaluation Questions
                                      </p>
                                      {entry.strongestQuestions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          No wins recorded for this model yet.
                                        </p>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {entry.strongestQuestions.map((question) => (
                                            <Badge
                                              key={`${entry.modelId}-${question.evaluationQuestionId}`}
                                              variant="outline"
                                            >
                                              {question.evaluationQuestionText}: {question.wins}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card>

                          <Card title="Head-To-Head Matrix">
                            {analysis.matrixModelIds.length < 2 ? (
                              <p className="text-sm text-muted-foreground">
                                At least two compared models are required to build a matrix.
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead>Model</TableHead>
                                    {analysis.matrixModelIds.map((modelId) => (
                                      <TableHead key={`head-${modelId}`}>
                                        {getModelName(modelId, detail)}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {analysis.matrixModelIds.map((rowModelId) => (
                                    <TableRow key={`row-${rowModelId}`}>
                                      <TableCell className="font-medium">
                                        {getModelName(rowModelId, detail)}
                                      </TableCell>
                                      {analysis.matrixModelIds.map((colModelId) => {
                                        if (rowModelId === colModelId) {
                                          return (
                                            <TableCell
                                              key={`${rowModelId}-${colModelId}`}
                                              className="text-muted-foreground"
                                            >
                                              -
                                            </TableCell>
                                          );
                                        }

                                        const pair = analysis.headToHeadEntries.find(
                                          (entry) =>
                                            getPairKey(entry.modelAId, entry.modelBId) ===
                                            getPairKey(rowModelId, colModelId)
                                        );

                                        let cellText = "0 - 0";
                                        if (pair) {
                                          const rowWins =
                                            pair.modelAId === rowModelId
                                              ? pair.modelAWins
                                              : pair.modelBWins;
                                          const colWins =
                                            pair.modelAId === rowModelId
                                              ? pair.modelBWins
                                              : pair.modelAWins;
                                          cellText = `${rowWins} - ${colWins}`;
                                        }

                                        return (
                                          <TableCell key={`${rowModelId}-${colModelId}`}>
                                            {cellText}
                                          </TableCell>
                                        );
                                      })}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </Card>

                          <Card title={`Blind Tests (${detail.tests.length})`}>
                            {detail.tests.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No blind tests have been created for this experiment yet.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {detail.tests.map((test, index) => {
                                  const question =
                                    detail.questionMap[test.question_id]?.text ||
                                    "Question text not found.";
                                  const responsesForQuestion =
                                    detail.responsesByQuestion[test.question_id] || [];
                                  const modelAResponse = responsesForQuestion.find(
                                    (response) =>
                                      response.experiment_id === experiment.id &&
                                      response.model_id === test.model_a_id
                                  );
                                  const modelBResponse = responsesForQuestion.find(
                                    (response) =>
                                      response.experiment_id === experiment.id &&
                                      response.model_id === test.model_b_id
                                  );
                                  const preferences =
                                    detail.preferencesByTest[test.id] || [];
                                  const modelAVotes = preferences.filter(
                                    (preference) =>
                                      preference.preferred_model_id === test.model_a_id
                                  ).length;
                                  const modelBVotes = preferences.filter(
                                    (preference) =>
                                      preference.preferred_model_id === test.model_b_id
                                  ).length;
                                  const modelAName = getModelName(test.model_a_id, detail);
                                  const modelBName = getModelName(test.model_b_id, detail);

                                  return (
                                    <div
                                      key={test.id}
                                      className="rounded-lg border border-border p-4"
                                    >
                                      <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                          <h4 className="text-lg font-semibold text-foreground">
                                            Blind Test {index + 1}
                                          </h4>
                                          <p className="text-sm text-muted-foreground">
                                            {new Date(test.created_at).toLocaleString()}
                                          </p>
                                        </div>
                                        <div className="flex gap-2">
                                          <Badge variant="outline">{modelAName}</Badge>
                                          <Badge variant="outline">{modelBName}</Badge>
                                        </div>
                                      </div>

                                      <div className="mb-4 rounded-lg bg-muted/30 p-4">
                                        <p className="text-sm font-semibold text-muted-foreground mb-2">
                                          Prompt
                                        </p>
                                        <p className="text-sm whitespace-pre-wrap text-foreground">
                                          {question}
                                        </p>
                                      </div>

                                      <div className="grid gap-4 md:grid-cols-2">
                                        <div className="rounded-lg border border-border bg-primary/5 p-4">
                                          <p className="mb-2 text-sm font-semibold text-foreground">
                                            {modelAName}
                                          </p>
                                          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                            {modelAResponse?.model_response ||
                                              "Response not found."}
                                          </p>
                                        </div>
                                        <div className="rounded-lg border border-border bg-primary/5 p-4">
                                          <p className="mb-2 text-sm font-semibold text-foreground">
                                            {modelBName}
                                          </p>
                                          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                            {modelBResponse?.model_response ||
                                              "Response not found."}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                                          <p className="text-xs text-muted-foreground">
                                            Votes for {modelAName}
                                          </p>
                                          <p className="text-xl font-semibold text-foreground">
                                            {modelAVotes}
                                          </p>
                                        </div>
                                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                                          <p className="text-xs text-muted-foreground">
                                            Votes for {modelBName}
                                          </p>
                                          <p className="text-xl font-semibold text-foreground">
                                            {modelBVotes}
                                          </p>
                                        </div>
                                      </div>

                                      {detail.evaluationQuestions.length > 0 && (
                                        <div className="mt-4 rounded-lg border border-border bg-muted/10 p-4">
                                          <p className="mb-3 text-sm font-semibold text-foreground">
                                            Recorded Preferences
                                          </p>
                                          <div className="space-y-2">
                                            {detail.evaluationQuestions.map((questionItem) => {
                                              const matchingPreference = preferences.find(
                                                (preference) =>
                                                  preference.evaluation_question_id ===
                                                  questionItem.id
                                              );
                                              const preferredModelName =
                                                matchingPreference
                                                  ? getModelName(
                                                      matchingPreference.preferred_model_id,
                                                      detail
                                                    )
                                                  : "No preference saved";

                                              return (
                                                <div
                                                  key={questionItem.id}
                                                  className="flex items-start justify-between gap-4 text-sm"
                                                >
                                                  <span className="text-muted-foreground">
                                                    {questionItem.evaluation_question}
                                                  </span>
                                                  <span className="font-medium text-foreground text-right">
                                                    {preferredModelName}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

