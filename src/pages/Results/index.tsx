import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Textarea, Toast } from "../../components";
import { Badge } from "../../components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
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
  deleteExperimentPreference,
  archiveExperiment,
  attachModelToExperiment,
  exportExperiment,
  getEvaluationQuestionsByExperiment,
  getExperimentModelAppearanceSummary,
  getExperimentModelPreferenceSummary,
  getExperimentModelRatings,
  getExperimentModelTokenUsage,
  getExperimentEvaluationQuestionRatings,
  getExperimentCategoryRatings,
  getArchivedExperiments,
  getExperiments,
  getInputPools,
  getModels,
  getPreferencesByTest,
  getQuestionById,
  getResponsesByQuestion,
  getTestsByExperiment,
  removeModelFromExperiment,
  retryExperimentModelResponses,
  stopExperiment,
  type BackendEvaluationQuestion,
  type BackendExperiment,
  type BackendExperimentModelAppearanceSummary,
  type BackendExperimentModelRatingRow,
  type BackendExperimentModelRatingsSummary,
  type BackendExperimentModelPreferenceSummary,
  type BackendExperimentModelTokenUsageSummary,
  type BackendEvaluationQuestionRatingSummary,
  type BackendCategoryRatingSummary,
  type BackendInputPool,
  type BackendModel,
  type BackendPreference,
  type BackendQuestion,
  type BackendResponseItem,
  type BackendTest,
} from "../../lib/authApi";

type ExperimentResultDetail = {
  summary: BackendExperimentModelPreferenceSummary;
  ratings: BackendExperimentModelRatingsSummary | null;
  questionRatings: BackendEvaluationQuestionRatingSummary[] | null;
  categoryRatings: BackendCategoryRatingSummary[] | null;
  appearanceByModel: Record<string, BackendExperimentModelAppearanceSummary>;
  tokenUsage: BackendExperimentModelTokenUsageSummary | null;
  tests: BackendTest[];
  evaluationQuestions: BackendEvaluationQuestion[];
  questionMap: Record<string, BackendQuestion>;
  responsesByQuestion: Record<string, BackendResponseItem[]>;
  preferencesByTest: Record<string, BackendPreference[]>;
};

type SortOption = "newest" | "most-preferences";
type StatusFilter = "ALL" | "IN_PROGRESS" | "COMPLETED";
type ResultTab = "overview" | "pairwise" | "questions" | "feedbacks" | "judge-questions" | "categories" | "diagnostics";

type QuestionGrouping = {
  questionId: string;
  questionText: string;
  testIds: string[];
  preferenceCount: number;
  modelCounts: Record<string, number>;
  bothGoodCount: number;
  bothPoorCount: number;
};

type EvaluationQuestionSummary = {
  evaluationQuestionId: string;
  evaluationQuestionText: string;
  totalPreferences: number;
  modelCounts: Record<string, number>;
  bothGoodCount: number;
  bothPoorCount: number;
};

type ModelBreakdown = {
  modelId: string;
  modelName: string;
  eloRating: number | null;
  totalWins: number;
  totalMatchups: number;
  ratingGamesPlayed: number;
  ratingWins: number;
  ratingLosses: number;
  ratingDraws: number;
  qualityPenalty: number;
  backendAppearanceCount: number;
  backendSelectionRate: number;
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

type FailedModelState = {
  modelId: string;
  failedQuestionIds: string[];
  totalFailCount: number;
  retryStatus: "idle" | "in_progress";
};

type QuestionPairGroup = {
  pairKey: string;
  modelAId: string;
  modelBId: string;
  modelAName: string;
  modelBName: string;
  tests: BackendTest[];
  preferences: BackendPreference[];
  modelAResponse?: BackendResponseItem;
  modelBResponse?: BackendResponseItem;
  modelAVotes: number;
  modelBVotes: number;
  bothGoodVotes: number;
  bothPoorVotes: number;
  modelAScore: number;
  modelBScore: number;
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

const createEmptyRatingsSummary = (
  experimentId: string
): BackendExperimentModelRatingsSummary => ({
  experiment_id: experimentId,
  initial_rating: 1000,
  k_factor: 0,
  both_poor_penalty: 0,
  model_ratings: [],
});

const createEmptyTokenUsageSummary = (
  experimentId: string
): BackendExperimentModelTokenUsageSummary => ({
  experiment_id: experimentId,
  total_responses: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0,
  reasoning_tokens: null,
  cached_tokens: null,
  total_cost_usd: null,
  model_breakdown: [],
});

const isEmptyPreferenceSummary = (summary: BackendExperimentModelPreferenceSummary) =>
  summary.total_tests === 0 &&
  summary.total_preferences === 0 &&
  summary.model_breakdown.length === 0;

const getDetailPreferenceCount = (detail?: ExperimentResultDetail) => {
  if (!detail) {
    return 0;
  }

  if (detail.summary.total_preferences > 0) {
    return detail.summary.total_preferences;
  }

  return Object.values(detail.preferencesByTest).reduce(
    (sum, preferences) => sum + preferences.length,
    0
  );
};

const getDetailTestCount = (detail?: ExperimentResultDetail) => {
  if (!detail) {
    return 0;
  }

  if (detail.summary.total_tests > 0) {
    return detail.summary.total_tests;
  }

  return detail.tests.length;
};

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

const formatRatioAsPercentage = (value: number) => formatPercentage(value * 100);

const formatVoteLabel = (value: number) => `${value} win${value === 1 ? "" : "s"}`;

const formatEloRating = (value: number | null | undefined) =>
  value === null || value === undefined ? "Not rated yet" : Math.round(value).toString();

const formatInteger = (value: number) => new Intl.NumberFormat().format(value);

const formatUsd = (value: number | null | undefined) =>
  value === null || value === undefined ? "? cost" : `$${value.toFixed(2)}`;

const normalizeExperimentStatus = (status: string) => {
  const lowered = status.toLowerCase();
  if (lowered === "in-progress" || lowered === "in_progress" || lowered === "active") {
    return "IN_PROGRESS";
  }
  if (lowered === "completed") {
    return "COMPLETED";
  }
  if (lowered === "archived") {
    return "ARCHIVED";
  }
  return status.toUpperCase();
};

const formatExperimentStatus = (status: string) => {
  const normalized = normalizeExperimentStatus(status);
  if (normalized === "IN_PROGRESS") {
    return "In progress";
  }
  if (normalized === "COMPLETED") {
    return "Completed";
  }
  if (normalized === "ARCHIVED") {
    return "Archived";
  }
  return status;
};

const getPreferenceOutcomeLabel = (
  preference: BackendPreference | undefined,
  detail: ExperimentResultDetail,
  test?: BackendTest
) => {
  if (!preference) {
    return "No preference saved";
  }

  if (preference.is_both_good || preference.result_type === "both_good") {
    return "Both Good";
  }

  if (preference.is_both_poor || preference.result_type === "both_poor") {
    return "Both Poor";
  }

  if (!preference.preferred_model_id) {
    return "No winner recorded";
  }

  if (test) {
    if (preference.preferred_model_id === test.model_a_id) {
      return getModelNameStatic(test.model_a_id, detail);
    }
    if (preference.preferred_model_id === test.model_b_id) {
      return getModelNameStatic(test.model_b_id, detail);
    }
  }

  return getModelNameStatic(preference.preferred_model_id, detail);
};

const getModelNameStatic = (modelId: string, detail?: ExperimentResultDetail) =>
  detail?.summary.model_breakdown.find((row) => row.model_id === modelId)?.model_name ||
  detail?.ratings?.model_ratings.find((row) => row.model_id === modelId)?.model_name ||
  detail?.tokenUsage?.model_breakdown.find((row) => row.model_id === modelId)?.model_name ||
  detail?.appearanceByModel[modelId]?.model_name ||
  "Unknown Model";

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
  const hasTotalCost =
    Boolean(responsesSummary) &&
    Object.prototype.hasOwnProperty.call(responsesSummary, "total_cost_usd");

  return {
    successCount: toFiniteNumber(totals?.created, 0),
    failCount: toFiniteNumber(totals?.failed, 0),
    totalCostUsd: hasTotalCost ? toFiniteNumber(responsesSummary?.total_cost_usd, 0) : null,
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

const extractFailedModels = (experiment: BackendExperiment): FailedModelState[] => {
  const metadata = isObjectRecord(experiment.metadata_json) ? experiment.metadata_json : null;
  const failedModels = metadata && Array.isArray(metadata.failed_models) ? metadata.failed_models : [];

  return failedModels
    .filter(isObjectRecord)
    .map((item): FailedModelState => ({
      modelId: typeof item.model_id === "string" ? item.model_id : "",
      failedQuestionIds: Array.isArray(item.failed_question_ids)
        ? item.failed_question_ids.filter((entry): entry is string => typeof entry === "string")
        : [],
      totalFailCount:
        typeof item.total_fail_count === "number"
          ? item.total_fail_count
          : Array.isArray(item.failed_question_ids)
            ? item.failed_question_ids.length
            : 0,
      retryStatus: item.retry_status === "in_progress" ? "in_progress" : "idle",
    }))
    .filter((item) => item.modelId);
};

const extractModelSummaryRows = (experiment: BackendExperiment) => {
  const metadata = isObjectRecord(experiment.metadata_json) ? experiment.metadata_json : null;
  const modelSummary =
    metadata && isObjectRecord(metadata.model_summary) ? metadata.model_summary : null;
  const modelRows = modelSummary && Array.isArray(modelSummary.models) ? modelSummary.models : [];

  return modelRows
    .filter(isObjectRecord)
    .map((item) => ({
      modelId: typeof item.model_id === "string" ? item.model_id : "",
      modelName: typeof item.model_name === "string" ? item.model_name : "",
      retryStatus: item.retry_status === "in_progress" ? "in_progress" : "idle",
    }))
    .filter((item) => item.modelId);
};

const buildMissingQuestionFallback = (questionId: string): BackendQuestion => ({
  id: questionId,
  input_pool_id: "",
  category: null,
  text: "Question text could not be loaded.",
  type: "unknown",
  metadata_json: null,
});

const loadAppearanceSummaryMap = async (
  accessToken: string,
  experimentId: string,
  modelRows: Array<{ model_id: string; model_name: string }>
) => {
  const settled = await Promise.allSettled(
    modelRows.map(async (row) => [
      row.model_id,
      await getExperimentModelAppearanceSummary(accessToken, experimentId, row.model_id),
    ] as const)
  );

  return Object.fromEntries(
    settled.flatMap((entry, index) => {
      if (entry.status === "fulfilled") {
        return [entry.value];
      }

      const row = modelRows[index];
      if (!row) {
        return [];
      }

      return [
        [
          row.model_id,
          {
            experiment_id: experimentId,
            model_id: row.model_id,
            model_name: row.model_name,
            appearance_count: 0,
            selected_count: 0,
            not_selected_count: 0,
            both_good_count: 0,
            both_poor_count: 0,
            selection_rate: 0,
          } satisfies BackendExperimentModelAppearanceSummary,
        ] as const,
      ];
    })
  );
};

export const Results: React.FC = () => {
  const [experiments, setExperiments] = useState<BackendExperiment[]>([]);
  const [archivedExperiments, setArchivedExperiments] = useState<BackendExperiment[]>([]);
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
  const [loadingQuestionResponsesId, setLoadingQuestionResponsesId] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [isLoadingArchivedExperiments, setIsLoadingArchivedExperiments] = useState(false);
  const [hasLoadedArchivedExperiments, setHasLoadedArchivedExperiments] = useState(false);
  const [removingModelKey, setRemovingModelKey] = useState<string | null>(null);
  const [archivingExperimentId, setArchivingExperimentId] = useState<string | null>(null);
  const [stoppingExperimentId, setStoppingExperimentId] = useState<string | null>(null);
  const [exportingExperimentId, setExportingExperimentId] = useState<string | null>(null);
  const [addingModelExperimentId, setAddingModelExperimentId] = useState<string | null>(null);
  const [selectedNewModelByExperiment, setSelectedNewModelByExperiment] = useState<
    Record<string, string>
  >({});
  const [newModelPromptByExperiment, setNewModelPromptByExperiment] = useState<
    Record<string, string>
  >({});
  const [isSubmittingNewModelKey, setIsSubmittingNewModelKey] = useState<string | null>(null);
  const [deletingPreferenceId, setDeletingPreferenceId] = useState<string | null>(null);
  const [retryingModelKeys, setRetryingModelKeys] = useState<Record<string, boolean>>({});
  const [diagnosticsModelFilter, setDiagnosticsModelFilter] = useState<string>("ALL");
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Record<string, boolean>>({});
  const [expandedResultTabByExperiment, setExpandedResultTabByExperiment] = useState<
    Record<string, ResultTab>
  >({});

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
    detail?.tokenUsage?.model_breakdown.find((row) => row.model_id === modelId)?.model_name ||
    detail?.ratings?.model_ratings.find((row) => row.model_id === modelId)?.model_name ||
    detail?.appearanceByModel[modelId]?.model_name ||
    "Unknown Model";

  const getExperimentModelIds = (
    experiment: BackendExperiment,
    detail?: ExperimentResultDetail
  ) => {
    if (!detail) {
      return [
        ...new Set([
          ...extractModelSummaryRows(experiment).map((item) => item.modelId),
          ...extractFailedModels(experiment).map((item) => item.modelId),
        ]),
      ];
    }

    const modelIds = new Set<string>();

    detail.tests.forEach((test) => {
      modelIds.add(test.model_a_id);
      modelIds.add(test.model_b_id);
    });

    detail.summary.model_breakdown.forEach((row) => {
      modelIds.add(row.model_id);
    });

    detail.ratings?.model_ratings.forEach((row) => {
      modelIds.add(row.model_id);
    });

    detail.tokenUsage?.model_breakdown.forEach((row) => {
      modelIds.add(row.model_id);
    });

    Object.keys(detail.appearanceByModel).forEach((modelId) => {
      modelIds.add(modelId);
    });

    extractFailedModels(experiment).forEach((item) => {
      modelIds.add(item.modelId);
    });

    extractModelSummaryRows(experiment).forEach((item) => {
      modelIds.add(item.modelId);
    });

    return [...modelIds];
  };

  const getExperimentModelNames = (experiment: BackendExperiment, detail?: ExperimentResultDetail) =>
    getExperimentModelIds(experiment, detail).map((modelId) => {
      const summaryRow = extractModelSummaryRows(experiment).find((item) => item.modelId === modelId);
      return summaryRow?.modelName || getModelName(modelId, detail);
    });

  const getAvailableModelsToAdd = (experiment: BackendExperiment, detail?: ExperimentResultDetail) => {
    const existingModelIds = new Set(getExperimentModelIds(experiment, detail));
    return models
      .filter((model) => model.is_active && !existingModelIds.has(model.id))
      .sort((left, right) => left.name.localeCompare(right.name));
  };

  const getDisplayModelRows = (experiment: BackendExperiment, detail?: ExperimentResultDetail) => {
    const uniqueIds = getExperimentModelIds(experiment, detail);
    const normalizedStatus = normalizeExperimentStatus(experiment.status);
    const modelSummaryRows = extractModelSummaryRows(experiment);

    return uniqueIds
      .map((modelId) => {
        const ratingRow = detail?.ratings?.model_ratings.find((row) => row.model_id === modelId);
        const tokenRow = detail?.tokenUsage?.model_breakdown.find((row) => row.model_id === modelId);
        const failedState = extractFailedModels(experiment).find((item) => item.modelId === modelId);
        const modelSummaryRow = modelSummaryRows.find((row) => row.modelId === modelId);
        const appearanceRow = detail?.appearanceByModel[modelId];
        const appearsInTests =
          detail?.tests.some((test) => test.model_a_id === modelId || test.model_b_id === modelId) ||
          false;
        const hasSummaryVotes =
          detail?.summary.model_breakdown.some((row) => row.model_id === modelId) || false;
        const hasAppearanceSignal = Boolean(
          appearanceRow &&
            (appearanceRow.appearance_count > 0 ||
              appearanceRow.selected_count > 0 ||
              appearanceRow.not_selected_count > 0 ||
              appearanceRow.both_good_count > 0 ||
              appearanceRow.both_poor_count > 0)
        );
        const hasTokenSignal = Boolean(tokenRow && tokenRow.response_count > 0);
        const hasRatingSignal = Boolean(
          ratingRow &&
            (ratingRow.games_played > 0 ||
              ratingRow.wins > 0 ||
              ratingRow.losses > 0 ||
              ratingRow.draws > 0 ||
              ratingRow.both_good_count > 0 ||
              ratingRow.both_poor_count > 0)
        );
        const isMeaningfullyParticipating =
          appearsInTests ||
          hasSummaryVotes ||
          hasAppearanceSignal ||
          hasTokenSignal ||
          hasRatingSignal ||
          Boolean(failedState) ||
          Boolean(modelSummaryRow);

        return {
          modelId,
          modelName: modelSummaryRow?.modelName || getModelName(modelId, detail),
          eloRating: ratingRow?.rating ?? null,
          selectionRate: appearanceRow?.selection_rate ?? 0,
          totalTokens: tokenRow?.total_tokens ?? 0,
          promptTokens: tokenRow?.prompt_tokens ?? 0,
          completionTokens: tokenRow?.completion_tokens ?? 0,
          responseCount: tokenRow?.response_count ?? 0,
          failedState,
          isMeaningfullyParticipating,
        };
      })
      .filter((row) =>
        normalizedStatus === "COMPLETED" ? row.isMeaningfullyParticipating : true
      )
      .sort((a, b) => {
        const ratingDiff = (b.eloRating ?? -Infinity) - (a.eloRating ?? -Infinity);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }
        const tokenDiff = b.totalTokens - a.totalTokens;
        if (tokenDiff !== 0) {
          return tokenDiff;
        }
        return a.modelName.localeCompare(b.modelName);
      });
  };

  const buildExperimentAnalysis = (
    experiment: BackendExperiment,
    detail: ExperimentResultDetail
  ) => {
    const questionGroupingMap = new Map<string, QuestionGrouping>();
    const evaluationQuestionSummaryMap = new Map<string, EvaluationQuestionSummary>();
    const headToHeadMap = new Map<string, HeadToHeadEntry>();
    const allowedModelIds = new Set(
      getDisplayModelRows(experiment, detail).map((row) => row.modelId)
    );
    const modelIds = new Set<string>();
    const ratingMap = new Map<string, BackendExperimentModelRatingRow>();

    detail.ratings?.model_ratings.forEach((row) => {
      if (allowedModelIds.has(row.model_id)) {
        ratingMap.set(row.model_id, row);
      }
    });

    detail.evaluationQuestions.forEach((question) => {
      evaluationQuestionSummaryMap.set(question.id, {
        evaluationQuestionId: question.id,
        evaluationQuestionText: question.evaluation_question,
        totalPreferences: 0,
        modelCounts: {},
        bothGoodCount: 0,
        bothPoorCount: 0,
      });
    });

    detail.tests.forEach((test) => {
      if (
        !allowedModelIds.has(test.model_a_id) ||
        !allowedModelIds.has(test.model_b_id)
      ) {
        return;
      }
      modelIds.add(test.model_a_id);
      modelIds.add(test.model_b_id);

      const grouping = questionGroupingMap.get(test.question_id) || {
        questionId: test.question_id,
        questionText:
          detail.questionMap[test.question_id]?.text || "Question text not found.",
        testIds: [],
        preferenceCount: 0,
        modelCounts: {},
        bothGoodCount: 0,
        bothPoorCount: 0,
      };

      grouping.testIds.push(test.id);

      const preferences = detail.preferencesByTest[test.id] || [];
      preferences.forEach((preference) => {
        grouping.preferenceCount += 1;
        if (preference.preferred_model_id) {
          grouping.modelCounts[preference.preferred_model_id] =
            (grouping.modelCounts[preference.preferred_model_id] || 0) + 1;
        }

        const evalSummary =
          evaluationQuestionSummaryMap.get(preference.evaluation_question_id) || {
            evaluationQuestionId: preference.evaluation_question_id,
            evaluationQuestionText:
              detail.evaluationQuestions.find(
                (item) => item.id === preference.evaluation_question_id
              )?.evaluation_question || "Unknown Evaluation Question",
            totalPreferences: 0,
            modelCounts: {},
            bothGoodCount: 0,
            bothPoorCount: 0,
          };

        evalSummary.totalPreferences += 1;
        if (preference.is_both_good || preference.result_type === "both_good") {
          grouping.bothGoodCount += 1;
          evalSummary.bothGoodCount += 1;
        }
        if (preference.is_both_poor || preference.result_type === "both_poor") {
          grouping.bothPoorCount += 1;
          evalSummary.bothPoorCount += 1;
        }
        if (preference.preferred_model_id) {
          evalSummary.modelCounts[preference.preferred_model_id] =
            (evalSummary.modelCounts[preference.preferred_model_id] || 0) + 1;
        }
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
      if (allowedModelIds.has(row.model_id)) {
        modelIds.add(row.model_id);
      }
    });

    detail.ratings?.model_ratings.forEach((row) => {
      if (allowedModelIds.has(row.model_id)) {
        modelIds.add(row.model_id);
      }
    });

    detail.tokenUsage?.model_breakdown.forEach((row) => {
      if (allowedModelIds.has(row.model_id)) {
        modelIds.add(row.model_id);
      }
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
          eloRating: ratingMap.get(modelId)?.rating ?? null,
          totalWins,
          totalMatchups,
          ratingGamesPlayed: ratingMap.get(modelId)?.games_played || 0,
          ratingWins: ratingMap.get(modelId)?.wins || 0,
          ratingLosses: ratingMap.get(modelId)?.losses || 0,
          ratingDraws: ratingMap.get(modelId)?.draws || 0,
          qualityPenalty: ratingMap.get(modelId)?.quality_penalty || 0,
          backendAppearanceCount: detail.appearanceByModel[modelId]?.appearance_count || 0,
          backendSelectionRate: detail.appearanceByModel[modelId]?.selection_rate || 0,
          criteriaBreakdown,
        } satisfies ModelBreakdown;
      })
      .sort((a, b) => {
        const ratingDiff = (b.eloRating ?? -Infinity) - (a.eloRating ?? -Infinity);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }
        return b.totalWins - a.totalWins || b.backendAppearanceCount - a.backendAppearanceCount;
      });

    const questionGroups = [...questionGroupingMap.values()].sort(
      (a, b) => b.preferenceCount - a.preferenceCount
    );

    const headToHeadEntries = [...headToHeadMap.values()].sort(
      (a, b) => a.modelAId.localeCompare(b.modelAId) || a.modelBId.localeCompare(b.modelBId)
    );

    const matrixModelIds = [...modelIds].sort((a, b) => {
      const ratingA = ratingMap.get(a)?.rating ?? -Infinity;
      const ratingB = ratingMap.get(b)?.rating ?? -Infinity;
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      return getModelName(a, detail).localeCompare(getModelName(b, detail));
    });

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
            const [
              summaryResult,
              ratingsResult,
              tokenUsageResult,
              testsResult,
              evaluationQuestionsResult,
            ] =
              await Promise.allSettled([
                getExperimentModelPreferenceSummary(accessToken, experiment.id),
                getExperimentModelRatings(experiment.id),
                getExperimentModelTokenUsage(accessToken, experiment.id),
                getTestsByExperiment(accessToken, experiment.id),
                getEvaluationQuestionsByExperiment(accessToken, experiment.id),
              ]);

            const summary =
              summaryResult.status === "fulfilled"
                ? summaryResult.value
                : createEmptySummary(experiment.id);
            const ratings =
              ratingsResult.status === "fulfilled"
                ? ratingsResult.value
                : createEmptyRatingsSummary(experiment.id);
            const tokenUsage =
              tokenUsageResult.status === "fulfilled"
                ? tokenUsageResult.value
                : createEmptyTokenUsageSummary(experiment.id);
            const tests = testsResult.status === "fulfilled" ? testsResult.value : [];
            const evaluationQuestions =
              evaluationQuestionsResult.status === "fulfilled"
                ? evaluationQuestionsResult.value
                : [];
            const appearanceModelRows = [
              ...ratings.model_ratings.map((row) => ({
                model_id: row.model_id,
                model_name: row.model_name,
              })),
              ...tokenUsage.model_breakdown.map((row) => ({
                model_id: row.model_id,
                model_name: row.model_name,
              })),
            ].filter(
              (row, index, arr) => arr.findIndex((item) => item.model_id === row.model_id) === index
            );
            const appearanceByModel =
              appearanceModelRows.length > 0
                ? await loadAppearanceSummaryMap(accessToken, experiment.id, appearanceModelRows)
                : {};

            const detail = {
              summary,
              ratings,
              questionRatings: null,
              categoryRatings: null,
              appearanceByModel,
              tokenUsage,
              tests,
              evaluationQuestions,
              questionMap: {},
              responsesByQuestion: {},
              preferencesByTest: {},
            } satisfies ExperimentResultDetail;

            return [experiment.id, detail] as const;
          } catch {
            const fallbackDetail: ExperimentResultDetail = {
              summary: createEmptySummary(experiment.id),
              ratings: createEmptyRatingsSummary(experiment.id),
              questionRatings: null,
              categoryRatings: null,
              appearanceByModel: {},
              tokenUsage: createEmptyTokenUsageSummary(experiment.id),
              tests: [],
              evaluationQuestions: [],
              questionMap: {},
              responsesByQuestion: {},
              preferencesByTest: {},
            };

            return [experiment.id, fallbackDetail] as const;
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

  const loadArchivedExperiments = async (force = false) => {
    if (isLoadingArchivedExperiments) {
      return;
    }
    if (hasLoadedArchivedExperiments && !force) {
      return;
    }

    setIsLoadingArchivedExperiments(true);
    try {
      const accessToken = getAccessToken();
      const rows = await getArchivedExperiments(accessToken);
      setArchivedExperiments(rows);
      setHasLoadedArchivedExperiments(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Archived experiments could not be loaded."
      );
      setShowAlertToast(true);
    } finally {
      setIsLoadingArchivedExperiments(false);
    }
  };

  const loadExperimentDetail = async (experimentId: string) => {
    const existing = detailsByExperiment[experimentId];
    const experimentRow = experiments.find((item) => item.id === experimentId);
    const isInProgressExperiment =
      normalizeExperimentStatus(experimentRow?.status || "") === "IN_PROGRESS";
    const failedQuestionIdsFromMetadata =
      experimentRow
        ? extractRecentFailures(experimentRow)
            .map((item) => item.questionId)
            .filter(Boolean)
        : [];
    const hasAnyMaterializedModelSignal =
      !!existing &&
      (
        existing.tests.length > 0 ||
        existing.summary.model_breakdown.length > 0 ||
        (existing.ratings?.model_ratings.length || 0) > 0 ||
        (existing.tokenUsage?.model_breakdown.length || 0) > 0
      );
    const missingFailedQuestionIds =
      existing && failedQuestionIdsFromMetadata.length > 0
        ? failedQuestionIdsFromMetadata.filter((questionId) => !existing.questionMap[questionId])
        : [];
    const hasDeepDetail =
      !!existing &&
      (!isInProgressExperiment || hasAnyMaterializedModelSignal) &&
      (existing.tests.length === 0 ||
        (Object.keys(existing.questionMap).length > 0 &&
          Object.keys(existing.preferencesByTest).length > 0)) &&
      missingFailedQuestionIds.length === 0 &&
      existing.questionRatings !== null &&
      existing.categoryRatings !== null;

    if (hasDeepDetail) {
      return;
    }

    setLoadingDetailId(experimentId);
    try {
      const accessToken = getAccessToken();
      const baseDetail = existing;
      const tests =
        baseDetail?.tests ||
        (await getTestsByExperiment(accessToken, experimentId).catch(() => []));
      const evaluationQuestions =
        baseDetail?.evaluationQuestions ||
        (await getEvaluationQuestionsByExperiment(accessToken, experimentId).catch(() => []));
      const summary =
        !baseDetail?.summary || isEmptyPreferenceSummary(baseDetail.summary)
          ? await getExperimentModelPreferenceSummary(accessToken, experimentId).catch(() =>
              createEmptySummary(experimentId)
            )
        :
        baseDetail.summary;
      const ratings =
        !baseDetail?.ratings || baseDetail.ratings.model_ratings.length === 0
          ? await getExperimentModelRatings(experimentId).catch(() =>
              createEmptyRatingsSummary(experimentId)
            )
        :
        baseDetail.ratings;
      let questionRatings = baseDetail?.questionRatings;
      if (!questionRatings) {
        try {
          const rawRatings: any = await getExperimentEvaluationQuestionRatings(accessToken, experimentId);
          console.log("Fetched raw questionRatings:", rawRatings);
          
          if (rawRatings && typeof rawRatings === "object" && !Array.isArray(rawRatings)) {
            // Eğer backend objeye sarılı bir liste dönüyorsa ({ items: [...] } gibi) içindeki diziyi bul
            const arrayValue = Object.values(rawRatings).find((v) => Array.isArray(v));
            questionRatings = arrayValue || rawRatings; 
          } else {
            questionRatings = rawRatings || [];
          }
        } catch (e) {
          console.error("Error fetching questionRatings:", e);
          questionRatings = null;
        }
      }

      let categoryRatings = baseDetail?.categoryRatings;
      if (!categoryRatings) {
        try {
          const rawCatRatings: any = await getExperimentCategoryRatings(experimentId);
          console.log("Fetched raw categoryRatings:", rawCatRatings);

          if (rawCatRatings && typeof rawCatRatings === "object" && !Array.isArray(rawCatRatings)) {
            const arrayValue = Object.values(rawCatRatings).find((v) => Array.isArray(v));
            categoryRatings = arrayValue || rawCatRatings;
          } else {
            categoryRatings = rawCatRatings || [];
          }
        } catch (e) {
          console.error("Error fetching categoryRatings:", e);
          categoryRatings = null;
        }
      }
      const tokenUsage =
        !baseDetail?.tokenUsage ||
        (
          baseDetail.tokenUsage.model_breakdown.length === 0 &&
          baseDetail.tests.length === 0 &&
          baseDetail.summary.model_breakdown.length === 0 &&
          (baseDetail.ratings?.model_ratings.length || 0) === 0
        )
          ? await getExperimentModelTokenUsage(accessToken, experimentId).catch(() =>
              createEmptyTokenUsageSummary(experimentId)
            )
          : baseDetail.tokenUsage;
      const appearanceModelRows = [
        ...ratings.model_ratings.map((row) => ({
          model_id: row.model_id,
          model_name: row.model_name,
        })),
        ...tokenUsage.model_breakdown.map((row) => ({
          model_id: row.model_id,
          model_name: row.model_name,
        })),
      ].filter(
        (row, index, arr) => arr.findIndex((item) => item.model_id === row.model_id) === index
      );
      const appearanceByModel =
        appearanceModelRows.length > 0
          ? await loadAppearanceSummaryMap(accessToken, experimentId, appearanceModelRows)
          : {};

      const uniqueQuestionIds = [
        ...new Set([
          ...tests.map((test) => test.question_id),
          ...failedQuestionIdsFromMetadata,
        ]),
      ];
      const [questionEntriesSettled, preferenceEntriesSettled] = await Promise.all([
        Promise.allSettled(
          uniqueQuestionIds.map(async (questionId) => [
            questionId,
            await getQuestionById(accessToken, questionId),
          ] as const)
        ),
        Promise.allSettled(
          tests.map(async (test) => [
            test.id,
            await getPreferencesByTest(accessToken, test.id),
          ] as const)
        ),
      ]);

      const questionEntries = questionEntriesSettled.flatMap((entry, index) => {
        if (entry.status === "fulfilled") {
          return [entry.value];
        }

        const questionId = uniqueQuestionIds[index];
        return [[questionId, buildMissingQuestionFallback(questionId)] as const];
      });

      const preferenceEntries = preferenceEntriesSettled.flatMap((entry, index) => {
        if (entry.status === "fulfilled") {
          return [entry.value];
        }

        const test = tests[index];
        if (!test) {
          return [];
        }

        return [[test.id, [] as BackendPreference[]] as const];
      });

      setDetailsByExperiment((prev) => ({
        ...prev,
        [experimentId]: {
          summary,
          ratings,
          questionRatings,
          categoryRatings,
          appearanceByModel,
          tokenUsage,
          tests,
          evaluationQuestions,
          questionMap: Object.fromEntries(questionEntries),
          responsesByQuestion: baseDetail?.responsesByQuestion || {},
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

  const loadExperimentResponses = async (experimentId: string) => {
    const existing = detailsByExperiment[experimentId];
    if (existing && Object.keys(existing.responsesByQuestion).length > 0) {
      return;
    }

    const accessToken = getAccessToken();
    const tests = existing?.tests || (await getTestsByExperiment(accessToken, experimentId).catch(() => []));
    const uniqueQuestionIds = [...new Set(tests.map((test) => test.question_id))];
    setLoadingQuestionResponsesId(experimentId);
    try {
      const responseEntriesSettled = await Promise.all(
        uniqueQuestionIds.map(async (questionId) => {
          try {
            return [
              questionId,
              await getResponsesByQuestion(accessToken, questionId).catch(() => []),
            ] as const;
          } catch {
            return [questionId, [] as BackendResponseItem[]] as const;
          }
        })
      );

      setDetailsByExperiment((prev) => {
        const current = prev[experimentId];
        if (!current) {
          return prev;
        }

        return {
          ...prev,
          [experimentId]: {
            ...current,
            responsesByQuestion: Object.fromEntries(responseEntriesSettled),
          },
        };
      });
    } finally {
      setLoadingQuestionResponsesId((current) => (current === experimentId ? null : current));
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

  const handleToggleAddModel = (experimentId: string) => {
    setAddingModelExperimentId((current) => (current === experimentId ? null : experimentId));
  };

  const handleAddModelToExperiment = async (
    experiment: BackendExperiment,
    selectedModelId: string
  ) => {
    const trimmedModelId = selectedModelId.trim();
    if (!trimmedModelId) {
      setAlertMessage("Please choose a model to add.");
      setShowAlertToast(true);
      return;
    }

    const systemPrompt = (newModelPromptByExperiment[experiment.id] || "").trim();
    const accessToken = getAccessToken();
    const actionKey = `${experiment.id}:${trimmedModelId}`;
    const modelName = modelMap[trimmedModelId]?.name || "Selected model";

    setIsSubmittingNewModelKey(actionKey);
    try {
      await attachModelToExperiment(accessToken, experiment.id, trimmedModelId, systemPrompt);
      setHasLoadedArchivedExperiments(false);
      await loadOverview();
      await loadExperimentDetail(experiment.id);
      setSelectedNewModelByExperiment((prev) => ({
        ...prev,
        [experiment.id]: "",
      }));
      setNewModelPromptByExperiment((prev) => ({
        ...prev,
        [experiment.id]: "",
      }));
      setAddingModelExperimentId(null);
      setSuccessMessage(`"${modelName}" was added to the experiment.`);
      setShowSuccessToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Model could not be added to the experiment."
      );
      setShowAlertToast(true);
    } finally {
      setIsSubmittingNewModelKey(null);
    }
  };

  const handleToggleArchivedExperiments = async () => {
    const next = !isArchivedExpanded;
    setIsArchivedExpanded(next);
    if (next && !hasLoadedArchivedExperiments) {
      await loadArchivedExperiments();
    }
  };

  const handleToggleFeedback = (testId: string, modelId: string) => {
    const key = `${testId}-${modelId}`;
    setExpandedFeedbacks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectResultTab = (experimentId: string, tab: ResultTab) => {
    setExpandedResultTabByExperiment((prev) => ({
      ...prev,
      [experimentId]: tab,
    }));

    if (tab === "questions" || tab === "feedbacks") {
      void loadExperimentResponses(experimentId);
    }
  };

  const handleArchiveExperiment = async (experimentId: string, experimentName: string) => {
    if (!window.confirm(`Archive "${experimentName}"?\n\nArchived experiments are hidden from the main list.`)) {
      return;
    }

    const accessToken = getAccessToken();
    setArchivingExperimentId(experimentId);
    try {
      await archiveExperiment(accessToken, experimentId);
      setHasLoadedArchivedExperiments(false);
      await loadOverview();
      if (expandedExpId === experimentId) {
        setExpandedExpId(null);
        setExpandedQuestionByExperiment((prev) => ({
          ...prev,
          [experimentId]: null,
        }));
      }
      if (isArchivedExpanded) {
        await loadArchivedExperiments(true);
      }
      setSuccessMessage(`"${experimentName}" was archived.`);
      setShowSuccessToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Experiment could not be archived."
      );
      setShowAlertToast(true);
    } finally {
      setArchivingExperimentId(null);
    }
  };

  const handleStopExperiment = async (experimentId: string, experimentName: string) => {
    if (
      !window.confirm(
        `Cancel the running experiment "${experimentName}"?\n\nGenerated responses will be kept, and unanswered pairs will be marked as failed for retry.`
      )
    ) {
      return;
    }

    const accessToken = getAccessToken();
    setStoppingExperimentId(experimentId);
    try {
      await stopExperiment(accessToken, experimentId);
      await loadOverview();
      if (expandedExpId === experimentId) {
        await loadExperimentDetail(experimentId);
      }
      setSuccessMessage(`"${experimentName}" was cancelled.`);
      setShowSuccessToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Experiment could not be cancelled."
      );
      setShowAlertToast(true);
    } finally {
      setStoppingExperimentId(null);
    }
  };

  const handleExportExperiment = async (experimentId: string, experimentName: string) => {
    const accessToken = getAccessToken();
    setExportingExperimentId(experimentId);
    try {
      const { blob, filename } = await exportExperiment(accessToken, experimentId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      setSuccessMessage(`"${experimentName}" export downloaded.`);
      setShowSuccessToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Experiment could not be exported."
      );
      setShowAlertToast(true);
    } finally {
      setExportingExperimentId(null);
    }
  };

  const handleOpenDiagnostics = (experimentId: string) => {
    setExpandedExpId(experimentId);
    handleSelectResultTab(experimentId, "diagnostics");
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

  const handleRetryModel = async (
    experimentId: string,
    modelId: string,
    modelName: string
  ) => {
    const accessToken = getAccessToken();
    const actionKey = `${experimentId}:${modelId}`;
    setRetryingModelKeys((prev) => ({
      ...prev,
      [actionKey]: true,
    }));
    try {
      await retryExperimentModelResponses(accessToken, experimentId, modelId);
      setSuccessMessage(`Retry queued for "${modelName}".`);
      setShowSuccessToast(true);
    } catch (error) {
      setRetryingModelKeys((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
      setAlertMessage(
        error instanceof Error ? error.message : "Retry could not be started for this model."
      );
      setShowAlertToast(true);
    }
  };

  const handleDeletePreference = async (experimentId: string, preferenceId: string) => {
    if (!window.confirm("Delete this recorded preference?")) {
      return;
    }

    const accessToken = getAccessToken();
    setDeletingPreferenceId(preferenceId);
    try {
      await deleteExperimentPreference(accessToken, preferenceId);
      await loadOverview();
      if (expandedExpId === experimentId) {
        await loadExperimentDetail(experimentId);
      }
      setSuccessMessage("Preference deleted.");
      setShowSuccessToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Preference could not be deleted."
      );
      setShowAlertToast(true);
    } finally {
      setDeletingPreferenceId(null);
    }
  };

  const filteredExperiments = useMemo(() => {
      const loweredSearch = searchTerm.trim().toLowerCase();
      const items = experiments.filter((experiment) => {
      const detail = detailsByExperiment[experiment.id];
      const matchesStatus =
        statusFilter === "ALL" ||
        normalizeExperimentStatus(experiment.status) === statusFilter;
      const modelNames = getExperimentModelNames(experiment, detail);
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
        return getDetailPreferenceCount(rightDetail) - getDetailPreferenceCount(leftDetail);
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
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
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
              const normalizedExperimentStatus = normalizeExperimentStatus(experiment.status);
              const canArchiveExperiment = normalizedExperimentStatus === "COMPLETED";
              const isImportedExperiment = experiment.source === "imported";
              const canRetryFailedModels = !isImportedExperiment;
              const canAddModels =
                !isImportedExperiment && normalizedExperimentStatus !== "ARCHIVED";
              const isLoadingDetail = loadingDetailId === experiment.id;
              const questionPoolName =
                inputPoolMap[experiment.input_pool_id]?.name || "Unknown Question Pool";
              const hasDeepDetail =
                !!detail &&
                (detail.tests.length === 0 ||
                  (Object.keys(detail.questionMap).length > 0 &&
                    Object.keys(detail.preferencesByTest).length > 0));
              const analysis =
                hasDeepDetail && detail ? buildExperimentAnalysis(experiment, detail) : null;
              const displayModelRows = getDisplayModelRows(experiment, detail);
              const ratingRows =
                detail?.ratings?.model_ratings.filter((row) =>
                  displayModelRows.some((item) => item.modelId === row.model_id)
                ) || [];
              const topRatingRow = ratingRows[0];
              const displayedTotalPreferences = getDetailPreferenceCount(detail);
              const displayedTotalTests = getDetailTestCount(detail);
              const eloRankedModels: ModelBreakdown[] =
                analysis?.modelBreakdown ||
                displayModelRows.map((row) => ({
                  modelId: row.modelId,
                  modelName: row.modelName,
                  eloRating: row.eloRating,
                  totalWins: 0,
                  totalMatchups: 0,
                  ratingGamesPlayed:
                    detail?.ratings?.model_ratings.find((entry) => entry.model_id === row.modelId)
                      ?.games_played || 0,
                  ratingWins:
                    detail?.ratings?.model_ratings.find((entry) => entry.model_id === row.modelId)
                      ?.wins || 0,
                  ratingLosses:
                    detail?.ratings?.model_ratings.find((entry) => entry.model_id === row.modelId)
                      ?.losses || 0,
                  ratingDraws:
                    detail?.ratings?.model_ratings.find((entry) => entry.model_id === row.modelId)
                      ?.draws || 0,
                  qualityPenalty:
                    detail?.ratings?.model_ratings.find((entry) => entry.model_id === row.modelId)
                      ?.quality_penalty || 0,
                  backendAppearanceCount:
                    detail?.appearanceByModel[row.modelId]?.appearance_count || 0,
                  backendSelectionRate:
                    detail?.appearanceByModel[row.modelId]?.selection_rate || 0,
                  criteriaBreakdown: [],
                }));
              const topBadgeLabel =
                topRatingRow
                  ? `${topRatingRow.model_name} (Elo ${formatEloRating(topRatingRow.rating)})`
                  : "No Elo ratings yet";
              const isQuestionExplorerExpanded =
                expandedQuestionExplorerByExperiment[experiment.id] ?? false;
              const activeResultTab =
                expandedResultTabByExperiment[experiment.id] ?? "overview";
              const expandedQuestionId = expandedQuestionByExperiment[experiment.id] || null;
              const isQuestionResponsesLoading = loadingQuestionResponsesId === experiment.id;
              const failedModels = extractFailedModels(experiment);
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
              const diagnosticsModelOptions = [
                ...new Map(
                  failedResponseDetails.map((item) => [item.modelId, item.modelName] as const)
                ).entries(),
              ].sort((left, right) => left[1].localeCompare(right[1]));
              const filteredFailedResponseDetails =
                diagnosticsModelFilter === "ALL"
                  ? failedResponseDetails
                  : failedResponseDetails.filter((item) => item.modelId === diagnosticsModelFilter);
              const availableModelsToAdd = canAddModels
                ? getAvailableModelsToAdd(experiment, detail)
                : [];
              const selectedNewModelId = selectedNewModelByExperiment[experiment.id] || "";
              const newModelPrompt = newModelPromptByExperiment[experiment.id] || "";
              const addModelActionKey = `${experiment.id}:${selectedNewModelId}`;
              const isSubmittingNewModel = isSubmittingNewModelKey === addModelActionKey;

              const feedbacksByModel: Record<
                string,
                Array<{
                  testId: string;
                  modelId: string;
                  feedback: string;
                  questionText: string;
                  modelResponse: string;
                }>
              > = {};

              if (detail) {
                detail.tests.forEach((test) => {
                  if (test.model_a_feedback) {
                    if (!feedbacksByModel[test.model_a_id]) feedbacksByModel[test.model_a_id] = [];
                    const question = detail.questionMap[test.question_id];
                    const responses = detail.responsesByQuestion[test.question_id] || [];
                    const modelResponse =
                      responses.find((r) => r.model_id === test.model_a_id)?.model_response ||
                      "Response not found.";

                    feedbacksByModel[test.model_a_id].push({
                      testId: test.id,
                      modelId: test.model_a_id,
                      feedback: test.model_a_feedback,
                      questionText: question?.text || "Question not found.",
                      modelResponse,
                    });
                  }
                  if (test.model_b_feedback) {
                    if (!feedbacksByModel[test.model_b_id]) feedbacksByModel[test.model_b_id] = [];
                    const question = detail.questionMap[test.question_id];
                    const responses = detail.responsesByQuestion[test.question_id] || [];
                    const modelResponse =
                      responses.find((r) => r.model_id === test.model_b_id)?.model_response ||
                      "Response not found.";

                    feedbacksByModel[test.model_b_id].push({
                      testId: test.id,
                      modelId: test.model_b_id,
                      feedback: test.model_b_feedback,
                      questionText: question?.text || "Question not found.",
                      modelResponse,
                    });
                  }
                });
              }

              const groupedFeedbackEntries = Object.entries(feedbacksByModel)
                .map(([modelId, entries]) => ({
                  modelId,
                  modelName: getModelName(modelId, detail),
                  entries,
                }))
                .sort((a, b) => a.modelName.localeCompare(b.modelName));

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
                          {canArchiveExperiment && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-xs"
                              disabled={archivingExperimentId === experiment.id}
                              onClick={() =>
                                void handleArchiveExperiment(experiment.id, experiment.name)
                              }
                            >
                              {archivingExperimentId === experiment.id
                                ? "Archiving..."
                                : "Archive"}
                            </Button>
                          )}
                          {normalizedExperimentStatus === "IN_PROGRESS" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-xs"
                              disabled={stoppingExperimentId === experiment.id}
                              onClick={() =>
                                void handleStopExperiment(experiment.id, experiment.name)
                              }
                            >
                              {stoppingExperimentId === experiment.id ? "Cancelling..." : "Cancel"}
                            </Button>
                          )}
                          {normalizedExperimentStatus === "COMPLETED" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-xs"
                              disabled={exportingExperimentId === experiment.id}
                              onClick={() =>
                                void handleExportExperiment(experiment.id, experiment.name)
                              }
                            >
                              {exportingExperimentId === experiment.id ? "Exporting..." : "Export"}
                            </Button>
                          )}
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              normalizedExperimentStatus === "COMPLETED"
                                ? "bg-primary/20 text-primary"
                                : normalizedExperimentStatus === "ARCHIVED"
                                  ? "bg-muted text-muted-foreground"
                                : "bg-accent/20 text-accent-foreground"
                            }`}
                          >
                            {formatExperimentStatus(experiment.status)}
                          </span>
                          {isImportedExperiment && (
                            <Badge variant="outline">Imported</Badge>
                          )}
                          <Badge variant="secondary">Top Model: {topBadgeLabel}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Question Pool: <strong>{questionPoolName}</strong>
                        </p>
                        {experiment.evaluation_criteria && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Criteria: {experiment.evaluation_criteria}
                          </p>
                        )}
                        {displayModelRows.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {displayModelRows.map((row) => {
                              const actionKey = `${experiment.id}:${row.modelId}`;
                              const isRemoving = removingModelKey === actionKey;
                              const isRetrying = Boolean(retryingModelKeys[actionKey]);
                              const failedState = failedModels.find(
                                (item) => item.modelId === row.modelId
                              );
                              return (
                                <div
                                  key={`${experiment.id}-${row.modelId}`}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1"
                                >
                                  <Badge variant="outline">
                                    {row.modelName}
                                    {row.eloRating !== null
                                      ? ` · Elo ${formatEloRating(row.eloRating)}`
                                      : ""}
                                  </Badge>
                                  {failedState && canRetryFailedModels && (
                                    <>
                                      <Badge variant="secondary">
                                        Failed ({failedState.totalFailCount})
                                      </Badge>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-6 px-2 text-xs"
                                            disabled={
                                              isRetrying || failedState.retryStatus === "in_progress"
                                            }
                                            onClick={() =>
                                              void handleRetryModel(
                                                experiment.id,
                                                row.modelId,
                                                row.modelName
                                              )
                                            }
                                          >
                                            {isRetrying || failedState.retryStatus === "in_progress"
                                              ? "Running..."
                                              : "Run"}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {failedState.retryStatus === "in_progress"
                                            ? "Retry is already running for this model."
                                            : `Retry ${failedState.totalFailCount} failed response${
                                                failedState.totalFailCount !== 1 ? "s" : ""
                                              }`}
                                        </TooltipContent>
                                      </Tooltip>
                                    </>
                                  )}
                                  {failedState && !canRetryFailedModels && (
                                    <Badge variant="secondary">
                                      Failed ({failedState.totalFailCount})
                                    </Badge>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs"
                                    disabled={isRemoving}
                                    onClick={() =>
                                      void handleRemoveModelFromExperiment(
                                        experiment.id,
                                        row.modelId,
                                        row.modelName
                                      )
                                    }
                                  >
                                    {isRemoving ? "Removing..." : "Remove"}
                                  </Button>
                                </div>
                              );
                            })}
                            {canAddModels && (
                              <div className="inline-flex items-center gap-2 rounded-md border border-dashed border-border bg-background px-2 py-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleToggleAddModel(experiment.id)}
                                  disabled={availableModelsToAdd.length === 0}
                                >
                                  {availableModelsToAdd.length === 0
                                    ? "No models left to add"
                                    : addingModelExperimentId === experiment.id
                                      ? "Cancel"
                                      : "Add model"}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                        {canAddModels && addingModelExperimentId === experiment.id && (
                          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto] xl:items-end">
                              <div>
                                <p className="mb-2 text-sm font-medium text-foreground">
                                  Model
                                </p>
                                <Select
                                  value={selectedNewModelId || undefined}
                                  onValueChange={(value) =>
                                    setSelectedNewModelByExperiment((prev) => ({
                                      ...prev,
                                      [experiment.id]: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a model" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableModelsToAdd.map((model) => (
                                      <SelectItem key={model.id} value={model.id}>
                                        {model.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Textarea
                                label="System Prompt"
                                placeholder="Optional instructions for this model"
                                value={newModelPrompt}
                                onChange={(e) =>
                                  setNewModelPromptByExperiment((prev) => ({
                                    ...prev,
                                    [experiment.id]: e.target.value,
                                  }))
                                }
                                rows={3}
                                className="mb-0"
                              />
                              <Button
                                type="button"
                                onClick={() =>
                                  void handleAddModelToExperiment(experiment, selectedNewModelId)
                                }
                                disabled={!selectedNewModelId || isSubmittingNewModel}
                              >
                                {isSubmittingNewModel ? "Adding..." : "Add"}
                              </Button>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                              Adding a model queues generation for the new model in this experiment.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="w-full space-y-4 xl:w-[340px]">
                        <div className="grid gap-3">
                          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                            <p className="text-xs text-muted-foreground">Run Summary</p>
                            <p className="text-sm font-medium text-foreground">
                              {runSummary.successCount} succeeded · {runSummary.failCount} failed
                            </p>
                            {runSummary.failCount > 0 && (
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenDiagnostics(experiment.id)}
                                  className="w-full"
                                >
                                  Open diagnostics
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                            <p className="text-xs text-muted-foreground">Token Usage</p>
                            {detail?.tokenUsage && detail.tokenUsage.model_breakdown.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {detail.tokenUsage.model_breakdown.map((row) => (
                                  <div
                                    key={`${experiment.id}-tokens-${row.model_id}`}
                                    className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                                  >
                                    <span className="group relative min-w-0 max-w-[11rem]">
                                      <span className="block truncate">
                                        {row.model_name}
                                      </span>
                                      <span className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden max-w-sm rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md group-hover:block">
                                        {row.model_name}
                                      </span>
                                    </span>
                                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 font-medium text-foreground">
                                      <span>
                                        {formatInteger(row.total_tokens)} · {formatUsd(row.total_cost_usd)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        In{" "}
                                        {formatInteger(
                                          row.total_input_tokens ?? row.prompt_tokens
                                        )}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Out{" "}
                                        {formatInteger(
                                          row.total_output_tokens ?? row.completion_tokens
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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
                  </div>

                  {expandedExpId === experiment.id && (
                    <div className="border-t border-border bg-muted/20 px-5 py-5 text-card-foreground">
                      {!detail ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                          Loading experiment details...
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-border bg-background/80 p-2 shadow-sm">
                            <div className="flex flex-wrap gap-2">
                            {(
                              [
                                ["overview", "Overview"],
                                ["judge-questions", "Judge Questions"],
                                ["categories", "Categories"],
                                ["pairwise", "Pairwise"],
                                ["questions", "Questions"],
                                ["feedbacks", "Feedbacks"],
                                ["diagnostics", "Diagnostics"],
                              ] as const
                            ).map(([tabId, label]) => (
                              <Button
                                key={tabId}
                                type="button"
                                size="sm"
                                variant={activeResultTab === tabId ? "secondary" : "ghost"}
                                onClick={() => handleSelectResultTab(experiment.id, tabId)}
                                className="rounded-full px-4"
                              >
                                {label}
                              </Button>
                            ))}
                            </div>
                          </div>

                          {activeResultTab === "overview" && (
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                              <section className="rounded-xl border border-border bg-background p-4">
                                <div className="mb-4 flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-semibold text-foreground">
                                      Experiment Overview
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      A compact snapshot of the current experiment state.
                                    </p>
                                  </div>
                                  <Badge variant="secondary">
                                    {displayedTotalPreferences} evaluation
                                    {displayedTotalPreferences !== 1 ? "s" : ""}
                                  </Badge>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm">
                                    <p className="text-xs text-muted-foreground">Question Pool</p>
                                    <p className="mt-1 font-medium text-foreground">
                                      {questionPoolName}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm">
                                    <p className="text-xs text-muted-foreground">Created</p>
                                    <p className="mt-1 font-medium text-foreground">
                                      {new Date(experiment.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm">
                                    <p className="text-xs text-muted-foreground">Models</p>
                                    <p className="mt-1 font-medium text-foreground">
                                      {eloRankedModels.length}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm">
                                    <p className="text-xs text-muted-foreground">Total Blind Tests</p>
                                    <p className="mt-1 font-medium text-foreground">
                                      {displayedTotalTests}
                                    </p>
                                  </div>
                                </div>

                                {experiment.evaluation_criteria && (
                                  <div className="mt-4 rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm">
                                    <p className="text-xs text-muted-foreground">
                                      Evaluation Criteria
                                    </p>
                                    <p className="mt-1 text-sm text-foreground">
                                      {experiment.evaluation_criteria}
                                    </p>
                                  </div>
                                )}
                              </section>

                              <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                <div className="mb-4 flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-semibold text-foreground">
                                      Model Lineup
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      Models participating in this experiment.
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Elo ranks the models within this experiment. Selection Rate is the percentage of times a model is chosen as the best-performing answer among the questions it receives.
                                    </p>
                                  </div>
                                  <Badge variant="outline">{eloRankedModels.length}</Badge>
                                </div>

                                <div className="space-y-3">
                                  {eloRankedModels.map((entry, index) => (
                                    <div
                                      key={entry.modelId}
                                      className="rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm"
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                            #{index + 1}
                                          </span>
                                          <p className="font-medium text-foreground">
                                            {entry.modelName}
                                          </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Badge variant="secondary">
                                            Elo {formatEloRating(entry.eloRating)}
                                          </Badge>
                                          <Badge variant="outline">
                                            Selection {formatRatioAsPercentage(
                                              entry.backendSelectionRate
                                            )}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            </div>
                          )}

                          {activeResultTab === "judge-questions" && (
                            <div className="space-y-4">
                              <div className="mb-4">
                                <h4 className="font-semibold text-foreground">Judge Questions</h4>
                                <p className="text-sm text-muted-foreground">
                                  Elo rankings of models per judge question in this experiment.
                                </p>
                              </div>
                              {!detail?.questionRatings ? (
                                <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                  <div className="py-10 text-center text-muted-foreground">
                                    {isLoadingDetail ? (
                                      <>
                                        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                                        Loading judge question ratings...
                                      </>
                                    ) : (
                                      "No question-based ratings are available yet."
                                    )}
                                  </div>
                                </section>
                              ) : !Array.isArray(detail.questionRatings) || detail.questionRatings.length === 0 ? (
                                <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                  <div className="py-10 text-center text-muted-foreground">
                                    <p className="mb-4">No judge questions exist in this experiment or data format is unexpected.</p>
                                    <pre className="text-left text-xs bg-muted/50 p-4 rounded-md overflow-x-auto text-muted-foreground">
                                      {JSON.stringify(detail.questionRatings, null, 2)}
                                    </pre>
                                  </div>
                                </section>
                              ) : (
                                <div className="grid gap-4 xl:grid-cols-2">
                                  {Array.isArray(detail.questionRatings) && detail.questionRatings.map((ratingSummary, ratingIndex) => (
                                    <section
                                      key={ratingSummary.evaluation_question_id || `rating-${ratingIndex}`}
                                      className="rounded-2xl border border-border bg-background p-5 shadow-sm"
                                    >
                                      <h5 className="font-semibold text-foreground mb-3 truncate" title={ratingSummary.evaluation_question}>
                                        {ratingSummary.evaluation_question || 'Unknown Question'}
                                      </h5>
                                      <div className="space-y-3">
                                        {[...(ratingSummary.model_ratings || [])]
                                          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                                          .map((entry, index) => (
                                            <div
                                              key={entry.model_id || `model-${index}`}
                                              className="rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm"
                                            >
                                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                                    #{index + 1}
                                                  </span>
                                                  <p className="font-medium text-foreground">
                                                    {entry.model_name || 'Unknown Model'}
                                                  </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <Badge variant="secondary">
                                                    Elo {formatEloRating(entry.rating)}
                                                  </Badge>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                          {(!ratingSummary.model_ratings || ratingSummary.model_ratings.length === 0) && (
                                            <div className="text-sm text-muted-foreground">
                                              No ratings generated for this question.
                                            </div>
                                          )}
                                      </div>
                                    </section>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {activeResultTab === "categories" && (
                            <div className="space-y-4">
                              <div className="mb-4">
                                <h4 className="font-semibold text-foreground">Categories</h4>
                                <p className="text-sm text-muted-foreground">
                                  Elo rankings of models per category in this experiment.
                                </p>
                              </div>
                              {!detail?.categoryRatings ? (
                                <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                  <div className="py-10 text-center text-muted-foreground">
                                    {isLoadingDetail ? (
                                      <>
                                        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                                        Loading category ratings...
                                      </>
                                    ) : (
                                      "No category-based ratings are available yet."
                                    )}
                                  </div>
                                </section>
                              ) : !Array.isArray(detail.categoryRatings) || detail.categoryRatings.length === 0 ? (
                                <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                  <div className="py-10 text-center text-muted-foreground">
                                    <p className="mb-4">No categories exist in this experiment or data format is unexpected.</p>
                                    <pre className="text-left text-xs bg-muted/50 p-4 rounded-md overflow-x-auto text-muted-foreground">
                                      {JSON.stringify(detail.categoryRatings, null, 2)}
                                    </pre>
                                  </div>
                                </section>
                              ) : (
                                <div className="grid gap-4 xl:grid-cols-2">
                                  {Array.isArray(detail.categoryRatings) && detail.categoryRatings.map((ratingSummary, ratingIndex) => (
                                    <section
                                      key={ratingSummary.category || `category-${ratingIndex}`}
                                      className="rounded-2xl border border-border bg-background p-5 shadow-sm"
                                    >
                                      <h5 className="font-semibold text-foreground mb-3 truncate" title={ratingSummary.category}>
                                        {ratingSummary.category || 'Unknown Category'}
                                      </h5>
                                      <div className="space-y-3">
                                        {[...(ratingSummary.model_ratings || [])]
                                          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                                          .map((entry, index) => (
                                            <div
                                              key={entry.model_id || `model-${index}`}
                                              className="rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm"
                                            >
                                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                                    #{index + 1}
                                                  </span>
                                                  <p className="font-medium text-foreground">
                                                    {entry.model_name || 'Unknown Model'}
                                                  </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <Badge variant="secondary">
                                                    Elo {formatEloRating(entry.rating)}
                                                  </Badge>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                          {(!ratingSummary.model_ratings || ratingSummary.model_ratings.length === 0) && (
                                            <div className="text-sm text-muted-foreground">
                                              No ratings generated for this category.
                                            </div>
                                          )}
                                      </div>
                                    </section>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                                {activeResultTab === "pairwise" && (
                            !analysis ? (
                              <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                <div className="py-10 text-center text-muted-foreground">
                                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                                  Loading pairwise details...
                                </div>
                              </section>
                            ) : (
                              <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
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
                            )
                          )}

                          {activeResultTab === "questions" && (
                            !analysis ? (
                              <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                <div className="py-10 text-center text-muted-foreground">
                                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                                  Loading question details...
                                </div>
                              </section>
                            ) : isQuestionResponsesLoading &&
                              Object.keys(detail.responsesByQuestion).length === 0 ? (
                              <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                <div className="py-10 text-center text-muted-foreground">
                                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                                  Loading question responses...
                                </div>
                              </section>
                            ) : Object.keys(detail.responsesByQuestion).length === 0 ? (
                              <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                                <p className="text-sm text-muted-foreground">
                                  No response records were loaded for this experiment.
                                </p>
                              </section>
                            ) : (
                            <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
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
                                    Click a question to inspect only that question&apos;s blind tests and recorded preferences.
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
                                                      const pairGroups = Array.from(
                                                        testsForQuestion.reduce(
                                                          (acc, test) => {
                                                            const pairKey = getPairKey(
                                                              test.model_a_id,
                                                              test.model_b_id
                                                            );
                                                            const existing = acc.get(pairKey) || {
                                                              pairKey,
                                                              modelAId: test.model_a_id,
                                                              modelBId: test.model_b_id,
                                                              modelAName: getModelName(
                                                                test.model_a_id,
                                                                detail
                                                              ),
                                                              modelBName: getModelName(
                                                                test.model_b_id,
                                                                detail
                                                              ),
                                                              tests: [],
                                                              preferences: [],
                                                              modelAResponse: undefined,
                                                              modelBResponse: undefined,
                                                              modelAVotes: 0,
                                                              modelBVotes: 0,
                                                              bothGoodVotes: 0,
                                                              bothPoorVotes: 0,
                                                              modelAScore: 0,
                                                              modelBScore: 0,
                                                            } satisfies QuestionPairGroup;

                                                            const preferences =
                                                              detail.preferencesByTest[test.id] || [];
                                                            const responsesForQuestion =
                                                              detail.responsesByQuestion[test.question_id] ||
                                                              [];
                                                            existing.tests.push(test);
                                                            existing.preferences.push(...preferences);
                                                            existing.modelAResponse =
                                                              existing.modelAResponse ||
                                                              responsesForQuestion.find(
                                                                (response) =>
                                                                  response.experiment_id === experiment.id &&
                                                                  response.model_id === test.model_a_id
                                                              );
                                                            existing.modelBResponse =
                                                              existing.modelBResponse ||
                                                              responsesForQuestion.find(
                                                                (response) =>
                                                                  response.experiment_id === experiment.id &&
                                                                  response.model_id === test.model_b_id
                                                              );
                                                            existing.modelAVotes += preferences.filter(
                                                              (preference) =>
                                                                preference.preferred_model_id ===
                                                                test.model_a_id
                                                            ).length;
                                                            existing.modelBVotes += preferences.filter(
                                                              (preference) =>
                                                                preference.preferred_model_id ===
                                                                test.model_b_id
                                                            ).length;
                                                            existing.bothGoodVotes += preferences.filter(
                                                              (preference) =>
                                                                preference.is_both_good ||
                                                                preference.result_type === "both_good"
                                                            ).length;
                                                            existing.bothPoorVotes += preferences.filter(
                                                              (preference) =>
                                                                preference.is_both_poor ||
                                                                preference.result_type === "both_poor"
                                                            ).length;
                                                            existing.modelAScore =
                                                              existing.modelAVotes +
                                                              existing.bothGoodVotes;
                                                            existing.modelBScore =
                                                              existing.modelBVotes +
                                                              existing.bothGoodVotes;
                                                            acc.set(pairKey, existing);
                                                            return acc;
                                                          },
                                                          new Map<string, QuestionPairGroup>()
                                                        ).values()
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
                                              {detail.evaluationQuestions.length > 0 && (
                                                <div className="mb-4 rounded-xl border border-border/70 bg-background/80 p-3">
                                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Criteria outcomes
                                                  </p>
                                                  <div className="mt-2 space-y-2">
                                                    {detail.evaluationQuestions.map((questionItem) => {
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
                                                          if (!preference.preferred_model_id) {
                                                            return acc;
                                                          }
                                                          acc[preference.preferred_model_id] =
                                                            (acc[preference.preferred_model_id] ||
                                                              0) + 1;
                                                          return acc;
                                                        }, {})
                                                      ).sort((left, right) => right[1] - left[1])[0];
                                                      const criterionBothGoodCount =
                                                        matchingPreferences.filter(
                                                          (preference) =>
                                                            preference.is_both_good ||
                                                            preference.result_type === "both_good"
                                                        ).length;
                                                      const criterionBothPoorCount =
                                                        matchingPreferences.filter(
                                                          (preference) =>
                                                            preference.is_both_poor ||
                                                            preference.result_type === "both_poor"
                                                        ).length;

                                                      return (
                                                        <div
                                                          key={questionItem.id}
                                                          className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                                                        >
                                                          <span className="text-muted-foreground">
                                                            {questionItem.evaluation_question}
                                                          </span>
                                                          <span className="font-medium text-foreground">
                                                            {criterionLeader
                                                              ? `${getModelName(criterionLeader[0], detail)} (${formatVoteLabel(
                                                                  criterionLeader[1]
                                                                )})`
                                                              : criterionBothGoodCount > 0
                                                                  ? `Both Good (${criterionBothGoodCount})`
                                                                  : criterionBothPoorCount > 0
                                                                    ? `Both Poor (${criterionBothPoorCount})`
                                                                  : "No preference saved"}
                                                          </span>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}

                                              <div className="mt-4 space-y-3">
                                                {pairGroups.length === 0 ? (
                                                  <div className="rounded-xl border border-border/70 bg-background/80 p-4 text-sm text-muted-foreground">
                                                    No blind tests are grouped under this question yet.
                                                  </div>
                                                ) : (
                                                  pairGroups.map((pair) => {
                                                    return (
                                                      <div
                                                        key={pair.pairKey}
                                                        className="rounded-xl border border-border/70 bg-background/80 p-4"
                                                      >
                                                        <div className="flex items-start justify-between gap-3">
                                                          <div className="min-w-0 flex-1">
                                                            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1.5">
                                                              <span className="truncate font-medium text-foreground">
                                                                {pair.modelAName}
                                                              </span>
                                                              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
                                                                {pair.modelAScore}
                                                              </span>
                                                              <span className="text-xs font-semibold tracking-wide text-muted-foreground">
                                                                -
                                                              </span>
                                                              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
                                                                {pair.modelBScore}
                                                              </span>
                                                              <span className="truncate font-medium text-foreground">
                                                                {pair.modelBName}
                                                              </span>
                                                            </div>
                                                          </div>
                                                        </div>

                                                        <div className="mt-4 space-y-3">
                                                          <div className="rounded-lg bg-muted/30 px-3 py-3">
                                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                              <p className="text-sm font-medium text-foreground">
                                                                {pair.modelAName}
                                                              </p>
                                                            </div>
                                                            <div className="max-h-44 overflow-y-auto pr-1">
                                                              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                                                {pair.modelAResponse?.model_response ||
                                                                  "Response not found."}
                                                              </p>
                                                            </div>
                                                          </div>

                                                          <div className="rounded-lg bg-muted/30 px-3 py-3">
                                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                              <p className="text-sm font-medium text-foreground">
                                                                {pair.modelBName}
                                                              </p>
                                                            </div>
                                                            <div className="max-h-44 overflow-y-auto pr-1">
                                                              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                                                {pair.modelBResponse?.model_response ||
                                                                  "Response not found."}
                                                              </p>
                                                            </div>
                                                          </div>
                                                        </div>

                                                        <div className="mt-4 border-t border-border/60 pt-3">
                                                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                            Recorded preferences
                                                          </p>
                                                          <div className="space-y-2">
                                                            {detail.evaluationQuestions.map((questionItem) => {
                                                              const matchingPreferences = pair.preferences.filter(
                                                                (preference) =>
                                                                  preference.evaluation_question_id ===
                                                                  questionItem.id
                                                              );
                                                              const preferredModelName = getPreferenceOutcomeLabel(
                                                                matchingPreferences[0],
                                                                detail,
                                                                pair.tests[0]
                                                              );

                                                              return (
                                                                <div
                                                                  key={questionItem.id}
                                                                  className="grid gap-1 rounded-lg bg-muted/20 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_auto]"
                                                                >
                                                                  <p className="min-w-0 text-muted-foreground">
                                                                    {questionItem.evaluation_question}
                                                                  </p>
                                                                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                                                    <span className="font-medium text-foreground">
                                                                      {preferredModelName}
                                                                    </span>
                                                                    {matchingPreferences[0] && (
                                                                      <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-6 px-2 text-xs"
                                                                        disabled={
                                                                          deletingPreferenceId ===
                                                                          matchingPreferences[0].id
                                                                        }
                                                                        onClick={() =>
                                                                          void handleDeletePreference(
                                                                            experiment.id,
                                                                            matchingPreferences[0].id
                                                                          )
                                                                        }
                                                                      >
                                                                        {deletingPreferenceId ===
                                                                        matchingPreferences[0].id
                                                                          ? "Deleting..."
                                                                          : "Delete"}
                                                                      </Button>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                        </div>

                                                        {pair.tests.some(
                                                          (t) => t.model_a_feedback || t.model_b_feedback
                                                        ) && (
                                                          <div className="mt-4 border-t border-border/60 pt-3">
                                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                              Judge Feedback
                                                            </p>
                                                            <div className="space-y-3">
                                                              {pair.tests.map(
                                                                (test, tIndex) =>
                                                                  (test.model_a_feedback ||
                                                                    test.model_b_feedback) && (
                                                                    <div
                                                                      key={test.id}
                                                                      className="rounded-lg bg-primary/5 p-3 text-sm"
                                                                    >
                                                                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                                                                        Evaluation {tIndex + 1}
                                                                      </p>
                                                                      <div className="grid gap-3 md:grid-cols-2">
                                                                        {test.model_a_feedback && (
                                                                          <div>
                                                                            <p className="mb-1 text-xs font-semibold text-foreground">
                                                                              {pair.modelAName}
                                                                            </p>
                                                                            <p className="italic text-muted-foreground">
                                                                              "{test.model_a_feedback}"
                                                                            </p>
                                                                          </div>
                                                                        )}
                                                                        {test.model_b_feedback && (
                                                                          <div>
                                                                            <p className="mb-1 text-xs font-semibold text-foreground">
                                                                              {pair.modelBName}
                                                                            </p>
                                                                            <p className="italic text-muted-foreground">
                                                                              "{test.model_b_feedback}"
                                                                            </p>
                                                                          </div>
                                                                        )}
                                                                      </div>
                                                                    </div>
                                                                  )
                                                              )}
                                                            </div>
                                                          </div>
                                                        )}

                                                        {(pair.bothGoodVotes > 0 || pair.bothPoorVotes > 0) && (
                                                          <div className="mt-3 flex flex-wrap gap-2">
                                                            {pair.bothGoodVotes > 0 && (
                                                              <Badge variant="outline">
                                                                Both Good: {pair.bothGoodVotes}
                                                              </Badge>
                                                            )}
                                                            {pair.bothPoorVotes > 0 && (
                                                              <Badge variant="outline">
                                                                Both Poor: {pair.bothPoorVotes}
                                                              </Badge>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                            </section>
                            )
                          )}

                          {activeResultTab === "feedbacks" && (
                            <section className="space-y-6">
                              <div className="mb-4">
                                <h4 className="font-semibold text-foreground">Judge Feedbacks</h4>
                                <p className="text-sm text-muted-foreground">
                                  Qualitative feedback provided by judges, grouped by model.
                                </p>
                              </div>

                              {groupedFeedbackEntries.length === 0 ? (
                                <section className="rounded-2xl border border-border bg-background p-5 shadow-sm text-center">
                                  <p className="text-sm text-muted-foreground">
                                    No judge feedback has been recorded for this experiment yet.
                                  </p>
                                </section>
                              ) : (
                                <div className="space-y-8">
                                  {groupedFeedbackEntries.map((group) => (
                                    <div key={group.modelId} className="space-y-4">
                                      <div className="flex items-center gap-2 border-b border-border pb-2">
                                        <h5 className="text-lg font-bold text-foreground">
                                          {group.modelName}
                                        </h5>
                                        <Badge variant="secondary">{group.entries.length}</Badge>
                                      </div>
                                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                        {group.entries.map((entry, idx) => {
                                          const isExpanded = !!expandedFeedbacks[`${entry.testId}-${entry.modelId}`];
                                          return (
                                            <div
                                              key={`${entry.testId}-${entry.modelId}-${idx}`}
                                              className="rounded-xl border border-border bg-background p-5 shadow-sm transition-all hover:border-primary/30"
                                            >
                                              <div className="space-y-3">
                                                <div>
                                                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                                                    Feedback
                                                  </p>
                                                  <p className="mt-1 text-sm italic text-foreground leading-relaxed">
                                                    &quot;{entry.feedback}&quot;
                                                  </p>
                                                </div>

                                                <div className="pt-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleFeedback(entry.testId, entry.modelId)}
                                                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                                                  >
                                                    {isExpanded ? (
                                                      <>
                                                        Hide Context
                                                        <ChevronUp className="h-3 w-3" />
                                                      </>
                                                    ) : (
                                                      <>
                                                        Show Question & Response
                                                        <ChevronDown className="h-3 w-3" />
                                                      </>
                                                    )}
                                                  </button>

                                                  {isExpanded && (
                                                    <div className="mt-3 space-y-3 border-t border-border/50 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                      <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                          Question
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">
                                                          {entry.questionText}
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                          Model Response
                                                        </p>
                                                        <div className="mt-1 max-h-40 overflow-y-auto rounded bg-muted/30 p-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                          {entry.modelResponse}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </section>
                          )}

                          {activeResultTab === "diagnostics" && (
                            <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <h4 className="font-semibold text-foreground">Failed Responses</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Recent model failures captured by the backend run metadata.
                                  </p>
                                </div>
                                <Badge variant="secondary">{failedResponseDetails.length}</Badge>
                              </div>
                              <div className="mb-4 max-w-sm">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                  Filter by model
                                </p>
                                <Select
                                  value={diagnosticsModelFilter}
                                  onValueChange={setDiagnosticsModelFilter}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="All models" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ALL">All models</SelectItem>
                                    {diagnosticsModelOptions.map(([modelId, modelName]) => (
                                      <SelectItem key={modelId} value={modelId}>
                                        {modelName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {filteredFailedResponseDetails.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No failures were recorded for this experiment.
                                </p>
                              ) : (
                                <div className="grid gap-4 xl:grid-cols-2">
                                  {filteredFailedResponseDetails.map((item, index) => (
                                    <div
                                      key={`${item.testId}-${item.modelId}-${index}`}
                                      className="rounded-xl border border-border bg-muted/20 p-4 shadow-sm"
                                    >
                                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">
                                              {item.modelName}
                                            </p>
                                            <Badge variant="outline">Failure #{index + 1}</Badge>
                                          </div>
                                          {item.reason && (
                                            <p className="mt-2 text-xs text-muted-foreground">
                                              Reason: {item.reason}
                                            </p>
                                          )}
                                        </div>
                                        <div className="space-y-2">
                                          <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                                            <p className="text-sm text-foreground">
                                              {item.questionText}
                                            </p>
                                          </div>
                                          {item.error && (
                                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                                              <p className="text-sm text-destructive">
                                                Error: {item.error}
                                              </p>
                                            </div>
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
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title={`Archived Experiments (${archivedExperiments.length})`}>
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleToggleArchivedExperiments()}
            className="w-full justify-between"
          >
            <span>{isArchivedExpanded ? "Hide archived experiments" : "Show archived experiments"}</span>
            {isArchivedExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isArchivedExpanded && (
            <>
              {isLoadingArchivedExperiments ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                  Loading archived experiments...
                </div>
              ) : archivedExperiments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No archived experiments.</p>
              ) : (
                <div className="space-y-3">
                  {archivedExperiments.map((experiment) => {
                    const questionPoolName =
                      inputPoolMap[experiment.input_pool_id]?.name || "Unknown Question Pool";
                    return (
                      <div
                        key={experiment.id}
                        className="rounded-xl border border-border bg-muted/10 px-4 py-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                {experiment.name}
                              </h3>
                              <Badge variant="outline">Archived</Badge>
                              <Badge variant="secondary">
                                {formatExperimentStatus(experiment.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Question Pool: <strong>{questionPoolName}</strong>
                            </p>
                            {experiment.evaluation_criteria && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Criteria: {experiment.evaluation_criteria}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              Created: {new Date(experiment.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
