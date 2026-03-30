import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import {
  detectHeadAccess,
  getMe,
  getMyOrganizations,
  switchOrganizationToken,
  type OrganizationItem,
} from "../lib/authApi";

const ACCESS_TOKEN_KEY = "bt_access_token";
const REFRESH_TOKEN_KEY = "bt_refresh_token";
const USER_KEY = "bt_user";
const ORGANIZATIONS_KEY = "bt_organizations";

interface AuthInput {
  email: string;
  name: string;
  role: "user" | "judge";
  isHead?: boolean;
  organizationId?: string;
  organizationName?: string;
  accessToken?: string;
  refreshToken?: string;
  organizations?: OrganizationItem[];
}

interface AuthContextType {
  user: User | null;
  organizations: OrganizationItem[];
  login: (data: AuthInput) => void;
  signup: (data: AuthInput) => void;
  logout: () => void;
  switchRole: (role: "user" | "judge") => void;
  refreshOrganizations: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<User>;
  isAuthenticated: boolean;
  isSwitchingOrganization: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  });
  const [organizations, setOrganizations] = useState<OrganizationItem[]>(() => {
    const raw = localStorage.getItem(ORGANIZATIONS_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as OrganizationItem[];
    } catch {
      localStorage.removeItem(ORGANIZATIONS_KEY);
      return [];
    }
  });
  const [isSwitchingOrganization, setIsSwitchingOrganization] = useState(false);

  /**
   * Replaces session tokens in localStorage: old access/refresh are removed first,
   * then the new access token is always written. Refresh is written only if present;
   * otherwise the refresh key is left cleared (no mixing new access with old refresh).
   */
  const replaceSessionTokens = (
    accessToken: string,
    refreshToken?: string | null
  ) => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken != null && String(refreshToken).length > 0) {
      localStorage.setItem(REFRESH_TOKEN_KEY, String(refreshToken));
    }
  };

  const persistOrganizations = (nextOrganizations: OrganizationItem[]) => {
    setOrganizations(nextOrganizations);
    localStorage.setItem(ORGANIZATIONS_KEY, JSON.stringify(nextOrganizations));
  };

  const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
  const persistUser = (nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const createSessionUser = (data: AuthInput): User => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      isHead: data.isHead ?? false,
      organizationId: data.organizationId,
      organizationName: data.organizationName,
    };
    return newUser;
  };

  const login = (data: AuthInput) => {
    const nextUser = createSessionUser(data);
    persistUser(nextUser);
    persistOrganizations(data.organizations ?? []);
    if (data.accessToken) {
      replaceSessionTokens(data.accessToken, data.refreshToken ?? null);
    }
  };

  const signup = (data: AuthInput) => {
    const nextUser = createSessionUser(data);
    persistUser(nextUser);
    persistOrganizations(data.organizations ?? []);
    if (data.accessToken) {
      replaceSessionTokens(data.accessToken, data.refreshToken ?? null);
    }
  };

  const switchRole = (role: "user" | "judge") => {
    if (user && user.isHead) {
      const nextUser = {
        ...user,
        role,
      };
      persistUser(nextUser);
    }
  };

  const refreshOrganizations = useCallback(async () => {
    const accessToken = getStoredAccessToken();
    if (!accessToken || !user) {
      return;
    }
    const nextOrganizations = await getMyOrganizations(accessToken);
    persistOrganizations(nextOrganizations);
  }, [user]);

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const accessToken = getStoredAccessToken();
      if (!accessToken) {
        throw new Error("Missing access token.");
      }

      setIsSwitchingOrganization(true);
      try {
        const switchedToken = await switchOrganizationToken(
          accessToken,
          organizationId
        );
        const finalAccessToken = switchedToken.access_token;
        const finalRefreshToken = switchedToken.refresh_token ?? null;
        replaceSessionTokens(finalAccessToken, finalRefreshToken);
        const me = await getMe(finalAccessToken);
        const nextOrganizations =
          organizations.length > 0
            ? organizations
            : await getMyOrganizations(finalAccessToken);
        const selectedOrganization = nextOrganizations.find(
          (organization) => organization.id === organizationId
        );
        const isHeadUser = await detectHeadAccess(finalAccessToken, organizationId);
        const nextRole = isHeadUser ? user.role : "judge";
        const nextUser: User = {
          ...user,
          name: `${me.name} ${me.surname}`.trim(),
          email: me.email,
          role: nextRole,
          isHead: isHeadUser,
          organizationId,
          organizationName:
            selectedOrganization?.name || user.organizationName || "Organization",
        };

        persistOrganizations(nextOrganizations);
        persistUser(nextUser);
        return nextUser;
      } finally {
        setIsSwitchingOrganization(false);
      }
    },
    [organizations, user]
  );

  const logout = () => {
    setUser(null);
    setOrganizations([]);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORGANIZATIONS_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };

  const isAuthenticated = user !== null;

  useEffect(() => {
    if (!user || organizations.length > 0) {
      return;
    }

    refreshOrganizations().catch(() => {
      localStorage.removeItem(ORGANIZATIONS_KEY);
      setOrganizations([]);
    });
  }, [organizations.length, refreshOrganizations, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        login,
        signup,
        logout,
        switchRole,
        refreshOrganizations,
        switchOrganization,
        isAuthenticated,
        isSwitchingOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
