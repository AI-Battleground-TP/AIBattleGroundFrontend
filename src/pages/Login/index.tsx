import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, Card } from "../../components";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

export const Login: React.FC = () => {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "judge">("user");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      login(name, role);
      navigate(role === "user" ? "/dashboard" : "/judge");
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
          <Input
            label="Name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3">
              I am a:
            </label>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as "user" | "judge")}
              className="grid grid-cols-2 gap-3"
            >
              <label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="user" />
                <span className="text-foreground">Model Submitter (User)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="judge" />
                <span className="text-foreground">Judge</span>
              </label>
            </RadioGroup>
          </div>

          <div className="mb-6 p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-foreground">
              {role === "user" ? (
                <>
                  <span className="font-semibold">As a User:</span> You can
                  submit your LLM models with API keys and prompts for
                  evaluation by judges.
                </>
              ) : (
                <>
                  <span className="font-semibold">As a Judge:</span> You'll
                  evaluate anonymous model responses and help determine which
                  models perform best.
                </>
              )}
            </p>
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
