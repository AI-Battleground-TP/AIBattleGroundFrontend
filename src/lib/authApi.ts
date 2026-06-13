export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  created_by_admin_id?: string | null;
}

export interface BackendAuthMe {
  name: string;
  surname: string;
  phone?: string | null;
  email: string;
  organization_id: string;
  org_role: "HEAD" | "JUDGE";
  experiments_total_in_organization: number;
  experiments_participated: number;
  tests_answered_in_organization: number;
}

export interface OrganizationItem {
  id: string;
  name: string;
  created_at?: string;
}

export interface BackendInputPool {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface BackendQuestion {
  id: string;
  input_pool_id: string;
  category?: string | null;
  text: string;
  type: string;
  metadata_json?: unknown;
}

export interface BackendModel {
  id: string;
  organization_id: string;
  name: string;
  api_key: string;
  model_string: string;
  config_json?: unknown;
  is_active: boolean;
}

export type BackendModelConfigTemplate = Record<string, unknown>;

export interface BackendModelConfigTemplateResponse {
  config: BackendModelConfigTemplate;
  field_help?: Record<string, unknown>;
}

export interface LlmProviderInfo {
  id: string;
  kind: string;
  model_string_hint: string;
  env_vars: string[];
  notes?: string | null;
}

export interface LlmProvidersResponse {
  providers: LlmProviderInfo[];
}

export interface BackendExperiment {
  id: string;
  organization_id: string;
  input_pool_id: string;
  name: string;
  description?: string | null;
  evaluation_criteria?: string | null;
  source?: "generated" | "imported";
  status: string;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
}

export interface ExperimentImportRequest {
  name: string;
  input_pool_name: string;
  description?: string | null;
  input_pool_description?: string | null;
  evaluation_criteria?: string | null;
  organization_id: string;
  evaluation_questions: { evaluation_question: string }[];
  questions: { text: string; category?: string | null; type?: string }[];
  models: { name: string }[];
  responses: { model_name: string; question_index: number; text: string }[];
}

export interface BackendEvaluationQuestion {
  id: string;
  experiment_id: string;
  evaluation_question: string;
  created_at: string;
}

export interface BackendExperimentModelPrompt {
  id: string;
  experiment_id: string;
  model_id: string;
  system_prompt: string;
  created_at: string;
}

export interface BackendTest {
  id: string;
  experiment_id: string;
  judge_id: string;
  model_a_id: string;
  model_b_id: string;
  question_id: string;
  feedback_a?: string | null;
  feedback_b?: string | null;
  created_at: string;
}

export interface BackendResponseItem {
  id: string;
  question_id: string;
  model_id: string;
  experiment_id: string;
  model_response: string;
  created_at: string;
}

export interface BackendDrawBlindTestResponse {
  test: BackendTest;
  question_text: string;
  response_a: BackendResponseItem;
  response_b: BackendResponseItem;
}

export interface BackendPreference {
  id: string;
  evaluation_question_id: string;
  test_id: string;
  preferred_model_id: string | null;
  result_type?: string | null;
  is_both_good?: boolean;
  is_both_poor?: boolean;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
}

export interface BackendModelPreferenceStatRow {
  model_id: string;
  model_name: string;
  preference_count: number;
  share_of_total: number;
}

export interface BackendExperimentModelPreferenceSummary {
  experiment_id: string;
  test_ids: string[];
  total_tests: number;
  total_preferences: number;
  model_breakdown: BackendModelPreferenceStatRow[];
  top_preferred_model_ids: string[];
  top_preference_count: number;
}

export interface BackendExperimentModelRatingRow {
  id: string;
  experiment_id: string;
  model_id: string;
  model_name: string;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  both_good_count: number;
  both_poor_count: number;
  quality_penalty: number;
  created_at: string;
  updated_at: string;
}

export interface BackendExperimentModelRatingsSummary {
  experiment_id: string;
  initial_rating: number;
  k_factor: number;
  both_poor_penalty: number;
  model_ratings: BackendExperimentModelRatingRow[];
}

export interface BackendExperimentModelAppearanceSummary {
  experiment_id: string;
  model_id: string;
  model_name: string;
  appearance_count: number;
  selected_count: number;
  not_selected_count: number;
  both_good_count: number;
  both_poor_count: number;
  selection_rate: number;
}

export interface BackendModelTokenUsageRow {
  model_id: string;
  model_name: string;
  response_count: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number | null;
  cached_tokens: number | null;
  total_cost_usd: number | null;
}

export interface BackendExperimentModelTokenUsageSummary {
  experiment_id: string;
  total_responses: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens: number | null;
  cached_tokens: number | null;
  total_cost_usd: number | null;
  model_breakdown: BackendModelTokenUsageRow[];
}

export interface BackendJudgeOutcomeDistribution {
  model_a: number;
  model_b: number;
  both_good: number;
  both_poor: number;
}

export interface BackendJudgeBiasSummary {
  judge_id: string;
  experiment_id: string | null;
  experiment_name: string | null;
  total_evaluations: number;
  left_pick_count: number;
  right_pick_count: number;
  both_good_count: number;
  both_poor_count: number;
  left_pick_rate: number;
  right_pick_rate: number;
  side_bias_score: number;
  long_pick_count: number;
  short_pick_count: number;
  equal_length_count: number;
  length_eligible_count: number;
  long_pick_rate: number;
  short_pick_rate: number;
  length_bias_score: number;
  avg_completion_tokens_chosen: number | null;
  avg_completion_tokens_rejected: number | null;
  outcome_distribution: BackendJudgeOutcomeDistribution;
}

export interface BackendJudgeAnalyticsListItem {
  judge_id: string;
  judge_name: string;
  judge_email: string;
  summary: BackendJudgeBiasSummary;
}

export interface BackendJudgeAnalyticsListResponse {
  organization_id: string;
  judges: BackendJudgeAnalyticsListItem[];
  from_date: string | null;
  to_date: string | null;
}

export interface BackendJudgeAnalyticsDetailResponse {
  judge_id: string;
  judge_name: string;
  judge_email: string;
  global_summary: BackendJudgeBiasSummary;
  experiment_summaries: BackendJudgeBiasSummary[];
  from_date: string | null;
  to_date: string | null;
}

interface ApiErrorPayload {
  detail?: string;
  message?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  "http://10.8.34.73:8001/api/v1";

const resolveErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.detail || payload.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const requestJson = async <T>(
  path: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await resolveErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const loginRequest = (email: string, password: string) =>
  requestJson<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signupRequest = (data: {
  email: string;
  password: string;
  name: string;
  surname: string;
  phone?: string;
}) =>
  requestJson<BackendUser>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMe = (accessToken: string) =>
  requestJson<BackendAuthMe>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getMyOrganizations = (accessToken: string) =>
  requestJson<OrganizationItem[]>("/organizations", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const createOrganization = (
  accessToken: string,
  organizationName: string
) =>
  requestJson<OrganizationItem>("/organizations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name: organizationName }),
  });

export const joinOrganization = (
  accessToken: string,
  organizationId: string
) =>
  requestJson<OrganizationItem>("/organizations/join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ organization_id: organizationId }),
  });

export const selectOrganizationToken = (
  accessToken: string,
  organizationId: string
): Promise<TokenResponse> =>
  requestJson<TokenResponse>("/auth/select-org", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ organization_id: organizationId }),
  });

export const switchOrganizationToken = (
  accessToken: string,
  organizationId: string
): Promise<TokenResponse> =>
  requestJson<TokenResponse>("/auth/switch-org", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ organization_id: organizationId }),
  });

export const detectHeadAccess = async (
  accessToken: string,
  organizationId: string
): Promise<boolean> => {
  const response = await fetch(
    `${API_BASE_URL}/organizations/${organizationId}/members`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.ok) {
    return true;
  }

  if (response.status === 403) {
    return false;
  }

  throw new Error(await resolveErrorMessage(response));
};

export const getInputPools = (accessToken: string, skip = 0, limit = 100) =>
  requestJson<BackendInputPool[]>(`/input-pools?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const createInputPool = (
  accessToken: string,
  payload: {
    organization_id: string;
    name: string;
    description?: string;
  }
) =>
  requestJson<BackendInputPool>("/input-pools", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const deleteInputPool = (
  accessToken: string,
  poolId: string
) =>
  requestJson<{ message: string; deleted_pool_id: string }>(
    `/input-pools/${poolId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const updateInputPool = (
  accessToken: string,
  poolId: string,
  payload: {
    name?: string;
    description?: string;
  }
) =>
  requestJson<BackendInputPool>(`/input-pools/${poolId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const getInputPoolById = (accessToken: string, poolId: string) =>
  requestJson<BackendInputPool>(`/input-pools/${poolId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getQuestionsByPool = (
  poolId: string,
  skip = 0,
  limit = 1000
) =>
  requestJson<BackendQuestion[]>(
    `/questions/pool/${poolId}?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
    }
  );

export const createQuestionsBulk = (
  accessToken: string,
  payload: {
    input_pool_id: string;
    questions: Array<{
      category?: string;
      text: string;
      type: string;
      metadata_json?: unknown;
    }>;
  }
) =>
  requestJson<BackendQuestion[]>("/questions/bulk", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const createQuestion = (
  accessToken: string,
  payload: {
    input_pool_id: string;
    text: string;
    category?: string;
    type: string;
    metadata_json?: unknown;
  }
) =>
  requestJson<BackendQuestion>("/questions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const deleteQuestion = (
  accessToken: string,
  questionId: string
) =>
  requestJson<{ message: string; deleted_question_id: string }>(
    `/questions/${questionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getQuestions = (accessToken: string, skip = 0, limit = 1000) =>
  requestJson<BackendQuestion[]>(`/questions?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getQuestionById = (accessToken: string, questionId: string) =>
  requestJson<BackendQuestion>(`/questions/${questionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getQuestionsByCategory = (
  accessToken: string,
  category: string,
  skip = 0,
  limit = 1000
) =>
  requestJson<BackendQuestion[]>(
    `/questions/category/${encodeURIComponent(category)}?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getQuestionsByType = (
  accessToken: string,
  questionType: string,
  skip = 0,
  limit = 1000
) =>
  requestJson<BackendQuestion[]>(
    `/questions/type/${encodeURIComponent(questionType)}?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const updateQuestion = (
  accessToken: string,
  questionId: string,
  payload: {
    category?: string;
    text?: string;
    type?: string;
    metadata_json?: unknown;
  }
) =>
  requestJson<BackendQuestion>(`/questions/${questionId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const getModels = (accessToken: string, skip = 0, limit = 100) =>
  requestJson<BackendModel[]>(`/models?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const createModel = (
  accessToken: string,
  payload: {
    name: string;
    api_key: string;
    model_string: string;
    config_json?: Record<string, unknown>;
    is_active?: boolean;
  }
) =>
  requestJson<BackendModel>("/models", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const updateModel = (
  accessToken: string,
  modelId: string,
  payload: {
    name?: string;
    api_key?: string;
  }
) =>
  requestJson<BackendModel>(`/models/${modelId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const patchModelArchive = (
  accessToken: string,
  modelId: string,
  isArchived: boolean
) =>
  requestJson<BackendModel>(`/models/${modelId}/archive`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ is_archived: isArchived }),
  });

export const deleteModel = (accessToken: string, modelId: string) =>
  requestJson<{ message: string; deleted_model_id: string }>(`/models/${modelId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const duplicateModel = (
  accessToken: string,
  modelId: string,
  body?: { name?: string; config_json?: Record<string, unknown> }
) =>
  requestJson<BackendModel>(`/models/${modelId}/duplicate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body ?? {}),
  });

export const getModelConfigTemplate = async (accessToken: string, provider: string) => {
  const payload = await requestJson<
    BackendModelConfigTemplate | BackendModelConfigTemplateResponse
  >(
    `/models/config-template?provider=${encodeURIComponent(provider)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "config" in payload
  ) {
    return (payload as BackendModelConfigTemplateResponse).config;
  }

  return payload as BackendModelConfigTemplate;
};

export const getLlmProviders = (accessToken: string) =>
  requestJson<LlmProvidersResponse>("/llm/providers", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const createExperiment = (
  accessToken: string,
  payload: {
    name: string;
    description?: string;
    evaluation_criteria?: string;
    status: string;
    input_pool_id: string;
    organization_id: string;
    model_ids?: string[];
  }
) =>
  requestJson<BackendExperiment>("/experiments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const importExperiment = (
  accessToken: string,
  payload: ExperimentImportRequest
) =>
  requestJson<BackendExperiment>("/experiments/import", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const startExperiment = (accessToken: string, experimentId: string) =>
  requestJson<{ message: string; task_id: string; experiment_id: string }>(
    `/experiments/${experimentId}/start`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const archiveExperiment = (accessToken: string, experimentId: string) =>
  requestJson<BackendExperiment>(`/experiments/${experimentId}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const stopExperiment = (accessToken: string, experimentId: string) =>
  requestJson<BackendExperiment>(`/experiments/${experimentId}/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const exportExperiment = async (accessToken: string, experimentId: string) => {
  const response = await fetch(`${API_BASE_URL}/experiments/${experimentId}/export`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await resolveErrorMessage(response));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);

  return {
    blob,
    filename: filenameMatch?.[1] || `experiment-${experimentId}.zip`,
  };
};

export const attachModelToExperiment = (
  accessToken: string,
  experimentId: string,
  modelId: string,
  systemPrompt: string
) =>
  requestJson<BackendExperimentModelPrompt>(
    `/experiments/${experimentId}/models/${modelId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ system_prompt: systemPrompt }),
    }
  );

export const getExperimentModels = (
  experimentId: string
) =>
  requestJson<BackendExperimentModelPrompt[]>(
    `/experiments/${experimentId}/models`,
    {
      method: "GET",
    }
  );

export const getActiveJudgeExperiments = (
  accessToken: string,
  skip = 0,
  limit = 100
) =>
  requestJson<BackendExperiment[]>(
    `/experiments/active/judge?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getActiveExperiments = (
  accessToken: string,
  skip = 0,
  limit = 100
) =>
  requestJson<BackendExperiment[]>(`/experiments/active?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getCompletedJudgeExperiments = (
  accessToken: string,
  skip = 0,
  limit = 100
) =>
  requestJson<BackendExperiment[]>(
    `/experiments/completed/judge?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getCompletedExperiments = (
  accessToken: string,
  skip = 0,
  limit = 100
) =>
  requestJson<BackendExperiment[]>(`/experiments/completed?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getArchivedExperiments = (
  accessToken: string,
  skip = 0,
  limit = 100
) =>
  requestJson<BackendExperiment[]>(
    `/experiments/archived?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getExperiments = (accessToken: string, skip = 0, limit = 100) =>
  requestJson<BackendExperiment[]>(`/experiments?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getExperimentById = (experimentId: string) =>
  requestJson<BackendExperiment>(`/experiments/${experimentId}`, {
    method: "GET",
  });

export const createEvaluationQuestion = (
  accessToken: string,
  payload: {
    experiment_id: string;
    evaluation_question: string;
  }
) =>
  requestJson<BackendEvaluationQuestion>("/evaluation-questions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const getEvaluationQuestionsByExperiment = (
  accessToken: string,
  experimentId: string,
  skip = 0,
  limit = 100
) =>
  requestJson<BackendEvaluationQuestion[]>(
    `/evaluation-questions/experiment/${experimentId}?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const drawBlindTest = (accessToken: string, experimentId: string) =>
  requestJson<BackendDrawBlindTestResponse>(
    `/experiments/${experimentId}/draw-blind-test`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const createPreference = (
  accessToken: string,
  payload: {
    evaluation_question_id: string;
    test_id: string;
    preferred_model_id?: string | null;
    result_type?: string | null;
    is_both_good?: boolean;
    is_both_poor?: boolean;
    metadata_json?: Record<string, unknown> | null;
  }
) =>
  requestJson<BackendPreference>("/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const getPreferencesByTest = (
  accessToken: string,
  testId: string,
  skip = 0,
  limit = 100
) =>
  requestJson<BackendPreference[]>(
    `/preferences/test/${testId}?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getPreferences = (accessToken: string, skip = 0, limit = 1000) =>
  requestJson<BackendPreference[]>(`/preferences?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getResponsesByQuestion = (
  accessToken: string,
  questionId: string,
  skip = 0,
  limit = 100
) =>
  requestJson<BackendResponseItem[]>(
    `/responses/question/${questionId}?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getTestsByExperiment = (
  accessToken: string,
  experimentId: string,
  skip = 0,
  limit = 1000
) =>
  requestJson<BackendTest[]>(
    `/tests/experiment/${experimentId}?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getMyTests = (accessToken: string, skip = 0, limit = 1000) =>
  requestJson<BackendTest[]>(`/tests/my?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getJudgeExperiment = (accessToken: string, experimentId: string) =>
  requestJson<BackendExperiment>(`/experiments/${experimentId}/judge`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getExperimentModelPreferenceSummary = (
  accessToken: string,
  experimentId: string
) =>
  requestJson<BackendExperimentModelPreferenceSummary>(
    `/analytics/experiments/${experimentId}/model-preference-summary`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getExperimentModelRatings = (
  experimentId: string
) =>
  requestJson<BackendExperimentModelRatingsSummary>(
    `/analytics/experiments/${experimentId}/model-ratings`,
    {
      method: "GET",
    }
  );

export const getExperimentModelAppearanceSummary = (
  accessToken: string,
  experimentId: string,
  modelId: string
) =>
  requestJson<BackendExperimentModelAppearanceSummary>(
    `/analytics/experiments/${experimentId}/models/${modelId}/appearance-summary`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getExperimentModelTokenUsage = (
  accessToken: string,
  experimentId: string
) =>
  requestJson<BackendExperimentModelTokenUsageSummary>(
    `/analytics/experiments/${experimentId}/model-token-usage`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const getJudgeAnalyticsList = (accessToken: string) =>
  requestJson<BackendJudgeAnalyticsListResponse>("/analytics/judges", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const getJudgeAnalyticsDetail = (accessToken: string, judgeId: string) =>
  requestJson<BackendJudgeAnalyticsDetailResponse>(`/analytics/judges/${judgeId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const removeJudgeFromOrganization = (
  accessToken: string,
  organizationId: string,
  userId: string
) =>
  requestJson<{ id: string; user_id: string; organization_id: string }>(
    `/organizations/${organizationId}/members/${userId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const deleteExperimentPreference = (
  accessToken: string,
  preferenceId: string
) =>
  requestJson<{ message: string; deleted_preference_id: string }>(
    `/experiments/preferences/${preferenceId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

export const removeModelFromExperiment = (
  accessToken: string,
  experimentId: string,
  modelId: string
) =>
  requestJson<{
    message: string;
    experiment_id: string;
    model_id: string;
    deleted_responses?: number;
    deleted_tests?: number;
    deleted_preferences?: number;
  }>(`/experiments/${experimentId}/models/${modelId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const retryExperimentModelResponses = (
  accessToken: string,
  experimentId: string,
  modelId: string
) =>
  requestJson<{
    message: string;
    task_id: string;
    experiment_id: string;
    model_id: string;
  }>(`/experiments/${experimentId}/models/${modelId}/retry`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export interface BackendEvaluationQuestionRatingSummary {
  evaluation_question_id: string;
  evaluation_question: string;
  model_ratings: BackendExperimentModelRatingRow[];
}

export interface BackendCategoryRatingSummary {
  category: string;
  model_ratings: BackendExperimentModelRatingRow[];
}

export const getExperimentCategoryRatings = (
  experimentId: string
) =>
  requestJson<BackendCategoryRatingSummary[]>(
    `/analytics/experiments/${experimentId}/category-ratings`,
    {
      method: "GET",
    }
  );

export const getExperimentEvaluationQuestionRatings = (
  accessToken: string,
  experimentId: string
) =>
  requestJson<BackendEvaluationQuestionRatingSummary[]>(
    `/analytics/experiments/${experimentId}/evaluation-question-ratings`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
