import React, { useEffect, useMemo, useState } from "react";
import { Card, Toast } from "../../components";
import { Badge } from "../../components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getActiveExperiments,
  getActiveJudgeExperiments,
  getMe,
  getMyTests,
  getPreferences,
  type BackendAuthMe,
  type BackendExperiment,
  type BackendPreference,
  type BackendTest,
} from "../../lib/authApi";

const ACCESS_TOKEN_KEY = "bt_access_token";

const getAccessToken = () => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) {
    throw new Error("Missing access token.");
  }
  return accessToken;
};

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const ReadOnlyField: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div>
    <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
    <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-foreground">
      {value || "-"}
    </div>
  </div>
);

const JudgeProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BackendAuthMe | null>(null);
  const [myTests, setMyTests] = useState<BackendTest[]>([]);
  const [myPreferences, setMyPreferences] = useState<BackendPreference[]>([]);
  const [activeExperiments, setActiveExperiments] = useState<BackendExperiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const accessToken = getAccessToken();
        const me = await getMe(accessToken);

        const canUseJudgeScopedEndpoints = me.org_role === "JUDGE";
        const [tests, preferences, experiments] = await Promise.all([
          canUseJudgeScopedEndpoints ? getMyTests(accessToken) : Promise.resolve([]),
          canUseJudgeScopedEndpoints ? getPreferences(accessToken) : Promise.resolve([]),
          canUseJudgeScopedEndpoints
            ? getActiveJudgeExperiments(accessToken).catch(() => [])
            : getActiveExperiments(accessToken).catch(() => []),
        ]);

        if (!cancelled) {
          setProfile(me);
          setMyTests(tests);
          setMyPreferences(preferences);
          setActiveExperiments(experiments);
        }
      } catch (error) {
        if (!cancelled) {
          setToastMessage(
            error instanceof Error ? error.message : "Judge profile could not be loaded."
          );
          setShowToast(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.organizationId]);

  const experimentNameMap = useMemo(
    () => Object.fromEntries(activeExperiments.map((experiment) => [experiment.id, experiment.name])),
    [activeExperiments]
  );

  const preferenceCountByTest = useMemo(
    () =>
      myPreferences.reduce<Record<string, number>>((acc, preference) => {
        acc[preference.test_id] = (acc[preference.test_id] || 0) + 1;
        return acc;
      }, {}),
    [myPreferences]
  );

  const groupedHistory = useMemo(() => {
    const grouped = myTests.reduce<
      Record<
        string,
        {
          experimentId: string;
          experimentName: string;
          promptsEvaluated: number;
          lastEvaluatedAt: string;
        }
      >
    >((acc, test) => {
      const existing = acc[test.experiment_id];
      const experimentName =
        experimentNameMap[test.experiment_id] || `Experiment ${test.experiment_id.slice(0, 8)}`;

      if (!existing) {
        acc[test.experiment_id] = {
          experimentId: test.experiment_id,
          experimentName,
          promptsEvaluated: 1,
          lastEvaluatedAt: test.created_at,
        };
        return acc;
      }

      existing.promptsEvaluated += 1;
      if (new Date(test.created_at).getTime() > new Date(existing.lastEvaluatedAt).getTime()) {
        existing.lastEvaluatedAt = test.created_at;
      }
      return acc;
    }, {});

    return Object.values(grouped).sort(
      (left, right) =>
        new Date(right.lastEvaluatedAt).getTime() - new Date(left.lastEvaluatedAt).getTime()
    );
  }, [experimentNameMap, myTests]);

  const latestTests = useMemo(
    () =>
      [...myTests]
        .sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        )
        .slice(0, 8),
    [myTests]
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

      {isLoading ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin" />
            <p className="text-lg font-medium">Loading judge profile...</p>
          </div>
        </Card>
      ) : !profile ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <p>Judge profile information is unavailable.</p>
          </div>
        </Card>
      ) : (
        <>
          <Card title="Judge Profile">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Judge</Badge>
              {user?.organizationName && (
                <Badge variant="outline">{user.organizationName}</Badge>
              )}
              {profile.org_role !== "JUDGE" && (
                <Badge variant="outline">Viewing with head access</Badge>
              )}
            </div>

            {profile.org_role !== "JUDGE" && (
              <div className="mb-6 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                Judge-only activity details are limited because the current organization token
                has `HEAD` permissions. Basic organization-scoped stats are still shown below.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnlyField label="First Name" value={profile.name} />
              <ReadOnlyField label="Last Name" value={profile.surname} />
              <ReadOnlyField label="Email" value={profile.email} />
              <ReadOnlyField label="Phone" value={profile.phone || "-"} />
              <ReadOnlyField
                label="Organization"
                value={user?.organizationName || profile.organization_id}
              />
              <ReadOnlyField label="Org Role" value={profile.org_role} />
            </div>
          </Card>

          <Card title="Organization Evaluation Overview">
            <div className="grid gap-4 text-center md:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-5">
                <p className="text-3xl font-bold text-primary">
                  {profile.tests_answered_in_organization}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Blind Tests Answered
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-5">
                <p className="text-3xl font-bold text-primary">{myPreferences.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Evaluation Decisions
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-5">
                <p className="text-3xl font-bold text-primary">
                  {profile.experiments_participated}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Experiments Participated
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-5">
                <p className="text-3xl font-bold text-primary">
                  {activeExperiments.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active Experiments
                </p>
              </div>
            </div>
          </Card>

          <Card title="Recent Evaluation History">
            {groupedHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
                No organization-scoped evaluation history found yet.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedHistory.map((entry) => (
                  <div
                    key={entry.experimentId}
                    className="rounded-lg border border-border bg-muted/20 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {entry.experimentName}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Last evaluated: {formatDateTime(entry.lastEvaluatedAt)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {entry.promptsEvaluated} blind test
                        {entry.promptsEvaluated !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Latest Submitted Blind Tests">
            {latestTests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
                No blind tests submitted yet for this organization.
              </div>
            ) : (
              <div className="space-y-3">
                {latestTests.map((test) => (
                  <div
                    key={test.id}
                    className="rounded-lg border border-border bg-muted/20 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {experimentNameMap[test.experiment_id] ||
                            `Experiment ${test.experiment_id.slice(0, 8)}`}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Submitted: {formatDateTime(test.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {preferenceCountByTest[test.id] || 0} decision
                          {(preferenceCountByTest[test.id] || 0) !== 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline">
                          Test {test.id.slice(0, 8)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export { JudgeProfilePage as JudgeProfile };
