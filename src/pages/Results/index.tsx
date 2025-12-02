import React, { useState } from "react";
import { Card, Button } from "../../components";
import { Badge } from "../../components/ui/badge";
import { ClipboardList } from "lucide-react";
import { useApp } from "../../context/AppContext";

export const Results: React.FC = () => {
  const { experiments } = useApp();
  const [expandedExpId, setExpandedExpId] = useState<string | null>(null);

  // Generate dummy comparisons for display
  const generateDummyComparisons = (exp: any) => {
    const models = exp.selectedModels;
    const pairs: Array<{ modelA: any; modelB: any }> = [];

    // Generate all possible pairs
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        pairs.push({ modelA: models[i], modelB: models[j] });
      }
    }

    return pairs;
  };

  const generateDummyResponses = (questionText: string, modelName: string) => {
    const responses = [
      `This is a comprehensive answer from ${modelName}. The key points to consider are: First, we need to understand the fundamental concepts. Second, we should analyze the practical implications. Third, it's important to consider real-world applications.`,
      `${modelName} provides this response: Breaking down the question, we can identify several important aspects that need to be addressed carefully and thoroughly.`,
      `According to ${modelName}: This topic has multiple dimensions that deserve careful consideration. The main factors include historical context, current trends, and future implications.`,
    ];
    return responses[questionText.length % responses.length];
  };

  const generateDummyVotes = () => {
    return {
      modelA: Math.floor(Math.random() * 10) + 1,
      modelB: Math.floor(Math.random() * 10) + 1,
      tie: Math.floor(Math.random() * 3),
      bothPoor: Math.floor(Math.random() * 2),
    };
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Results</h1>
          <p className="text-muted-foreground mt-1">
            View and track your model experiments
          </p>
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong>💡 About Results:</strong> This page shows all your
          experiments. Each experiment contains multiple pairwise evaluations between
          the models you selected. Expand any experiment to see detailed results from
          judge evaluations.
        </p>
      </div>

      <Card title={`Your Experiments (${experiments.length})`}>
        {experiments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="mb-4">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium">No experiments yet</p>
            <p className="mt-1">
              Start an experiment from the Dashboard to see results here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {experiments.map((exp) => {
              const modelPairs = generateDummyComparisons(exp);
              const totalComparisons = modelPairs.length;

              return (
                <div
                  key={exp.id}
                  className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border-b border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-foreground">
                            {exp.title}
                          </h3>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              exp.status === "completed"
                                ? "bg-primary/20 text-primary"
                                : "bg-accent/20 text-accent-foreground"
                            }`}
                          >
                            {exp.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Question Pool: <strong>{exp.questionPoolName}</strong>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(exp.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Models */}
                    <div className="flex flex-wrap gap-2">
                      {exp.selectedModels.map((model) => (
                        <div
                          key={model.id}
                          className="px-3 py-1 bg-background border border-primary/30 rounded-full text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {model.name}
                          </span>
                          <span className="text-muted-foreground/70 ml-2">
                            ({model.provider})
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 text-sm text-muted-foreground">
                      <strong>Total Evaluations:</strong> {totalComparisons} pairwise
                      evaluation{totalComparisons !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Expand/Collapse Button */}
                  <div className="p-3 bg-muted/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedExpId(expandedExpId === exp.id ? null : exp.id)
                      }
                      className="w-full"
                    >
                      {expandedExpId === exp.id
                        ? "Hide Detailed Results"
                        : "View Detailed Results"}
                    </Button>
                  </div>

                  {/* Detailed Results */}
                  {expandedExpId === exp.id && (
                    <div className="p-4 bg-card text-card-foreground border-t border-border">
                      <div className="space-y-6">
                        {modelPairs.map((pair, pairIdx) => (
                          <div
                            key={pairIdx}
                            className="border-2 border-primary/30 rounded-lg p-4 bg-primary/10"
                          >
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/30">
                              <h4 className="text-lg font-semibold text-foreground">
                                Evaluation {pairIdx + 1}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                  {pair.modelA.name}
                                </div>
                                <span className="text-muted-foreground/70 font-bold">vs</span>
                                <div className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                                  {pair.modelB.name}
                                </div>
                              </div>
                            </div>

                            {/* Questions for this pair */}
                            <div className="space-y-4">
                              {/* Since we don't have actual questions in exp, we'll show sample data */}
                              {[
                                "Sample question 1 from the pool",
                                "Sample question 2 from the pool",
                              ].map((question, qIdx) => {
                                const votes = generateDummyVotes();
                                const totalVotes =
                                  votes.modelA +
                                  votes.modelB +
                                  votes.tie +
                                  votes.bothPoor;

                                return (
                                  <div
                                    key={qIdx}
                                    className="bg-card text-card-foreground rounded-lg border border-border p-4"
                                  >
                                    {/* Question */}
                                    <div className="mb-3 pb-3 border-b border-border">
                                      <p className="text-sm font-semibold text-muted-foreground mb-1">
                                        <Badge variant="secondary" className="mr-2">
                                          Question {qIdx + 1}
                                        </Badge>
                                      </p>
                                      <p className="text-sm text-foreground">
                                        {question}
                                      </p>
                                    </div>

                                    {/* Responses */}
                                    <div className="grid md:grid-cols-2 gap-3 mb-3">
                                      <div className="bg-primary/10 p-3 rounded border border-primary/30">
                                        <div className="text-xs font-semibold text-primary mb-2">
                                          {pair.modelA.name} Response
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-3">
                                          {generateDummyResponses(
                                            question,
                                            pair.modelA.name
                                          )}
                                        </p>
                                      </div>
                                      <div className="bg-primary/10 p-3 rounded border border-primary/30">
                                        <div className="text-xs font-semibold text-primary mb-2">
                                          {pair.modelB.name} Response
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-3">
                                          {generateDummyResponses(
                                            question,
                                            pair.modelB.name
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Votes */}
                                    <div className="bg-muted/30 p-3 rounded border border-border">
                                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                                        Judge Votes ({totalVotes} total)
                                      </p>
                                      <div className="grid grid-cols-4 gap-2">
                                        <div className="text-center p-2 bg-primary/10 rounded border border-primary/30">
                                          <p className="text-sm font-bold text-primary">
                                            {votes.modelA}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {pair.modelA.name}
                                          </p>
                                        </div>
                                        <div className="text-center p-2 bg-primary/10 rounded border border-primary/30">
                                          <p className="text-sm font-bold text-primary">
                                            {votes.modelB}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {pair.modelB.name}
                                          </p>
                                        </div>
                                        <div className="text-center p-2 bg-accent/20 rounded border border-accent/30">
                                          <p className="text-sm font-bold text-accent-foreground">
                                            {votes.tie}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Tie
                                          </p>
                                        </div>
                                        <div className="text-center p-2 bg-destructive/10 rounded border border-destructive/30">
                                          <p className="text-sm font-bold text-destructive">
                                            {votes.bothPoor}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Both Poor
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Overall Summary */}
                      <div className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg border-2 border-primary/30">
                        <h4 className="text-center text-lg font-bold text-foreground mb-2">
                          Experiment Summary
                        </h4>
                        <p className="text-center text-sm text-muted-foreground">
                          {totalComparisons} pairwise evaluation
                          {totalComparisons !== 1 ? 's' : ''} completed between{' '}
                          {exp.selectedModels.length} models
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

