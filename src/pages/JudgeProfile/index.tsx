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
    comparisonTitle: "GPT-4 vs Claude 3 - Creative Writing",
    date: new Date("2024-01-20"),
    promptsEvaluated: 3,
    accuracy: 95,
  },
  {
    id: "eval-2",
    comparisonTitle: "Gemini vs GPT-4 - Technical Analysis",
    date: new Date("2024-01-19"),
    promptsEvaluated: 5,
    accuracy: 92,
  },
  {
    id: "eval-3",
    comparisonTitle: "Claude 3 vs PaLM - Code Generation",
    date: new Date("2024-01-18"),
    promptsEvaluated: 4,
    accuracy: 88,
  },
];

const JudgeProfilePage: React.FC = () => {
  const [profile] = useState<JudgeProfile>(dummyJudgeProfile);
  const [evaluationHistory] = useState(dummyEvaluationHistory);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage] = useState("");

  const getJudgeLevel = (evaluations: number) => {
    if (evaluations >= 100)
      return { level: "Expert", color: "text-primary", bg: "bg-primary/10" };
    if (evaluations >= 50)
      return { level: "Advanced", color: "text-primary", bg: "bg-primary/10" };
    if (evaluations >= 20)
      return {
        level: "Intermediate",
        color: "text-primary",
        bg: "bg-primary/10",
      };
    return { level: "Beginner", color: "text-muted-foreground", bg: "bg-muted/30" };
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-primary";
    if (accuracy >= 80) return "text-accent-foreground";
    return "text-destructive";
  };

  const judgeLevel = getJudgeLevel(profile.totalEvaluations);

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

        {/* Judge Level Badge */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-center mb-4">
            <div className={`px-4 py-2 rounded-full ${judgeLevel.bg}`}>
              <span className={`font-semibold ${judgeLevel.color}`}>
                🏆 {judgeLevel.level} Judge
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <Card title="Evaluation Statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
            <p className="text-sm text-muted-foreground">Completed Comparisons</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {profile.averageRating}/5.0
            </p>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-accent-foreground">
              {Math.floor(
                (Date.now() - profile.joinedDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )}
            </p>
            <p className="text-sm text-muted-foreground">Days as Judge</p>
          </div>
        </div>
      </Card>

      {/* Performance Metrics */}
      <Card title="Performance Metrics">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">
              {Math.round(
                (profile.totalEvaluations /
                  Math.max(
                    1,
                    Math.floor(
                      (Date.now() - profile.joinedDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )) *
                  10
              ) / 10}
            </p>
            <p className="text-sm text-muted-foreground">Evaluations per Day</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">
              {Math.round(
                (profile.completedComparisons /
                  Math.max(1, profile.totalEvaluations)) *
                  100
              )}
              %
            </p>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">
              {new Date(profile.lastActive).toLocaleDateString()}
            </p>
            <p className="text-sm text-muted-foreground">Last Active</p>
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {evaluation.comparisonTitle}
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
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${getAccuracyColor(
                        evaluation.accuracy
                      )}`}
                    >
                      {evaluation.accuracy}%
                    </p>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Judge Guidelines */}
      <Card title="Judge Guidelines">
        <div className="space-y-4">
          <div className="bg-primary/10 border-l-4 border-primary p-4">
            <h3 className="font-semibold text-primary mb-2">
              📋 Evaluation Criteria
            </h3>
            <ul className="text-sm text-primary space-y-1">
              <li>• Read prompts and responses carefully</li>
              <li>• Consider accuracy, clarity, and helpfulness</li>
              <li>• Use provided evaluation criteria when available</li>
              <li>• Be consistent in your judgments</li>
            </ul>
          </div>
          <div className="bg-primary/10 border-l-4 border-primary p-4">
            <h3 className="font-semibold text-primary mb-2">
              ✅ Best Practices
            </h3>
            <ul className="text-sm text-primary space-y-1">
              <li>
                • Evaluate based on content quality, not personal preference
              </li>
              <li>• Consider the context and purpose of each comparison</li>
              <li>• Take your time to make thoughtful decisions</li>
              <li>• Report any issues or concerns</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export { JudgeProfilePage as JudgeProfile };
