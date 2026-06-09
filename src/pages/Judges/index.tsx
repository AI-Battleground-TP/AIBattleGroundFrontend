import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Toast } from "../../components";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Loader2 } from "lucide-react";
import {
  getJudgeAnalyticsDetail,
  getJudgeAnalyticsList,
  removeJudgeFromOrganization,
  type BackendJudgeAnalyticsDetailResponse,
  type BackendJudgeAnalyticsListItem,
  type BackendJudgeBiasSummary,
} from "../../lib/authApi";

const formatRate = (value: number) =>
  `${(value * 100).toFixed(value * 100 % 1 === 0 ? 0 : 1)}%`;

const formatScore = (value: number) =>
  value.toFixed(value % 1 === 0 ? 0 : 3);

const MetricCard: React.FC<{
  label: string;
  value: string;
  hint?: string;
}> = ({ label, value, hint }) => (
  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 shadow-sm">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const SummarySection: React.FC<{
  title: string;
  description: string;
  summary: BackendJudgeBiasSummary;
}> = ({ title, description, summary }) => (
  <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Badge variant="secondary">
        {summary.total_evaluations} evaluation
        {summary.total_evaluations !== 1 ? "s" : ""}
      </Badge>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Left Pick Rate"
        value={formatRate(summary.left_pick_rate)}
        hint={`${summary.left_pick_count} left picks`}
      />
      <MetricCard
        label="Right Pick Rate"
        value={formatRate(summary.right_pick_rate)}
        hint={`${summary.right_pick_count} right picks`}
      />
      <MetricCard
        label="Longer Answer Rate"
        value={formatRate(summary.long_pick_rate)}
        hint={`${summary.long_pick_count} longer picks`}
      />
      <MetricCard
        label="Shorter Answer Rate"
        value={formatRate(summary.short_pick_rate)}
        hint={`${summary.short_pick_count} shorter picks`}
      />
      <MetricCard
        label="Both Good Rate"
        value={formatRate(
          summary.total_evaluations > 0
            ? summary.both_good_count / summary.total_evaluations
            : 0
        )}
        hint={`${summary.both_good_count} both-good outcomes`}
      />
      <MetricCard
        label="Both Poor Rate"
        value={formatRate(
          summary.total_evaluations > 0
            ? summary.both_poor_count / summary.total_evaluations
            : 0
        )}
        hint={`${summary.both_poor_count} both-poor outcomes`}
      />
      <MetricCard
        label="Side Bias Score"
        value={formatScore(summary.side_bias_score)}
        hint="Absolute gap between left and right pick rates"
      />
      <MetricCard
        label="Length Bias Score"
        value={formatScore(summary.length_bias_score)}
        hint="Absolute gap between longer and shorter answer picks"
      />
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-xl border border-border bg-muted/20 p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Outcome Distribution</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">Left: {summary.outcome_distribution.model_a}</Badge>
          <Badge variant="outline">Right: {summary.outcome_distribution.model_b}</Badge>
          <Badge variant="outline">Both Good: {summary.outcome_distribution.both_good}</Badge>
          <Badge variant="outline">Both Poor: {summary.outcome_distribution.both_poor}</Badge>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Length Signals</p>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>Length-eligible evaluations: {summary.length_eligible_count}</p>
          <p>Equal-length side picks: {summary.equal_length_count}</p>
          <p>
            Avg chosen tokens:{" "}
            {summary.avg_completion_tokens_chosen === null
              ? "Not available"
              : summary.avg_completion_tokens_chosen}
          </p>
          <p>
            Avg rejected tokens:{" "}
            {summary.avg_completion_tokens_rejected === null
              ? "Not available"
              : summary.avg_completion_tokens_rejected}
          </p>
        </div>
      </div>
    </div>
  </section>
);

export const Judges: React.FC = () => {
  const [judgeItems, setJudgeItems] = useState<BackendJudgeAnalyticsListItem[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [selectedJudgeId, setSelectedJudgeId] = useState<string | null>(null);
  const [selectedJudgeDetail, setSelectedJudgeDetail] =
    useState<BackendJudgeAnalyticsDetailResponse | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [removingJudgeId, setRemovingJudgeId] = useState<string | null>(null);

  const getAccessToken = () => {
    const accessToken = localStorage.getItem("bt_access_token");
    if (!accessToken) {
      throw new Error("Missing access token.");
    }
    return accessToken;
  };

  const loadJudgeDetail = async (judgeId: string) => {
    setIsLoadingDetail(true);
    try {
      const accessToken = getAccessToken();
      const detail = await getJudgeAnalyticsDetail(accessToken, judgeId);
      setSelectedJudgeDetail(detail);
      setSelectedJudgeId(judgeId);
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Judge analytics could not be loaded."
      );
      setShowToast(true);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleRemoveJudge = async (judge: BackendJudgeAnalyticsListItem) => {
    if (!organizationId) {
      setToastMessage("Organization context is missing.");
      setShowToast(true);
      return;
    }

    if (
      !window.confirm(
        `Remove ${judge.judge_name} from the organization?\n\nThis will remove their access to judge evaluations in this organization.`
      )
    ) {
      return;
    }

    const accessToken = getAccessToken();
    setRemovingJudgeId(judge.judge_id);
    try {
      await removeJudgeFromOrganization(accessToken, organizationId, judge.judge_id);
      setJudgeItems((prev) => prev.filter((item) => item.judge_id !== judge.judge_id));
      if (selectedJudgeId === judge.judge_id) {
        setSelectedJudgeId(null);
        setSelectedJudgeDetail(null);
      }
      setToastMessage(`${judge.judge_name} was removed from the organization.`);
      setShowToast(true);
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Judge could not be removed."
      );
      setShowToast(true);
    } finally {
      setRemovingJudgeId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingList(true);
      try {
        const accessToken = getAccessToken();
        const response = await getJudgeAnalyticsList(accessToken);
        if (cancelled) {
          return;
        }
        setOrganizationId(response.organization_id);
        setJudgeItems(response.judges);
        if (response.judges.length > 0) {
          await loadJudgeDetail(response.judges[0].judge_id);
        }
      } catch (error) {
        if (!cancelled) {
          setToastMessage(
            error instanceof Error ? error.message : "Judge analytics could not be loaded."
          );
          setShowToast(true);
          setJudgeItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedJudgeSummary = useMemo(
    () => judgeItems.find((item) => item.judge_id === selectedJudgeId) || null,
    [judgeItems, selectedJudgeId]
  );

  return (
    <div className="space-y-8">
      {showToast && (
        <Toast
          message={toastMessage}
          type="error"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Judges</h1>
          <p className="text-muted-foreground mt-1">
            Review judge evaluation patterns across the organization
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card title="Judge List">
          {isLoadingList ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
              Loading judges...
            </div>
          ) : judgeItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No judge analytics found yet.
            </div>
          ) : (
            <div className="space-y-3">
              {judgeItems.map((item) => (
                <div
                  key={item.judge_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void loadJudgeDetail(item.judge_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void loadJudgeDetail(item.judge_id);
                    }
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    selectedJudgeId === item.judge_id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.judge_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.judge_email}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {item.summary.total_evaluations}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      L {formatRate(item.summary.left_pick_rate)}
                    </Badge>
                    <Badge variant="secondary">
                      R {formatRate(item.summary.right_pick_rate)}
                    </Badge>
                      <Badge variant="outline">
                        Bias {formatScore(item.summary.side_bias_score)}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs"
                        disabled={removingJudgeId === item.judge_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemoveJudge(item);
                        }}
                      >
                        {removingJudgeId === item.judge_id
                          ? "Removing..."
                          : "Remove from org"}
                      </Button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {!selectedJudgeSummary || !selectedJudgeDetail ? (
            <Card title="Judge Overview">
              <div className="py-12 text-center text-muted-foreground">
                {isLoadingDetail ? (
                  <>
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
                    Loading selected judge...
                  </>
                ) : (
                  "Select a judge to inspect analytics."
                )}
              </div>
            </Card>
          ) : (
            <>
              <Card title="Selected Judge">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {selectedJudgeDetail.judge_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedJudgeDetail.judge_email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {selectedJudgeDetail.global_summary.total_evaluations} evaluations
                    </Badge>
                    <Badge variant="outline">
                      {selectedJudgeDetail.experiment_summaries.length} experiments
                    </Badge>
                  </div>
                </div>
              </Card>

              <SummarySection
                title="Global Summary"
                description="Overall judge behavior across all completed evaluations."
                summary={selectedJudgeDetail.global_summary}
              />

              <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Experiment Summaries
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Compare the same judge across individual experiments.
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {selectedJudgeDetail.experiment_summaries.length}
                  </Badge>
                </div>

                {selectedJudgeDetail.experiment_summaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No experiment-level analytics were returned for this judge.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Experiment</TableHead>
                        <TableHead>Evaluations</TableHead>
                        <TableHead>Left</TableHead>
                        <TableHead>Right</TableHead>
                        <TableHead>Long</TableHead>
                        <TableHead>Short</TableHead>
                        <TableHead>Both Good</TableHead>
                        <TableHead>Both Poor</TableHead>
                        <TableHead>Side Bias</TableHead>
                        <TableHead>Length Bias</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedJudgeDetail.experiment_summaries.map((summary) => (
                        <TableRow key={summary.experiment_id || summary.judge_id}>
                          <TableCell className="font-medium">
                            {summary.experiment_name || "Unknown experiment"}
                          </TableCell>
                          <TableCell>{summary.total_evaluations}</TableCell>
                          <TableCell>{formatRate(summary.left_pick_rate)}</TableCell>
                          <TableCell>{formatRate(summary.right_pick_rate)}</TableCell>
                          <TableCell>{formatRate(summary.long_pick_rate)}</TableCell>
                          <TableCell>{formatRate(summary.short_pick_rate)}</TableCell>
                          <TableCell>{summary.both_good_count}</TableCell>
                          <TableCell>{summary.both_poor_count}</TableCell>
                          <TableCell>{formatScore(summary.side_bias_score)}</TableCell>
                          <TableCell>{formatScore(summary.length_bias_score)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
