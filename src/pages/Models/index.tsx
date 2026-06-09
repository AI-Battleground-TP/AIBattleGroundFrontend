import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Info, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button, Card, Modal, Toast } from "../../components";
import { Badge } from "../../components/ui/badge";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useApp } from "../../context/AppContext";
import type { ModelPoolItem } from "../../types";
import type {
  BackendModelConfigTemplate,
  LlmProviderInfo,
} from "../../lib/authApi";
import {
  getLlmProviders,
  getModelConfigTemplate,
} from "../../lib/authApi";

const ACCESS_TOKEN_KEY = "bt_access_token";
const SUPPORTED_PROVIDER_IDS = [
  "aisuite_azure",
  "aisuite_openai",
  "aisuite_aws",
  "aisuite_huggingface",
  "openrouter",
] as const;

const FALLBACK_PROVIDERS: LlmProviderInfo[] = [
  {
    id: "openrouter",
    kind: "openrouter",
    model_string_hint: "OpenRouter model id, e.g. anthropic/claude-3.5-sonnet",
    env_vars: ["OPENROUTER_API_URL", "OPENROUTER_API_KEY"],
  },
  {
    id: "aisuite_openai",
    kind: "aisuite",
    model_string_hint: "OpenAI model name, e.g. gpt-4o",
    env_vars: ["OPENAI_API_KEY"],
  },
  {
    id: "aisuite_azure",
    kind: "aisuite",
    model_string_hint: "Azure deployment name",
    env_vars: ["AZURE_BASE_URL", "AZURE_API_KEY", "AZURE_API_VERSION"],
  },
  {
    id: "aisuite_aws",
    kind: "aisuite",
    model_string_hint: "Bedrock model id, e.g. anthropic.claude-3-5-sonnet-20240620-v1:0",
    env_vars: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  },
  {
    id: "aisuite_huggingface",
    kind: "aisuite",
    model_string_hint: "HF repo id, e.g. org/fine-tuned-model or huggingface:org/fine-tuned-model",
    env_vars: ["HF_TOKEN"],
  },
];

type SupportedProviderId = (typeof SUPPORTED_PROVIDER_IDS)[number];
type ReasoningEffort = "low" | "medium" | "high";
type DataCollection = "allow" | "deny";
type RouterSort = "latency" | "price" | "throughput";

type ConfigDraft = {
  temperature: string;
  topP: string;
  topK: string;
  maxTokens: string;
  frequencyPenalty: string;
  presencePenalty: string;
  seed: string;
  reasoningEnabled: boolean;
  reasoningEffort: ReasoningEffort;
  reasoningMaxTokens: string;
  providerOrder: string;
  providerOnly: string;
  providerIgnore: string;
  allowFallbacks: boolean;
  requireParameters: boolean;
  dataCollection: DataCollection;
  zdr: boolean;
  sort: RouterSort;
  fallbackModels: string;
  strictMode: boolean;
  denyUnsupported: boolean;
  requiredFeatures: string;
  openaiConfigApiKey: string;
  openaiOrganization: string;
  openaiProject: string;
  azureConfigApiKey: string;
  azureBaseUrl: string;
  azureApiVersion: string;
  awsRegion: string;
  awsProfileName: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken: string;
  aisuiteKwargsText: string;
};

type ModelDraft = {
  name: string;
  providerId: SupportedProviderId;
  modelString: string;
  apiKey: string;
  config: ConfigDraft;
  isActive: boolean;
};

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: "OpenRouter",
  aisuite_openai: "OpenAI",
  aisuite_azure: "Azure",
  aisuite_aws: "AWS",
  aisuite_huggingface: "Hugging Face",
};

const API_KEY_MASK_PREFIX = "************";

const maskApiKey = (apiKey: string) => {
  if (!apiKey) {
    return "Uses config/env fallback";
  }
  return `${API_KEY_MASK_PREFIX}${apiKey.slice(-4)}`;
};

const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

const emptyConfigDraft = (): ConfigDraft => ({
  temperature: "1",
  topP: "1",
  topK: "50",
  maxTokens: "1200",
  frequencyPenalty: "0",
  presencePenalty: "0",
  seed: "42",
  reasoningEnabled: true,
  reasoningEffort: "medium",
  reasoningMaxTokens: "1200",
  providerOrder: "",
  providerOnly: "",
  providerIgnore: "",
  allowFallbacks: true,
  requireParameters: false,
  dataCollection: "allow",
  zdr: false,
  sort: "latency",
  fallbackModels: "",
  strictMode: false,
  denyUnsupported: false,
  requiredFeatures: "",
  openaiConfigApiKey: "",
  openaiOrganization: "",
  openaiProject: "",
  azureConfigApiKey: "",
  azureBaseUrl: "",
  azureApiVersion: "",
  awsRegion: "us-east-1",
  awsProfileName: "",
  awsAccessKeyId: "",
  awsSecretAccessKey: "",
  awsSessionToken: "",
  aisuiteKwargsText: "{}",
});

const emptyDraft = (providerId: SupportedProviderId): ModelDraft => ({
  name: "",
  providerId,
  modelString: "",
  apiKey: "",
  config: emptyConfigDraft(),
  isActive: true,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getRecord = (value: unknown, key: string) =>
  isRecord(value) && isRecord(value[key]) ? (value[key] as Record<string, unknown>) : {};

const getString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getNumberText = (value: unknown, fallback: string) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;

const getBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const listToText = (value: unknown) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string").join("\n") : "";

const textToList = (value: string) =>
  value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);

const optionalNumber = (
  value: string,
  label: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  }
) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  if (options?.integer && !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }
  if (options?.min !== undefined && parsed < options.min) {
    throw new Error(`${label} must be at least ${options.min}.`);
  }
  if (options?.max !== undefined && parsed > options.max) {
    throw new Error(`${label} must be at most ${options.max}.`);
  }
  return parsed;
};

const parseObjectJson = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      throw new Error("Value must be an object.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${label} is invalid: ${error.message}`);
    }
    throw new Error(`${label} is invalid.`);
  }
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractDuplicateStem = (displayName: string) => {
  const match = displayName.match(/^(.*?)(?: duplicated(?: (\d+))?)$/);
  return match ? match[1] : displayName;
};

const nextDuplicateDisplayName = (sourceName: string, existingNames: string[]) => {
  const stem = extractDuplicateStem(sourceName);
  const pattern = new RegExp(`^${escapeRegExp(stem)} duplicated(?: (\\d+))?$`);
  let max = 0;
  for (const name of existingNames) {
    const match = name.match(pattern);
    if (!match) {
      continue;
    }
    max = Math.max(max, match[1] === undefined ? 1 : parseInt(match[1], 10));
  }
  return max === 0 ? `${stem} duplicated` : `${stem} duplicated ${max + 1}`;
};

const configDraftFromConfig = (configJson: unknown): ConfigDraft => {
  const config = isRecord(configJson) ? configJson : {};
  const sampling = getRecord(config, "sampling");
  const reasoning = getRecord(config, "reasoning");
  const providerPolicy = getRecord(config, "provider_policy");
  const fallback = getRecord(config, "fallback");
  const capabilityPolicy = getRecord(config, "capability_policy");
  const extra = getRecord(config, "extra");
  const aisuite = getRecord(extra, "aisuite");
  const openai = getRecord(aisuite, "openai");
  const azure = getRecord(aisuite, "azure");
  const aws = getRecord(aisuite, "aws");
  const aisuiteKwargs = isRecord(extra.aisuite_kwargs) ? extra.aisuite_kwargs : {};

  return {
    ...emptyConfigDraft(),
    temperature: getNumberText(sampling.temperature, "1"),
    topP: getNumberText(sampling.top_p, "1"),
    topK: getNumberText(sampling.top_k, "50"),
    maxTokens: getNumberText(sampling.max_tokens, "1200"),
    frequencyPenalty: getNumberText(sampling.frequency_penalty, "0"),
    presencePenalty: getNumberText(sampling.presence_penalty, "0"),
    seed: getNumberText(sampling.seed, "42"),
    reasoningEnabled: getBoolean(reasoning.enabled, true),
    reasoningEffort: ["low", "medium", "high"].includes(String(reasoning.effort))
      ? (reasoning.effort as ReasoningEffort)
      : "medium",
    reasoningMaxTokens: getNumberText(reasoning.max_reasoning_tokens, "1200"),
    providerOrder: listToText(providerPolicy.order),
    providerOnly: listToText(providerPolicy.only),
    providerIgnore: listToText(providerPolicy.ignore),
    allowFallbacks: getBoolean(providerPolicy.allow_fallbacks, true),
    requireParameters: getBoolean(providerPolicy.require_parameters, false),
    dataCollection: providerPolicy.data_collection === "deny" ? "deny" : "allow",
    zdr: getBoolean(providerPolicy.zdr, false),
    sort: ["price", "latency", "throughput"].includes(String(providerPolicy.sort))
      ? (providerPolicy.sort as RouterSort)
      : "latency",
    fallbackModels: listToText(fallback.models),
    strictMode: getBoolean(capabilityPolicy.strict_mode, false),
    denyUnsupported: getBoolean(capabilityPolicy.deny_unsupported, false),
    requiredFeatures: listToText(capabilityPolicy.required_features),
    openaiConfigApiKey: getString(openai.api_key),
    openaiOrganization: getString(openai.organization),
    openaiProject: getString(openai.project),
    azureConfigApiKey: getString(azure.api_key),
    azureBaseUrl: getString(azure.base_url),
    azureApiVersion: getString(azure.api_version),
    awsRegion: getString(aws.region_name, "us-east-1"),
    awsProfileName: getString(aws.profile_name),
    awsAccessKeyId: getString(aws.aws_access_key_id),
    awsSecretAccessKey: getString(aws.aws_secret_access_key),
    awsSessionToken: getString(aws.aws_session_token),
    aisuiteKwargsText: JSON.stringify(aisuiteKwargs, null, 2),
  };
};

const buildPayloadConfig = (draft: ModelDraft) => {
  const config = draft.config;
  const aisuiteKwargs = parseObjectJson(config.aisuiteKwargsText, "Advanced kwargs");
  const extra: Record<string, unknown> = {};

  if (draft.providerId === "aisuite_openai") {
    extra.aisuite = {
      openai: {
        api_key: config.openaiConfigApiKey.trim(),
        organization: config.openaiOrganization.trim(),
        project: config.openaiProject.trim(),
      },
    };
    extra.aisuite_kwargs = aisuiteKwargs;
  }

  if (draft.providerId === "aisuite_azure") {
    extra.aisuite = {
      azure: {
        api_key: config.azureConfigApiKey.trim(),
        base_url: config.azureBaseUrl.trim(),
        api_version: config.azureApiVersion.trim(),
      },
    };
    extra.aisuite_kwargs = aisuiteKwargs;
  }

  if (draft.providerId === "aisuite_aws") {
    extra.aisuite = {
      aws: {
        region_name: config.awsRegion.trim(),
        profile_name: config.awsProfileName.trim(),
        aws_access_key_id: config.awsAccessKeyId.trim(),
        aws_secret_access_key: config.awsSecretAccessKey.trim(),
        aws_session_token: config.awsSessionToken.trim(),
      },
    };
    extra.aisuite_kwargs = aisuiteKwargs;
  }

  return {
    version: 1,
    provider: draft.providerId,
    sampling: {
      temperature: optionalNumber(config.temperature, "Temperature", { min: 0, max: 2 }),
      top_p: optionalNumber(config.topP, "Top P", { min: 0, max: 1 }),
      top_k: optionalNumber(config.topK, "Top K", { min: 1, integer: true }),
      max_tokens: optionalNumber(config.maxTokens, "Max tokens", { min: 1, integer: true }),
      frequency_penalty: optionalNumber(config.frequencyPenalty, "Frequency penalty", { min: -2, max: 2 }),
      presence_penalty: optionalNumber(config.presencePenalty, "Presence penalty", { min: -2, max: 2 }),
      seed: optionalNumber(config.seed, "Seed", { integer: true }),
    },
    reasoning: {
      enabled: config.reasoningEnabled,
      effort: config.reasoningEffort,
      max_reasoning_tokens: optionalNumber(config.reasoningMaxTokens, "Reasoning tokens", {
        min: 1,
        integer: true,
      }),
    },
    provider_policy: {
      order: textToList(config.providerOrder),
      allow_fallbacks: config.allowFallbacks,
      require_parameters: config.requireParameters,
      only: textToList(config.providerOnly),
      ignore: textToList(config.providerIgnore),
      data_collection: config.dataCollection,
      zdr: config.zdr,
      sort: config.sort,
    },
    fallback: {
      models: textToList(config.fallbackModels),
      route: "fallback",
    },
    capability_policy: {
      strict_mode: config.strictMode,
      required_features: textToList(config.requiredFeatures),
      deny_unsupported: config.denyUnsupported,
    },
    extra,
  };
};

const LabelWithHint: React.FC<{
  label: string;
  hint: string;
  required?: boolean;
}> = ({ label, hint, required = false }) => (
  <div className="mb-2 flex items-center gap-1.5">
    <Label>
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`${label} help`}
        >
          <Info className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        {hint}
      </TooltipContent>
    </Tooltip>
  </div>
);

const SectionTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="mb-4 flex items-start gap-3">
    <div className="rounded-md border border-border bg-muted p-2 text-primary">{icon}</div>
    <div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const ConfigField: React.FC<{
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, hint, value, onChange, placeholder, type = "text", min, max, step }) => (
  <div>
    <LabelWithHint label={label} hint={hint} />
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    />
  </div>
);

const ToggleField: React.FC<{
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  note?: string;
}> = ({ label, hint, checked, onChange, note }) => (
  <div className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
    <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
    <div className="space-y-1">
      <LabelWithHint label={label} hint={hint} />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  </div>
);

const TextField: React.FC<{
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}> = ({ label, hint, value, onChange, placeholder, type = "text", required = false }) => (
  <div>
    <LabelWithHint label={label} hint={hint} required={required} />
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    />
  </div>
);

const SelectLabel: React.FC<{
  label: string;
  hint: string;
  required?: boolean;
}> = ({ label, hint, required }) => <LabelWithHint label={label} hint={hint} required={required} />;

type ConfigEditorProps = {
  providerId: SupportedProviderId;
  draft: ConfigDraft;
  onChange: (updates: Partial<ConfigDraft>) => void;
  onReloadTemplate: () => void;
  isLoadingTemplate: boolean;
};

const ConfigEditor: React.FC<ConfigEditorProps> = ({
  providerId,
  draft,
  onChange,
  onReloadTemplate,
  isLoadingTemplate,
}) => (
  <div className="space-y-5 rounded-lg border border-border bg-muted/20 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Provider Config</h2>
          <Badge variant="secondary">{PROVIDER_LABELS[providerId] ?? providerId}</Badge>
        </div>
        {providerId === "openrouter" && (
          <a
            href="https://openrouter.ai/docs/api/reference/parameters?utm_source=chatgpt.com"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block max-w-[20rem] rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            OpenRouter parameter reference
          </a>
        )}
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Button type="button" variant="outline" size="sm" onClick={onReloadTemplate}>
          {isLoadingTemplate ? "Loading..." : "Reset Template"}
        </Button>
      </div>
    </div>

    <div className="rounded-lg border border-border bg-card p-4">
      <SectionTitle
        icon={<SlidersHorizontal className="h-4 w-4" />}
        title="Sampling"
        description="Generation controls shared by all supported providers."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <ConfigField label="Temperature" hint="Higher values make responses more varied; lower values make them more predictable. Accepted range: 0 to 2." value={draft.temperature} onChange={(temperature) => onChange({ temperature })} type="number" min={0} max={2} step={0.1} />
        <ConfigField label="Top P" hint="Lower values focus token choice on the most likely options. Accepted range: 0 to 1." value={draft.topP} onChange={(topP) => onChange({ topP })} type="number" min={0} max={1} step={0.01} />
        <ConfigField label="Top K" hint="Limits each step to a fixed number of likely tokens when supported. Accepted range: whole number 1 or above." value={draft.topK} onChange={(topK) => onChange({ topK })} type="number" min={1} step={1} />
        <ConfigField label="Max Tokens" hint="Caps how long the model response can be. Accepted range: whole number 1 or above." value={draft.maxTokens} onChange={(maxTokens) => onChange({ maxTokens })} type="number" min={1} step={1} />
        <ConfigField label="Frequency Penalty" hint="Positive values reduce repeated wording. Accepted range: -2 to 2." value={draft.frequencyPenalty} onChange={(frequencyPenalty) => onChange({ frequencyPenalty })} type="number" min={-2} max={2} step={0.1} />
        <ConfigField label="Presence Penalty" hint="Positive values encourage the model to introduce new topics. Accepted range: -2 to 2." value={draft.presencePenalty} onChange={(presencePenalty) => onChange({ presencePenalty })} type="number" min={-2} max={2} step={0.1} />
        <ConfigField label="Seed" hint="Helps repeated runs stay similar when deterministic sampling is supported. Accepted value: whole number." value={draft.seed} onChange={(seed) => onChange({ seed })} type="number" step={1} />
      </div>
    </div>

    <div className="rounded-lg border border-border bg-card p-4">
      <SectionTitle
        icon={<Sparkles className="h-4 w-4" />}
        title="Reasoning"
        description="Reasoning hints are passed when the selected endpoint supports them."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <ToggleField
          label="Enable reasoning"
          hint="Allows models with reasoning support to spend extra effort before answering."
          checked={draft.reasoningEnabled}
          onChange={(reasoningEnabled) => onChange({ reasoningEnabled })}
        />
        <div>
          <SelectLabel label="Effort" hint="Controls how much reasoning effort the model should use when supported." />
          <Select
            value={draft.reasoningEffort}
            onValueChange={(reasoningEffort) =>
              onChange({ reasoningEffort: reasoningEffort as ReasoningEffort })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ConfigField
          label="Reasoning Tokens"
          hint="Caps the budget reserved for internal reasoning on supported models. Accepted range: whole number 1 or above."
          value={draft.reasoningMaxTokens}
          onChange={(reasoningMaxTokens) => onChange({ reasoningMaxTokens })}
          type="number"
          min={1}
          step={1}
        />
      </div>
    </div>
  </div>
);

export const Models: React.FC = () => {
  const { models, addModel, updateModel, archiveModel, duplicateModel, loadModels } = useApp();

  const [providers, setProviders] = useState<LlmProviderInfo[]>(FALLBACK_PROVIDERS);
  const [templates, setTemplates] = useState<
    Partial<Record<SupportedProviderId, BackendModelConfigTemplate>>
  >({});
  const [form, setForm] = useState<ModelDraft>(emptyDraft("openrouter"));
  const [editingModel, setEditingModel] = useState<ModelPoolItem | null>(null);
  const [editForm, setEditForm] = useState<ModelDraft>(emptyDraft("openrouter"));
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [duplicatingModelId, setDuplicatingModelId] = useState<string | null>(null);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

  const providerMap = useMemo(
    () => Object.fromEntries(providers.map((provider) => [provider.id, provider])),
    [providers]
  );

  const selectedProvider = providerMap[form.providerId];
  const activeModels = useMemo(
    () => models.filter((model) => model.isActive !== false),
    [models]
  );
  const archivedModels = useMemo(
    () => models.filter((model) => model.isActive === false),
    [models]
  );

  const showError = (message: string) => {
    setAlertMessage(message);
    setShowAlertToast(true);
  };

  const loadTemplate = async (
    providerId: SupportedProviderId
  ): Promise<BackendModelConfigTemplate> => {
    if (templates[providerId]) {
      return templates[providerId] as BackendModelConfigTemplate;
    }

    const accessToken = getStoredAccessToken();
    if (!accessToken) {
      throw new Error("Authentication required.");
    }

    setIsLoadingTemplate(true);
    try {
      const template = await getModelConfigTemplate(accessToken, providerId);
      setTemplates((prev) => ({ ...prev, [providerId]: template }));
      return template;
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const applyTemplateToCreateForm = async (providerId: SupportedProviderId) => {
    const template = await loadTemplate(providerId);
    setForm((prev) => ({
      ...prev,
      providerId,
      config: configDraftFromConfig(template),
    }));
  };

  const resetCreateForm = async () => {
    const defaultProvider: SupportedProviderId = "openrouter";
    const template = await loadTemplate(defaultProvider);
    setForm({
      ...emptyDraft(defaultProvider),
      config: configDraftFromConfig(template),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.modelString.trim()) {
      showError("Model name and model string are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      await addModel({
        name: form.name.trim(),
        provider: PROVIDER_LABELS[form.providerId] ?? form.providerId,
        providerId: form.providerId,
        apiKey: form.apiKey.trim(),
        modelString: form.modelString.trim(),
        isActive: form.isActive,
        configJson: buildPayloadConfig(form),
      });
      await resetCreateForm();
      setToastMessage("Model added successfully!");
      setShowToast(true);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Model could not be added.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (model: ModelPoolItem) => {
    const providerId = (
      SUPPORTED_PROVIDER_IDS.includes(model.providerId as SupportedProviderId)
        ? model.providerId
        : "openrouter"
    ) as SupportedProviderId;
    setEditingModel(model);
    setEditForm({
      name: model.name,
      providerId,
      apiKey: model.apiKey,
      modelString: model.modelString ?? "",
      isActive: model.isActive ?? true,
      config: configDraftFromConfig(model.configJson ?? { provider: providerId }),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingModel) return;

    if (!editForm.name.trim()) {
      showError("Display name is required.");
      return;
    }

    try {
      setIsSavingEdit(true);
      await updateModel(editingModel.id, {
        name: editForm.name.trim(),
        apiKey: editForm.apiKey.trim(),
      });
      setEditingModel(null);
      setToastMessage("Model updated successfully!");
      setShowToast(true);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Model could not be updated.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingModel(null);
    setEditForm(emptyDraft("openrouter"));
  };

  const handleArchive = async (model: ModelPoolItem, isArchived: boolean) => {
    const actionLabel = isArchived ? "archive" : "restore";
    if (!window.confirm(`Are you sure you want to ${actionLabel} "${model.name}"?`)) {
      return;
    }

    try {
      await archiveModel(model.id, isArchived);
      setToastMessage(
        isArchived
          ? "Model archived successfully."
          : "Model restored successfully."
      );
      setShowToast(true);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Model could not be updated.");
    }
  };

  const handleDuplicate = async (model: ModelPoolItem) => {
    try {
      setDuplicatingModelId(model.id);
      const name = nextDuplicateDisplayName(
        model.name,
        models.map((m) => m.name)
      );
      await duplicateModel(model.id, name);
      setToastMessage(`Duplicated as "${name}".`);
      setShowToast(true);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Model could not be duplicated.");
    } finally {
      setDuplicatingModelId(null);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const accessToken = getStoredAccessToken();
        if (!accessToken) {
          throw new Error("Authentication required.");
        }

        const [providerResponse] = await Promise.all([
          getLlmProviders(accessToken),
          loadModels(),
        ]);

        const nextProviders = providerResponse.providers.filter((provider) =>
          SUPPORTED_PROVIDER_IDS.includes(provider.id as SupportedProviderId)
        );

        if (nextProviders.length > 0) {
          setProviders(nextProviders);
        }

        const initialProvider =
          (nextProviders[0]?.id as SupportedProviderId | undefined) ?? "openrouter";
        const template = await loadTemplate(initialProvider);
        setForm({
          ...emptyDraft(initialProvider),
          config: configDraftFromConfig(template),
        });
      } catch (error) {
        showError(
          error instanceof Error ? error.message : "Models page could not be initialized."
        );
      }
    };

    void initialize();
  }, []);

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={0}>
      <div className="space-y-8">
      {showToast && (
        <Toast
          message={toastMessage}
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
          <h1 className="text-3xl font-bold text-foreground">Models</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI models for experiments
          </p>
        </div>
      </div>

      <Card title="Add New Model">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Display Name"
              hint="A readable name shown in model lists and experiment setup."
              placeholder="e.g. Claude Sonnet via OpenRouter"
              value={form.name}
              onChange={(name) => setForm((prev) => ({ ...prev, name }))}
              required
            />
            <div className="space-y-2">
              <SelectLabel
                label="Provider"
                hint="Selects which backend adapter will call this model."
                required
              />
              <Select
                value={form.providerId}
                onValueChange={(value) => {
                  void applyTemplateToCreateForm(value as SupportedProviderId).catch((error) =>
                    showError(
                      error instanceof Error
                        ? error.message
                        : "Provider template could not be loaded."
                    )
                  );
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {PROVIDER_LABELS[provider.id] ?? provider.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.providerId === "aisuite_huggingface" && (
                <p className="text-xs text-muted-foreground">
                  Hugging Face fine-tuned models can be added here. Use the repo id
                  for the model you want to run.
                </p>
              )}
            </div>
            <TextField
              label="Model String"
              hint="Provider-specific model or deployment id used when sending requests."
              placeholder={selectedProvider?.model_string_hint || "Enter provider-specific model id"}
              value={form.modelString}
              onChange={(modelString) => setForm((prev) => ({ ...prev, modelString }))}
              required
            />
            <TextField
              label="API Key"
              hint={
                form.providerId === "aisuite_huggingface"
                  ? "Hugging Face token for fine-tuned models. Fine-tuned Hugging Face models can be added here."
                  : "Secret key used to authenticate requests for this model when needed."
              }
              type="password"
              value={form.apiKey}
              onChange={(apiKey) => setForm((prev) => ({ ...prev, apiKey }))}
            />
          </div>

          <ConfigEditor
            providerId={form.providerId}
            draft={form.config}
            onChange={(updates) =>
              setForm((prev) => ({ ...prev, config: { ...prev.config, ...updates } }))
            }
            onReloadTemplate={() =>
              void applyTemplateToCreateForm(form.providerId).catch((error) =>
                showError(
                  error instanceof Error
                    ? error.message
                    : "Provider template could not be loaded."
                )
              )
            }
            isLoadingTemplate={isLoadingTemplate}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Model"}
          </Button>
        </form>
      </Card>

      <Card title={`Your Models (${activeModels.length})`}>
        {activeModels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No models yet. Add your first model above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeModels.map((model) => (
              <div
                key={model.id}
                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {model.name}
                      </h3>
                      <Badge variant="secondary">{model.provider}</Badge>
                      {model.isActive === false && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <strong>Model String:</strong> {model.modelString || "-"}
                      </p>
                      <p>
                        <strong>API Key:</strong> {maskApiKey(model.apiKey)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-start gap-2 self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={duplicatingModelId === model.id}
                      onClick={() => void handleDuplicate(model)}
                    >
                      {duplicatingModelId === model.id ? "Duplicating..." : "Duplicate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={duplicatingModelId !== null}
                      onClick={() => void handleEdit(model)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={duplicatingModelId !== null}
                      onClick={() => void handleArchive(model, true)}
                    >
                      Archive
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Archived Models (${archivedModels.length})`}>
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsArchivedExpanded((prev) => !prev)}
            className="w-full justify-between"
          >
            <span>{isArchivedExpanded ? "Hide archived models" : "Show archived models"}</span>
            {isArchivedExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          {isArchivedExpanded && (
            <>
              {archivedModels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No archived models.</p>
              ) : (
                <div className="space-y-3">
                  {archivedModels.map((model) => (
                    <div
                      key={model.id}
                      className="border border-border rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {model.name}
                            </h3>
                            <Badge variant="secondary">{model.provider}</Badge>
                            <Badge variant="outline">Archived</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>Model String:</strong> {model.modelString || "-"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleArchive(model, false)}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {editingModel && (
        <Modal isOpen={!!editingModel} onClose={handleCancelEdit} title="Edit Model">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-1">
              <TextField
                label="Display Name"
                hint="A readable name shown in model lists and experiment setup."
                value={editForm.name}
                onChange={(name) => setEditForm((prev) => ({ ...prev, name }))}
                placeholder="Model display name"
              />
              <TextField
                label="API Key"
                hint="Secret key used to authenticate requests for this model when needed."
                type="password"
                value={editForm.apiKey}
                onChange={(apiKey) => setEditForm((prev) => ({ ...prev, apiKey }))}
                placeholder="Optional"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={() => void handleSaveEdit()} disabled={isSavingEdit}>
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </TooltipProvider>
  );
};
