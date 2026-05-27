import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Toast } from "../../components";
import { Badge } from "../../components/ui/badge";
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
  removeModelFromExperiment,
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

type SortOption = "newest" | "most-preferences";
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
  criteriaBreakdown: Array<{
    evaluationQuestionId: string;
    evaluationQuestionText: string;
    wins: number;
    totalPreferences: number;
    percentage: number;
  }>;
};

type HeadToHeadEntry = {
  modelAId: string;
  modelBId: string;
  modelAWins: number;
  modelBWins: number;
};

type FailedResponseDetail = {
  testId: string;
  modelId: string;
  modelName: string;
  questionText: string;
  reason?: string;
  error?: string;
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

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
};

const getPercentage = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;

const formatPercentage = (value: number) =>
  `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toFiniteNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const extractRunSummary = (experiment: BackendExperiment) => {
  const metadata = isObjectRecord(experiment.metadata_json) ? experiment.metadata_json : null;
  const lastRun = metadata && isObjectRecord(metadata.last_run) ? metadata.last_run : null;
  const totals = lastRun && isObjectRecord(lastRun.totals) ? lastRun.totals : null;
  const responsesSummary =
    metadata && isObjectRecord(metadata.responses_summary) ? metadata.responses_summary : null;

  return {
    successCount: toFiniteNumber(totals?.created, 0),
    failCount: toFiniteNumber(totals?.failed, 0),
    totalCostUsd: toFiniteNumber(responsesSummary?.total_cost_usd, 0),
  };
};

const extractRecentFailures = (experiment: BackendExperiment) => {
  const metadata = isObjectRecord(experiment.metadata_json) ? experiment.metadata_json : null;
  const lastRun = metadata && isObjectRecord(metadata.last_run) ? metadata.last_run : null;
  const recentFailures =
    lastRun && Array.isArray(lastRun.recent_failures) ? lastRun.recent_failures : [];

  return recentFailures.filter(isObjectRecord).map((item) => ({
    modelId: typeof item.model_id === "string" ? item.model_id : "",
    questionId: typeof item.question_id === "string" ? item.question_id : "",
    reason: typeof item.reason === "string" ? item.reason : undefined,
    error: typeof item.error === "string" ? item.error : undefined,
  }));
};

export const Results: React.FC = () => {
  const [experiments, setExperiments] = useState<BackendExperiment[]>([]);
  const [models, setModels] = useState<BackendModel[]>([]);
  const [inputPools, setInputPools] = useState<BackendInputPool[]>([]);
  const [expandedExpId, setExpandedExpId] = useState<string | null>(null);
  const [expandedQuestionExplorerByExperiment, setExpandedQuestionExplorerByExperiment] =
    useState<Record<string, boolean>>({});
  const [expandedQuestionByExperiment, setExpandedQuestionByExperiment] = useState<
    Record<string, string | null>
  >({});
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
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [expandedFailureDetailsByExperiment, setExpandedFailureDetailsByExperiment] =
    useState<Record<string, boolean>>({});
  const [removingModelKey, setRemovingModelKey] = useState<string | null>(null);

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

        const criteriaBreakdown = detail.evaluationQuestions.map((question) => {
          const summary = evaluationQuestionSummaryMap.get(question.id);
          const wins = summary?.modelCounts[modelId] || 0;
          const totalPreferences = summary?.totalPreferences || 0;

          return {
            evaluationQuestionId: question.id,
            evaluationQuestionText: question.evaluation_question,
            wins,
            totalPreferences,
            percentage: getPercentage(wins, totalPreferences),
          };
        });

        return {
          modelId,
          modelName: getModelName(modelId, detail),
          totalWins,
          totalMatchups,
          criteriaBreakdown,
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
    const experimentRow = experiments.find((item) => item.id === experimentId);
    const failedQuestionIdsFromMetadata =
      experimentRow
        ? extractRecentFailures(experimentRow)
            .map((item) => item.questionId)
            .filter(Boolean)
        : [];
    const missingFailedQuestionIds =
      existing && failedQuestionIdsFromMetadata.length > 0
        ? failedQuestionIdsFromMetadata.filter((questionId) => !existing.questionMap[questionId])
        : [];
    const hasDeepDetail =
      !!existing &&
      (existing.tests.length === 0 ||
        (Object.keys(existing.questionMap).length > 0 &&
          Object.keys(existing.preferencesByTest).length > 0)) &&
      missingFailedQuestionIds.length === 0;

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

      const uniqueQuestionIds = [
        ...new Set([
          ...tests.map((test) => test.question_id),
          ...failedQuestionIdsFromMetadata,
        ]),
      ];
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
      setExpandedQuestionByExperiment((prev) => ({
        ...prev,
        [experimentId]: null,
      }));
      return;
    }

    setExpandedExpId(experimentId);
    await loadExperimentDetail(experimentId);
  };

  const handleToggleQuestion = (experimentId: string, questionId: string) => {
    setExpandedQuestionByExperiment((prev) => ({
      ...prev,
      [experimentId]: prev[experimentId] === questionId ? null : questionId,
    }));
  };

  const handleToggleQuestionExplorer = (experimentId: string) => {
    setExpandedQuestionExplorerByExperiment((prev) => ({
      ...prev,
      [experimentId]: !(prev[experimentId] ?? false),
    }));
  };

  const handleToggleFailureDetails = async (experimentId: string) => {
    const willExpand = !(expandedFailureDetailsByExperiment[experimentId] ?? false);
    if (willExpand) {
      await loadExperimentDetail(experimentId);
    }
    setExpandedFailureDetailsByExperiment((prev) => ({
      ...prev,
      [experimentId]: willExpand,
    }));
  };

  const handleRemoveModelFromExperiment = async (
    experimentId: string,
    modelId: string,
    modelName: string
  ) => {
    if (
      !window.confirm(
        `Remove "${modelName}" from this experiment?\n\nIts related responses, tests, and preferences will be deleted.`
      )
    ) {
      return;
    }

    const accessToken = getAccessToken();
    const actionKey = `${experimentId}:${modelId}`;
    setRemovingModelKey(actionKey);
    try {
      await removeModelFromExperiment(accessToken, experimentId, modelId);
      await loadOverview();
      if (expandedExpId === experimentId) {
        await loadExperimentDetail(experimentId);
      }
      setSuccessMessage(`"${modelName}" was removed from the experiment.`);
      setShowSuccessToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Model could not be removed from experiment."
      );
      setShowAlertToast(true);
    } finally {
      setRemovingModelKey(null);
    }
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

      return (
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
    });
  }, [detailsByExperiment, experiments, searchTerm, sortBy, statusFilter]);

  return (
    <div className="space-y-8">
      {showSuccessToast && (
        <Toast
          message={successMessage}
          type="success"
          onClose={() => setShowSuccessToast(false)}
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

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Visible Experiments</p>
            <p className="text-3xl font-bold text-primary">
              {filteredExperiments.length}
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
              const runSummary = extractRunSummary(experiment);
              const isLoadingDetail = loadingDetailId === experiment.id;
              const questionPoolName =
                inputPoolMap[experiment.input_pool_id]?.name || "Unknown Question Pool";
              const modelNames = getExperimentModelNames(detail);
              const topRows =
                detail?.summary.model_breakdown.filter((row) =>
                  detail.summary.top_preferred_model_ids.includes(row.model_id)
                ) || [];
              const topBadgeLabel =
                topRows.length > 0
                  ? `${topRows.map((row) => row.model_name).join(", ")} (${formatPercentage(
                      topRows[0].share_of_total * 100
                    )} overall)`
                  : "No preferences yet";
              const hasDeepDetail =
                !!detail &&
                (detail.tests.length === 0 ||
                  (Object.keys(detail.questionMap).length > 0 &&
                    Object.keys(detail.preferencesByTest).length > 0));
              const analysis = hasDeepDetail && detail ? buildExperimentAnalysis(detail) : null;
              const isQuestionExplorerExpanded =
                expandedQuestionExplorerByExperiment[experiment.id] ?? false;
              const isFailureDetailsExpanded =
                expandedFailureDetailsByExperiment[experiment.id] ?? false;
              const expandedQuestionId = expandedQuestionByExperiment[experiment.id] || null;
              const testNumberById = detail
                ? Object.fromEntries(detail.tests.map((test, index) => [test.id, index + 1]))
                : {};
              const failedResponseDetails: FailedResponseDetail[] = extractRecentFailures(
                experiment
              ).map((item, index) => {
                const linkedTest = detail?.tests.find(
                  (test) =>
                    test.question_id === item.questionId &&
                    (test.model_a_id === item.modelId || test.model_b_id === item.modelId)
                );

                return {
                  testId: linkedTest?.id || `recent-failure-${index}`,
                  modelId: item.modelId,
                  modelName: item.modelId
                    ? getModelName(item.modelId, detail)
                    : "Unknown model",
                  questionText: item.questionId
                    ? detail?.questionMap[item.questionId]?.text || `Question ID: ${item.questionId}`
                    : "Unknown question",
                  reason: item.reason,
                  error: item.error,
                };
              });

              return (
                <div
                  key={experiment.id}
                  className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold text-foreground">
                            {experiment.name}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
                          <p className="mt-1 text-sm text-muted-foreground">
                            Criteria: {experiment.evaluation_criteria}
                          </p>
                        )}
                        {modelNames.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(detail?.summary.model_breakdown || []).map((row) => {
                              const actionKey = `${experiment.id}:${row.model_id}`;
                              const isRemoving = removingModelKey === actionKey;
                              return (
                                <div
                                  key={`${experiment.id}-${row.model_id}`}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1"
                                >
                                  <Badge variant="outline">{row.model_name}</Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs"
                                    disabled={isRemoving}
                                    onClick={() =>
                                      void handleRemoveModelFromExperiment(
                                        experiment.id,
                                        row.model_id,
                                        row.model_name
                                      )
                                    }
                                  >
                                    {isRemoving ? "Removing..." : "Remove"}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="w-full space-y-4 xl:w-[340px]">
                        <div className="grid gap-3">
                          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                            <p className="text-xs text-muted-foreground">
                              Total Evaluation Question
                            </p>
                            <p className="text-lg font-semibold text-foreground">
                              {detail?.summary.total_tests || 0}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                            <p className="text-xs text-muted-foreground">Run Summary</p>
                            <p className="text-sm font-medium text-foreground">
                              {runSummary.successCount} success · {runSummary.failCount} fail
                            </p>
                            {runSummary.failCount > 0 && (
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleToggleFailureDetails(experiment.id)}
                                  className="w-full"
                                >
                                  {isFailureDetailsExpanded ? "Hide details" : "More details"}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                            <p className="text-xs text-muted-foreground">Estimated Cost</p>
                            <p className="text-sm font-medium text-foreground">
                              ${runSummary.totalCostUsd.toFixed(6)}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant={expandedExpId === experiment.id ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => void handleToggleExperiment(experiment.id)}
                          className="w-full"
                        >
                          {isLoadingDetail ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading detailed view...
                            </>
                          ) : expandedExpId === experiment.id ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Show Less Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show More Details
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {isFailureDetailsExpanded && runSummary.failCount > 0 && (
                      <section className="mt-5 rounded-xl border border-border bg-background p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-foreground">Failed Responses</h4>
                          <Badge variant="secondary">{failedResponseDetails.length}</Badge>
                        </div>
                        {failedResponseDetails.length === 0 ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Could not map failures to a specific model/question from current result data.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {failedResponseDetails.map((item, index) => (
                              <div
                                key={`${item.testId}-${item.modelId}-${index}`}
                                className="rounded-lg border border-border bg-muted/20 p-4"
                              >
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {item.modelName}
                                    </p>
                                    {item.reason && (
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        Reason: {item.reason}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm text-foreground">{item.questionText}</p>
                                    {item.error && (
                                      <p className="text-sm text-destructive">
                                        Error: {item.error}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                  </div>

                  {expandedExpId === experiment.id && (
                    <div className="border-t border-border bg-muted/20 px-5 py-5 text-card-foreground">
                      {!detail || !analysis ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                          Loading experiment details...
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                            <section className="rounded-xl border border-border bg-background p-4">
                              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <h4 className="font-semibold text-foreground">
                                    Performance Snapshot
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    Compact ranking of the compared models for this experiment.
                                  </p>
                                </div>
                                <Badge variant="secondary">
                                  {analysis.modelBreakdown.length} model
                                  {analysis.modelBreakdown.length !== 1 ? "s" : ""}
                                </Badge>
                              </div>

                              {analysis.modelBreakdown.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No preferences have been recorded for this experiment yet.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {analysis.modelBreakdown.map((entry, index) => {
                                    const summaryRow = detail.summary.model_breakdown.find(
                                      (row) => row.model_id === entry.modelId
                                    );
                                    const overallPreferenceShare = summaryRow
                                      ? summaryRow.share_of_total * 100
                                      : getPercentage(
                                          entry.totalWins,
                                          detail.summary.total_preferences
                                        );

                                    return (
                                      <div
                                        key={entry.modelId}
                                        className="rounded-lg border border-border bg-muted/20 px-4 py-3"
                                      >
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                          <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                                #{index + 1}
                                              </span>
                                              <p className="font-medium text-foreground">
                                                {entry.modelName}
                                              </p>
                                              <Badge variant="outline">
                                                {summaryRow?.preference_count ?? entry.totalWins} vote
                                                {(summaryRow?.preference_count ?? entry.totalWins) !==
                                                1
                                                  ? "s"
                                                  : ""}
                                              </Badge>
                                              <Badge variant="secondary">
                                                Overall {formatPercentage(overallPreferenceShare)}
                                              </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                              {entry.totalWins} total preference
                                              {entry.totalWins !== 1 ? "s" : ""} across this
                                              experiment
                                            </p>
                                          </div>

                                          {entry.criteriaBreakdown.length > 0 && (
                                            <div className="space-y-2 lg:min-w-[320px]">
                                              {entry.criteriaBreakdown.map((question) => (
                                                <div
                                                  key={`${entry.modelId}-${question.evaluationQuestionId}`}
                                                  className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm"
                                                >
                                                  <span className="text-muted-foreground">
                                                    {question.evaluationQuestionText}
                                                  </span>
                                                  <span className="font-medium text-foreground">
                                                    {formatPercentage(question.percentage)}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </section>

                            <div className="space-y-4">
                              <section className="rounded-xl border border-border bg-background p-4">
                                <div className="mb-4 flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-semibold text-foreground">
                                      Evaluation Criteria
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      See which model leads each judging criterion.
                                    </p>
                                  </div>
                                </div>

                                {analysis.evaluationQuestionSummaries.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No evaluation-question-level preferences yet.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {analysis.evaluationQuestionSummaries.map((summary) => {
                                      const leader = Object.entries(summary.modelCounts).sort(
                                        (left, right) => right[1] - left[1]
                                      )[0];
                                      const leaderPercentage = leader
                                        ? getPercentage(leader[1], summary.totalPreferences)
                                        : 0;

                                      return (
                                        <div
                                          key={summary.evaluationQuestionId}
                                          className="rounded-lg border border-border bg-muted/20 px-4 py-3"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="font-medium text-foreground">
                                                {summary.evaluationQuestionText}
                                              </p>
                                              <p className="mt-1 text-sm text-muted-foreground">
                                                {leader
                                                  ? `${getModelName(leader[0], detail)} leads with ${leader[1]} vote${
                                                      leader[1] !== 1 ? "s" : ""
                                                    } • ${formatPercentage(leaderPercentage)}`
                                                  : "No saved preference for this criterion yet."}
                                              </p>
                                            </div>
                                            <Badge variant="outline">
                                              {summary.totalPreferences} vote
                                              {summary.totalPreferences !== 1 ? "s" : ""}
                                            </Badge>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </section>
                            </div>
                          </div>

                          <section className="rounded-xl border border-border bg-background p-4">
                            <div className="mb-4">
                              <h4 className="font-semibold text-foreground">
                                Head-To-Head Matrix
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Each cell shows `row model wins / column model wins`.
                              </p>
                            </div>

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

                                        let rowWins = 0;
                                        let colWins = 0;
                                        if (pair) {
                                          rowWins =
                                            pair.modelAId === rowModelId
                                              ? pair.modelAWins
                                              : pair.modelBWins;
                                          colWins =
                                            pair.modelAId === rowModelId
                                              ? pair.modelBWins
                                              : pair.modelAWins;
                                        }

                                        return (
                                          <TableCell key={`${rowModelId}-${colModelId}`}>
                                            <div className="text-sm font-medium text-foreground">
                                              {rowWins} / {colWins}
                                            </div>
                                          </TableCell>
                                        );
                                      })}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </section>

                          <section className="overflow-hidden rounded-xl border border-border bg-background">
                            <button
                              type="button"
                              onClick={() => handleToggleQuestionExplorer(experiment.id)}
                              className="flex w-full flex-col gap-2 border-b border-border px-4 py-4 text-left transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  Question Explorer
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Click a prompt to inspect only that question&apos;s blind tests and
                                  recorded preferences.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {analysis.questionGroups.length} question
                                  {analysis.questionGroups.length !== 1 ? "s" : ""}
                                </Badge>
                                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                                  {isQuestionExplorerExpanded ? (
                                    <>
                                      Hide
                                      <ChevronUp className="h-4 w-4" />
                                    </>
                                  ) : (
                                    <>
                                      Show
                                      <ChevronDown className="h-4 w-4" />
                                    </>
                                  )}
                                </span>
                              </div>
                            </button>

                            {isQuestionExplorerExpanded &&
                              (analysis.questionGroups.length === 0 ? (
                                <div className="px-4 py-6">
                                  <p className="text-sm text-muted-foreground">
                                    No question-level comparisons available yet.
                                  </p>
                                </div>
                              ) : (
                                <div className="divide-y divide-border">
                                {analysis.questionGroups.map((group, index) => {
                                  const leadingEntries = Object.entries(group.modelCounts).sort(
                                    (a, b) => b[1] - a[1]
                                  );
                                  const leader = leadingEntries[0];
                                  const leaderPercentage = leader
                                    ? getPercentage(leader[1], group.preferenceCount)
                                    : 0;
                                  const isQuestionExpanded =
                                    expandedQuestionId === group.questionId;
                                  const testsForQuestion = group.testIds
                                    .map((testId) =>
                                      detail.tests.find((test) => test.id === testId)
                                    )
                                    .filter((test): test is BackendTest => Boolean(test));
                                  const questionPreferences = testsForQuestion.flatMap(
                                    (test) => detail.preferencesByTest[test.id] || []
                                  );

                                  return (
                                    <div key={group.questionId}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleQuestion(experiment.id, group.questionId)
                                        }
                                        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/30 md:flex-row md:items-start md:justify-between"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                              Question {index + 1}
                                            </span>
                                            {leader && (
                                              <Badge variant="secondary">
                                                {getModelName(leader[0], detail)} leads
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-foreground">
                                            {isQuestionExpanded
                                              ? group.questionText
                                              : truncateText(group.questionText, 220)}
                                          </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                          <Badge variant="outline">
                                            {group.testIds.length} blind test
                                            {group.testIds.length !== 1 ? "s" : ""}
                                          </Badge>
                                          <Badge variant="outline">
                                            {group.preferenceCount} vote
                                            {group.preferenceCount !== 1 ? "s" : ""}
                                          </Badge>
                                          <Badge variant="secondary">
                                            {leader
                                              ? `${getModelName(leader[0], detail)} (${formatPercentage(
                                                  leaderPercentage
                                                )})`
                                              : "No leader yet"}
                                          </Badge>
                                          <span className="flex items-center gap-1 text-sm font-medium text-primary">
                                            {isQuestionExpanded ? (
                                              <>
                                                Hide
                                                <ChevronUp className="h-4 w-4" />
                                              </>
                                            ) : (
                                              <>
                                                Inspect
                                                <ChevronDown className="h-4 w-4" />
                                              </>
                                            )}
                                          </span>
                                        </div>
                                      </button>

                                      {isQuestionExpanded && (
                                        <div className="border-t border-border bg-muted/10 px-4 py-4">
                                          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
                                            <div className="space-y-4">
                                              <div className="rounded-lg border border-border bg-background p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                  Prompt
                                                </p>
                                                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                                                  {group.questionText}
                                                </p>
                                              </div>

                                              <div className="rounded-lg border border-border bg-background p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                  <p className="text-sm font-semibold text-foreground">
                                                    Vote distribution
                                                  </p>
                                                  <Badge variant="outline">
                                                    {group.preferenceCount} vote
                                                    {group.preferenceCount !== 1 ? "s" : ""}
                                                  </Badge>
                                                </div>

                                                {leadingEntries.length === 0 ? (
                                                  <p className="mt-3 text-sm text-muted-foreground">
                                                    No votes recorded for this question yet.
                                                  </p>
                                                ) : (
                                                  <div className="mt-3 flex flex-wrap gap-2">
                                                    {leadingEntries.map(([modelId, count]) => (
                                                      <Badge
                                                        key={`${group.questionId}-${modelId}`}
                                                        variant="secondary"
                                                      >
                                                        {getModelName(modelId, detail)}: {count} (
                                                        {formatPercentage(
                                                          getPercentage(
                                                            count,
                                                            group.preferenceCount
                                                          )
                                                        )}
                                                        )
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                              {detail.evaluationQuestions.length > 0 && (
                                                <div className="rounded-lg border border-border bg-background p-4">
                                                  <p className="text-sm font-semibold text-foreground">
                                                    Criteria outcomes for this question
                                                  </p>
                                                  <div className="mt-3 space-y-2">
                                                    {detail.evaluationQuestions.map(
                                                      (questionItem) => {
                                                        const matchingPreferences =
                                                          questionPreferences.filter(
                                                            (preference) =>
                                                              preference.evaluation_question_id ===
                                                              questionItem.id
                                                          );
                                                        const criterionLeader = Object.entries(
                                                          matchingPreferences.reduce<
                                                            Record<string, number>
                                                          >((acc, preference) => {
                                                            acc[preference.preferred_model_id] =
                                                              (acc[
                                                                preference.preferred_model_id
                                                              ] || 0) + 1;
                                                            return acc;
                                                          }, {})
                                                        ).sort((left, right) => right[1] - left[1])[0];
                                                        const criterionLeaderPercentage =
                                                          criterionLeader
                                                            ? getPercentage(
                                                                criterionLeader[1],
                                                                matchingPreferences.length
                                                              )
                                                            : 0;

                                                        return (
                                                          <div
                                                            key={questionItem.id}
                                                            className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm"
                                                          >
                                                            <span className="text-muted-foreground">
                                                              {questionItem.evaluation_question}
                                                            </span>
                                                            <span className="text-right font-medium text-foreground">
                                                              {criterionLeader
                                                                ? `${getModelName(
                                                                    criterionLeader[0],
                                                                    detail
                                                                  )} (${criterionLeader[1]} • ${formatPercentage(
                                                                    criterionLeaderPercentage
                                                                  )})`
                                                                : "No preference saved"}
                                                            </span>
                                                          </div>
                                                        );
                                                      }
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            <div className="space-y-3">
                                              {testsForQuestion.length === 0 ? (
                                                <div className="rounded-lg border border-border bg-background p-4">
                                                  <p className="text-sm text-muted-foreground">
                                                    No blind tests are grouped under this question
                                                    yet.
                                                  </p>
                                                </div>
                                              ) : (
                                                testsForQuestion.map((test) => {
                                                  const responsesForQuestion =
                                                    detail.responsesByQuestion[test.question_id] ||
                                                    [];
                                                  const modelAResponse =
                                                    responsesForQuestion.find(
                                                      (response) =>
                                                        response.experiment_id === experiment.id &&
                                                        response.model_id === test.model_a_id
                                                    );
                                                  const modelBResponse =
                                                    responsesForQuestion.find(
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
                                                  const modelAName = getModelName(
                                                    test.model_a_id,
                                                    detail
                                                  );
                                                  const modelBName = getModelName(
                                                    test.model_b_id,
                                                    detail
                                                  );

                                                  return (
                                                    <div
                                                      key={test.id}
                                                      className="rounded-xl border border-border bg-background p-4"
                                                    >
                                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                        <div>
                                                          <h5 className="font-semibold text-foreground">
                                                            Blind Test{" "}
                                                            {testNumberById[test.id] || 0}
                                                          </h5>
                                                          <p className="text-sm text-muted-foreground">
                                                            {new Date(
                                                              test.created_at
                                                            ).toLocaleString()}
                                                          </p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                          <Badge variant="outline">
                                                            {modelAName}
                                                          </Badge>
                                                          <Badge variant="outline">
                                                            {modelBName}
                                                          </Badge>
                                                          <Badge variant="secondary">
                                                            {modelAVotes} - {modelBVotes}
                                                          </Badge>
                                                        </div>
                                                      </div>

                                                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                                                          <div className="mb-2 flex items-center justify-between gap-3">
                                                            <p className="text-sm font-semibold text-foreground">
                                                              {modelAName}
                                                            </p>
                                                            <span className="text-xs text-muted-foreground">
                                                              {modelAVotes} vote
                                                              {modelAVotes !== 1 ? "s" : ""}
                                                            </span>
                                                          </div>
                                                          <div className="max-h-52 overflow-y-auto pr-1">
                                                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                                              {modelAResponse?.model_response ||
                                                                "Response not found."}
                                                            </p>
                                                          </div>
                                                        </div>

                                                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                                                          <div className="mb-2 flex items-center justify-between gap-3">
                                                            <p className="text-sm font-semibold text-foreground">
                                                              {modelBName}
                                                            </p>
                                                            <span className="text-xs text-muted-foreground">
                                                              {modelBVotes} vote
                                                              {modelBVotes !== 1 ? "s" : ""}
                                                            </span>
                                                          </div>
                                                          <div className="max-h-52 overflow-y-auto pr-1">
                                                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                                              {modelBResponse?.model_response ||
                                                                "Response not found."}
                                                            </p>
                                                          </div>
                                                        </div>
                                                      </div>

                                                      {detail.evaluationQuestions.length > 0 && (
                                                        <div className="mt-4 rounded-lg border border-border bg-muted/10 p-4">
                                                          <p className="mb-3 text-sm font-semibold text-foreground">
                                                            Recorded Preferences
                                                          </p>
                                                          <div className="grid gap-2 md:grid-cols-2">
                                                            {detail.evaluationQuestions.map(
                                                              (questionItem) => {
                                                                const matchingPreference =
                                                                  preferences.find(
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
                                                                    className="rounded-lg border border-border/70 bg-background px-3 py-3 text-sm"
                                                                  >
                                                                    <p className="text-muted-foreground">
                                                                      {
                                                                        questionItem.evaluation_question
                                                                      }
                                                                    </p>
                                                                    <p className="mt-1 font-medium text-foreground">
                                                                      {preferredModelName}
                                                                    </p>
                                                                  </div>
                                                                );
                                                              }
                                                            )}
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                </div>
                              ))}
                          </section>
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
