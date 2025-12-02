import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => void;
  logout: () => void;
  switchRole: (role: "user" | "judge") => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string) => {
    // Demo login - no actual authentication
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: email, // Use email as name for display
      email,
      role: "user", // Default role is user
    };
    setUser(newUser);
  };

  const switchRole = (role: "user" | "judge") => {
    if (user) {
      setUser({
        ...user,
        role,
      });
    }
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, isAuthenticated }}>
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
