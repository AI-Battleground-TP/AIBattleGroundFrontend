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

export interface BackendTest {
  id: string;
  organization_id: string;
  input_pool_id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at: string;
}

interface ApiErrorPayload {
  detail?: string;
  message?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  "http://10.8.51.106:8001/api/v1";

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
  requestJson<BackendUser>("/auth/me", {
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

export const createTest = (
  accessToken: string,
  payload: {
    name: string;
    description?: string;
    status: string;
    input_pool_id: string;
    organization_id: string;
    model_ids?: string[];
  }
) =>
  requestJson<BackendTest>("/tests", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

export const startTest = (accessToken: string, testId: string) =>
  requestJson<{ message: string; task_id: string; test_id: string }>(
    `/tests/${testId}/start`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
