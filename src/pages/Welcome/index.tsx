import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components";
import { useAuth } from "../../context/AuthContext";

export const Welcome: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="text-center max-w-4xl px-4">
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
          Compare and evaluate Large Language Models (LLMs) through blind
          testing. Upload your models, create prompts, and let judges evaluate
          responses anonymously to discover which models truly perform best.
        </p>

        <div className="bg-muted/30 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary mb-2">1</div>
              <h3 className="text-lg font-semibold mb-2">Submit Models</h3>
              <p className="text-muted-foreground">
                Users upload their LLM models via API keys and provide test
                prompts
              </p>
            </div>
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary mb-2">2</div>
              <h3 className="text-lg font-semibold mb-2">Blind Evaluation</h3>
              <p className="text-muted-foreground">
                Judges compare responses from two anonymous models side-by-side
              </p>
            </div>
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary mb-2">3</div>
              <h3 className="text-lg font-semibold mb-2">View Rankings</h3>
              <p className="text-muted-foreground">
                Models are ranked using ELO ratings based on judge preferences
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          {!user ? (
            <>
              <Link to="/login">
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

        <div className="mt-12 text-muted-foreground">
          <p className="mb-2">
            <span className="font-semibold">Why Blind Testing?</span>
          </p>
          <p className="text-sm max-w-2xl mx-auto">
            Blind testing eliminates bias by hiding model identities. Judges
            evaluate responses purely on quality, providing objective insights
            into model performance across different tasks and use cases.
          </p>
        </div>
      </div>
    </div>
  );
};
