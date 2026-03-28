import React, { useEffect, useState } from "react";
import { Button, Input, Card, Toast, Modal } from "../../components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { useApp } from "../../context/AppContext";
import type { ModelPoolItem } from "../../types";

// Available models to select from
const AVAILABLE_MODELS = [
  { provider: "OpenAI", name: "GPT-4 Turbo", fullName: "OpenAI - GPT-4 Turbo" },
  { provider: "OpenAI", name: "GPT-4", fullName: "OpenAI - GPT-4" },
  { provider: "OpenAI", name: "GPT-3.5 Turbo", fullName: "OpenAI - GPT-3.5 Turbo" },
  { provider: "Anthropic", name: "Claude 3 Opus", fullName: "Anthropic - Claude 3 Opus" },
  { provider: "Anthropic", name: "Claude 3 Sonnet", fullName: "Anthropic - Claude 3 Sonnet" },
  { provider: "Anthropic", name: "Claude 3 Haiku", fullName: "Anthropic - Claude 3 Haiku" },
  { provider: "Google", name: "Gemini Pro", fullName: "Google - Gemini Pro" },
  { provider: "Google", name: "Gemini Ultra", fullName: "Google - Gemini Ultra" },
  { provider: "Meta", name: "Llama 3", fullName: "Meta - Llama 3" },
  { provider: "Mistral", name: "Mistral Large", fullName: "Mistral - Mistral Large" },
];

export const Models: React.FC = () => {
  const { models, addModel, updateModel, loadModels } = useApp();
  
  // Form state for adding new model
  const [selectedModelIndex, setSelectedModelIndex] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  // Edit modal state
  const [editingModel, setEditingModel] = useState<ModelPoolItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModelIndex || !apiKey.trim()) {
      setAlertMessage("Please select a model and enter API key");
      setShowAlertToast(true);
      return;
    }

    const selectedModel = AVAILABLE_MODELS[parseInt(selectedModelIndex)];
    addModel({
      name: selectedModel.name,
      provider: selectedModel.provider,
      apiKey: apiKey,
    });

    // Reset form
    setSelectedModelIndex("");
    setApiKey("");

    setToastMessage("Model added successfully!");
    setShowToast(true);
  };

  const handleEdit = (model: ModelPoolItem) => {
    setEditingModel(model);
    setEditName(model.name);
    setEditApiKey(model.apiKey);
  };

  const handleSaveEdit = () => {
    if (!editingModel) return;

    if (!editName.trim() || !editApiKey.trim()) {
      setAlertMessage("Name and API Key cannot be empty");
      setShowAlertToast(true);
      return;
    }

    updateModel(editingModel.id, {
      name: editName,
      apiKey: editApiKey,
    });

    setEditingModel(null);
    setToastMessage("Model updated successfully!");
    setShowToast(true);
  };

  const handleCancelEdit = () => {
    setEditingModel(null);
    setEditName("");
    setEditApiKey("");
  };

  useEffect(() => {
    loadModels().catch((error) => {
      setAlertMessage(
        error instanceof Error ? error.message : "Models could not be loaded."
      );
      setShowAlertToast(true);
    });
  }, []);

  return (
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

      {/* Edit Modal */}
      {editingModel && (
        <Modal
          isOpen={!!editingModel}
          onClose={handleCancelEdit}
          title="Edit Model"
        >
          <div className="space-y-4">
            <Input
              label="Model Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g., GPT-4 Turbo"
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Provider (Read-only)
              </label>
              <div className="px-3 py-2 bg-muted/30 border border-input rounded-lg text-muted-foreground">
                {editingModel.provider}
              </div>
            </div>
            <Input
              label="API Key"
              type="password"
              value={editApiKey}
              onChange={(e) => setEditApiKey(e.target.value)}
              placeholder="Enter new API key"
            />
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Models</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI models for experiments
          </p>
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong>💡 How it works:</strong> Add your AI models here with their API keys.
          These models will be available for selection when creating experiments in the Dashboard.
          You can edit the name and API key of any model, but cannot delete models once added.
        </p>
      </div>

      {/* Add New Model Form */}
      <Card title="Add New Model">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Select Model
            </label>
            <Select
              value={selectedModelIndex}
              onValueChange={(value) => setSelectedModelIndex(value)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Select a model --" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {model.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            label="API Key"
            type="password"
            placeholder="Enter your API key for this model"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">
            Add Model
          </Button>
        </form>
      </Card>

      {/* Models List */}
      <Card title={`Your Models (${models.length})`}>
        {models.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No models yet. Add your first model above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((model) => (
              <div
                key={model.id}
                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {model.name}
                      </h3>
                      <Badge variant="secondary">
                        {model.provider}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <strong>API Key:</strong> {model.apiKey.replace(/./g, "*")}
                      </p>
                      <p>
                        <strong>Added:</strong>{" "}
                        {model.createdAt
                          ? new Date(model.createdAt).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(model)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

