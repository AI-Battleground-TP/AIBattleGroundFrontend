import React, { useEffect, useMemo, useState } from "react";
import { Card, Toast } from "../../components";
import { Badge } from "../../components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getMe, type BackendAuthMe } from "../../lib/authApi";

const ACCESS_TOKEN_KEY = "bt_access_token";

const getAccessToken = () => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) {
    throw new Error("Missing access token.");
  }
  return accessToken;
};

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

export const UserProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BackendAuthMe | null>(null);
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

        if (!cancelled) {
          setProfile(me);
        }
      } catch (error) {
        if (!cancelled) {
          setToastMessage(
            error instanceof Error ? error.message : "Profile could not be loaded."
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
  }, [user?.isHead, user?.organizationId]);

  const summaryItems = useMemo(() => {
    if (!profile) {
      return [];
    }

    return [
      {
        label: "Experiments In Organization",
        value: profile.experiments_total_in_organization,
      },
    ];
  }, [profile]);

  return (
    <div className="space-y-8">
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      {isLoading ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin" />
            <p className="text-lg font-medium">Loading profile...</p>
          </div>
        </Card>
      ) : !profile ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <p>Profile information is unavailable.</p>
          </div>
        </Card>
      ) : (
        <>
          <Card title="Profile Information">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge variant="secondary">
                {profile.org_role === "HEAD" ? "Head" : "Judge"}
              </Badge>
              {user?.organizationName && (
                <Badge variant="outline">{user.organizationName}</Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnlyField label="First Name" value={profile.name} />
              <ReadOnlyField label="Last Name" value={profile.surname} />
              <ReadOnlyField label="Email" value={profile.email} />
              <ReadOnlyField label="Phone" value={profile.phone || "-"} />
              <ReadOnlyField
                label="Organization"
                value={user?.organizationName || profile.organization_id}
              />
            </div>
          </Card>

          <Card title="Organization Overview">
            <div className="grid gap-4 text-center md:grid-cols-1">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border bg-muted/20 px-4 py-5"
                >
                  <p className="text-3xl font-bold text-primary">{item.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
