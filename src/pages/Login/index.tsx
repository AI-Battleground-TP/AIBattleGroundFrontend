import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, Card } from "../../components";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim()) {
      login(email, password);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-foreground mb-6">
          Welcome Back
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          Login to continue to the platform
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Input
              label="Organization email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Login
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          This is a demo login. No authentication is required.
        </p>
      </Card>
    </div>
  );
};
