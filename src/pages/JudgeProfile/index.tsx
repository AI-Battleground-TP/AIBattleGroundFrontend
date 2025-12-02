import React, { useState } from "react";
import { Card, Toast } from "../../components";
import type { JudgeProfile } from "../../types";

// Dummy judge profile data
const dummyJudgeProfile: JudgeProfile = {
  id: "judge-1",
  username: "judge_sarah",
  email: "sarah.judge@example.com",
  firstName: "Sarah",
  lastName: "Johnson",
  totalEvaluations: 47,
  completedComparisons: 12,
  averageRating: 4.8,
  joinedDate: new Date("2024-01-01"),
  lastActive: new Date("2024-01-20"),
};

// Dummy evaluation history
const dummyEvaluationHistory = [
  {
    id: "eval-1",
    experimentTitle: "GPT-4 vs Claude 3 - Creative Writing",
    date: new Date("2024-01-20"),
    promptsEvaluated: 3,
  },
  {
    id: "eval-2",
    experimentTitle: "Gemini vs GPT-4 - Technical Analysis",
    date: new Date("2024-01-19"),
    promptsEvaluated: 5,
  },
  {
    id: "eval-3",
    experimentTitle: "Claude 3 vs PaLM - Code Generation",
    date: new Date("2024-01-18"),
    promptsEvaluated: 4,
  },
];

const JudgeProfilePage: React.FC = () => {
  const [profile] = useState<JudgeProfile>(dummyJudgeProfile);
  const [evaluationHistory] = useState(dummyEvaluationHistory);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage] = useState("");


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
      <Card title="Judge Profile">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <div className="px-3 py-2 border border-input rounded-md bg-muted/30 text-foreground">
                {profile.firstName}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Last Name
              </label>
              <div className="px-3 py-2 border border-input rounded-md bg-muted/30 text-foreground">
                {profile.lastName}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Username
              </label>
              <div className="px-3 py-2 border border-input rounded-md bg-muted/30 text-foreground">
                {profile.username}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <div className="px-3 py-2 border border-input rounded-md bg-muted/30 text-foreground">
                {profile.email}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <Card title="Evaluation Statistics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {profile.totalEvaluations}
            </p>
            <p className="text-sm text-muted-foreground">Total Evaluations</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {profile.completedComparisons}
            </p>
            <p className="text-sm text-muted-foreground">Completed Experiments</p>
          </div>
        </div>
      </Card>

      {/* Recent Evaluations */}
      <Card title="Recent Evaluations">
        <div className="space-y-4">
          {evaluationHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No evaluations yet. Start judging to see your history!</p>
            </div>
          ) : (
            evaluationHistory.map((evaluation) => (
              <div
                key={evaluation.id}
                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {evaluation.experimentTitle}
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Date:</strong>{" "}
                      {evaluation.date.toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Prompts Evaluated:</strong>{" "}
                      {evaluation.promptsEvaluated}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

    </div>
  );
};

export { JudgeProfilePage as JudgeProfile };
