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
  status: string;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
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
  preferred_model_id: string;
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
  accessToken: string,
  poolId: string,
  skip = 0,
  limit = 1000
) =>
  requestJson<BackendQuestion[]>(
    `/questions/pool/${poolId}?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

export const getExperiments = (accessToken: string, skip = 0, limit = 100) =>
  requestJson<BackendExperiment[]>(`/experiments?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
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
    preferred_model_id: string;
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
