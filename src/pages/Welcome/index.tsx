import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components";
import { useAuth } from "../../context/AuthContext";

export const Welcome: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="text-center w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-0.1">
          <img
            src="/logo_yazisiz.png"
            alt="AI Battleground"
            className="h-48 w-auto"
          />
        </div>
        <h1 className="text-5xl font-bold mb-3">
          <span className="bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
            AI Battleground
          </span>
        </h1>
        <p className="text-2xl text-foreground font-semibold mb-6">
          Where AI Models Compete
        </p>
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
        Compare Large Language Models, prompts, and model configurations through blind evaluation.
        Test foundation models, fine-tuned models, and custom configurations on your own question pools,
        then discover which setup performs best for your specific use case.

        </p>

        <div className="bg-muted/30 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary mb-2">1</div>
              <h3 className="text-lg font-semibold mb-2">Configure Models</h3>
              <p className="text-muted-foreground">
                Select the models, prompts, and configurations you want to evaluate.
              </p>
            </div>
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary mb-2">2</div>
              <h3 className="text-lg font-semibold mb-2">Upload Questions</h3>
              <p className="text-muted-foreground">
                Create question pools tailored to your domain, task, or evaluation goals.
              </p>
            </div>
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary mb-2">3</div>
              <h3 className="text-lg font-semibold mb-2">Compare Responses</h3>
              <p className="text-muted-foreground">
                Perform blind evaluations and discover which models perform best on your leaderboard.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          {!user ? (
            <>
              <Link to="/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/leaderboard">
                <Button size="lg" variant="outline">
                  View Leaderboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to={user.role === "user" ? "/dashboard" : "/judge"}>
                <Button size="lg">
                  {user.role === "user" ? "Go to Dashboard" : "Start Judging"}
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button size="lg" variant="outline">
                  View Leaderboard
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="mt-12">
          <div className="grid gap-5 md:grid-cols-3 text-left text-muted-foreground">
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <p className="mb-2 text-sm font-semibold text-foreground">
                Why Human Evaluation?
              </p>
              <p className="text-sm leading-6">
                Automated metrics often require known correct answers, while LLM-based judges
                depend on another model&apos;s capabilities and assumptions. Human evaluation
                brings domain expertise, captures user preferences, and provides a reliable way
                to validate model performance in real-world applications.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <p className="mb-2 text-sm font-semibold text-foreground">
                Why Comparative Evaluation?
              </p>
              <p className="text-sm leading-6">
                Assigning absolute scores requires detailed rubrics that are difficult and
                time-consuming to create and apply consistently. Comparing two responses is
                often faster, easier, and more reliable, allowing evaluators to make meaningful
                judgments across large question sets with less effort.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <p className="mb-2 text-sm font-semibold text-foreground">
                Why Blind Testing?
              </p>
              <p className="text-sm leading-6">
                Blind testing eliminates bias by hiding model identities. Judges evaluate
                responses purely on quality, providing objective insights into model performance
                across different tasks and use cases.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
