import React, { useState } from "react";
import { Button, Card, Input, Toast } from "../../components";
import { Badge } from "../../components/ui/badge";
import type { UserProfile } from "../../types";

// Dummy user profile data
const dummyUserProfile: UserProfile = {
  id: "user-1",
  username: "john_doe",
  email: "john.doe@example.com",
  firstName: "John",
  lastName: "Doe",
  savedModels: [
    {
      id: "model-1",
      name: "GPT-4",
      provider: "OpenAI",
      apiKey: "sk-***...***abc123",
      userId: "user-1",
      createdAt: new Date("2024-01-15"),
      lastUsed: new Date("2024-01-20"),
    },
    {
      id: "model-2",
      name: "Claude 3",
      provider: "Anthropic",
      apiKey: "sk-ant-***...***def456",
      userId: "user-1",
      createdAt: new Date("2024-01-16"),
      lastUsed: new Date("2024-01-19"),
    },
  ],
  totalComparisons: 5,
  createdAt: new Date("2024-01-01"),
};

export const UserProfilePage: React.FC = () => {
  const [profile] = useState<UserProfile>(dummyUserProfile);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState({
    name: "",
    provider: "",
    apiKey: "",
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel.name || !newModel.provider || !newModel.apiKey) {
      setToastMessage("Please fill in all fields");
      setShowToast(true);
      return;
    }

    // In a real app, this would save to backend
    console.log("Adding new model:", newModel);
    setToastMessage("Model saved successfully!");
    setShowToast(true);
    setNewModel({ name: "", provider: "", apiKey: "" });
    setShowAddModel(false);
  };

  const handleDeleteModel = (modelId: string) => {
    // In a real app, this would delete from backend
    console.log("Deleting model:", modelId);
    setToastMessage("Model deleted successfully!");
    setShowToast(true);
  };

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return apiKey;
    return (
      apiKey.substring(0, 4) + "***...***" + apiKey.substring(apiKey.length - 4)
    );
  };

  return (
    <div className="space-y-8">
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Profile Header */}
      <Card title="Profile Information">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <Input
                value={profile.firstName}
                onChange={() => {}}
                placeholder="First Name"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Last Name
              </label>
              <Input
                value={profile.lastName}
                onChange={() => {}}
                placeholder="Last Name"
                disabled
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Username
              </label>
              <Input
                value={profile.username}
                onChange={() => {}}
                placeholder="Username"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <Input
                value={profile.email}
                onChange={() => {}}
                placeholder="Email"
                disabled
              />
            </div>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {profile.totalComparisons}
              </p>
              <p className="text-sm text-muted-foreground">Total Experiments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {profile.savedModels.length}
              </p>
              <p className="text-sm text-muted-foreground">Saved Models</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {Math.floor(
                  (Date.now() - profile.createdAt.getTime()) /
                    (1000 * 60 * 60 * 24)
                )}
              </p>
              <p className="text-sm text-muted-foreground">Days Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent-foreground">
                {
                  profile.savedModels.filter(
                    (m) =>
                      m.lastUsed &&
                      Date.now() - m.lastUsed.getTime() <
                        7 * 24 * 60 * 60 * 1000
                  ).length
                }
              </p>
              <p className="text-sm text-muted-foreground">Active This Week</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Saved Models */}
      <Card title="Saved Models">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            Manage your saved models for quick experiments
          </p>
          <Button onClick={() => setShowAddModel(true)}>+ Add New Model</Button>
        </div>

        {profile.savedModels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No saved models yet. Add your first model to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {profile.savedModels.map((model) => (
              <div
                key={model.id}
                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {model.name}
                      </h3>
                      <Badge variant="secondary">
                        {model.provider}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>API Key:</strong> {maskApiKey(model.apiKey)}
                      </p>
                      <p>
                        <strong>Added:</strong>{" "}
                        {model.createdAt.toLocaleDateString()}
                      </p>
                      {model.lastUsed && (
                        <p>
                          <strong>Last Used:</strong>{" "}
                          {model.lastUsed.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // In a real app, this would copy to clipboard
                        navigator.clipboard.writeText(model.apiKey);
                        setToastMessage("API key copied to clipboard!");
                        setShowToast(true);
                      }}
                    >
                      Copy Key
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteModel(model.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Model Modal */}
      {showAddModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Add New Model
            </h2>
            <form onSubmit={handleAddModel} className="space-y-4">
              <Input
                label="Model Name"
                placeholder="e.g., GPT-4, Claude 3"
                value={newModel.name}
                onChange={(e) =>
                  setNewModel({ ...newModel, name: e.target.value })
                }
                required
              />
              <Input
                label="Provider"
                placeholder="e.g., OpenAI, Anthropic"
                value={newModel.provider}
                onChange={(e) =>
                  setNewModel({ ...newModel, provider: e.target.value })
                }
                required
              />
              <Input
                label="API Key"
                placeholder="Enter your API key"
                value={newModel.apiKey}
                onChange={(e) =>
                  setNewModel({ ...newModel, apiKey: e.target.value })
                }
                type="password"
                required
              />
              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  Save Model
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModel(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
