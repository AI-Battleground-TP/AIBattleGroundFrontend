import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button as ShadcnButton } from "./ui/button";
import { User, MoreVertical } from "lucide-react";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, switchRole } = useAuth();
  const [activeModal, setActiveModal] = useState<
    "about" | "howItWorks" | "help" | null
  >(null);

  const isActive = (path: string) => location.pathname === path;

  const closeModal = () => setActiveModal(null);

  const handleMenuItemClick = (modal: "about" | "howItWorks" | "help") => {
    setActiveModal(modal);
  };

  const handleLogout = () => {
    logout();
  };

  const handleRoleSwitch = (newRole: "user" | "judge") => {
    if (user && user.role !== newRole) {
      switchRole(newRole);
      // Navigate to appropriate page based on new role
      if (newRole === "user") {
        navigate("/dashboard");
      } else {
        navigate("/judge");
      }
    }
  };

  return (
    <nav className="bg-background border-b relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-1 mr-6">
              <img
                src="/logo_yazisiz.png"
                alt="AI Battleground"
                className="h-12 w-auto"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                AI Battleground
              </span>
            </Link>
            <div className="flex items-baseline space-x-2">
              <Link to="/leaderboard">
                <Button
                  size="sm"
                  variant={isActive("/leaderboard") ? "secondary" : "ghost"}
                  className="px-2"
                >
                  Leaderboard
                </Button>
              </Link>
              {user && user.role === "judge" && (
                <Link to="/guidelines">
                  <Button
                    size="sm"
                    variant={isActive("/guidelines") ? "secondary" : "ghost"}
                    className="px-2"
                  >
                    Guidelines
                  </Button>
                </Link>
              )}
              {user && user.role === "user" && (
                <>
                  <Link to="/dashboard">
                    <Button
                      size="sm"
                      variant={isActive("/dashboard") ? "secondary" : "ghost"}
                      className="px-2"
                    >
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/models">
                    <Button
                      size="sm"
                      variant={isActive("/models") ? "secondary" : "ghost"}
                      className="px-2"
                    >
                      Models
                    </Button>
                  </Link>
                  <Link to="/questions">
                    <Button
                      size="sm"
                      variant={isActive("/questions") ? "secondary" : "ghost"}
                      className="px-2"
                    >
                      Questions
                    </Button>
                  </Link>
                  <Link to="/results">
                    <Button
                      size="sm"
                      variant={isActive("/results") ? "secondary" : "ghost"}
                      className="px-2"
                    >
                      Results
                    </Button>
                  </Link>
                </>
              )}
              {user && user.role === "judge" && (
                <>
                  <Link to="/judge">
                    <Button
                      size="sm"
                      variant={isActive("/judge") ? "secondary" : "ghost"}
                      className="px-2"
                    >
                      Judge
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                {/* Role Switcher */}
                <div className="flex items-center space-x-2 border border-border rounded-md p-1 bg-muted/30">
                  <button
                    onClick={() => handleRoleSwitch("user")}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      user.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Head
                  </button>
                  <button
                    onClick={() => handleRoleSwitch("judge")}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      user.role === "judge"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Judge
                  </button>
                </div>

                <span className="text-sm text-muted-foreground hidden md:block">
                  {user.name}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to={user.role === "judge" ? "/judge-profile" : "/profile"}>
                      <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Profile</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* 3-dot menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ShadcnButton
                      variant="outline"
                      size="sm"
                      className="p-1.5 h-auto"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </ShadcnButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleMenuItemClick("about")}>
                      About Us
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuItemClick("howItWorks")}>
                      How It Works
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuItemClick("help")}>
                      Help
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/login">
                <Button size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* About Us Modal */}
      <Modal
        isOpen={activeModal === "about"}
        onClose={closeModal}
        title="About Us"
      >
        <div className="space-y-4">
          <p className="text-foreground leading-relaxed">
            <strong className="bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
              AI Battleground
            </strong>{" "}
            is a cutting-edge platform dedicated to objective evaluation of
            Large Language Models (LLMs) through blind testing methodology.
          </p>
          <p className="text-foreground leading-relaxed">
            Our mission is to provide unbiased, transparent, and reliable
            insights into AI model performance by eliminating brand bias and
            focusing purely on output quality.
          </p>
          <div className="bg-primary/10 p-4 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Our Values:</h3>
            <ul className="space-y-2 text-foreground">
              <li>
                ✓ <strong>Objectivity:</strong> Blind testing ensures unbiased
                results
              </li>
              <li>
                ✓ <strong>Transparency:</strong> Open methodology and clear
                metrics
              </li>
              <li>
                ✓ <strong>Community:</strong> Powered by human judges worldwide
              </li>
              <li>
                ✓ <strong>Innovation:</strong> Advancing AI evaluation standards
              </li>
            </ul>
          </div>
          <p className="text-muted-foreground text-sm">
            Founded by AI researchers and engineers passionate about creating
            fair benchmarking standards for the AI community.
          </p>
        </div>
      </Modal>

      {/* How It Works Modal */}
      <Modal
        isOpen={activeModal === "howItWorks"}
        onClose={closeModal}
        title="How It Works"
      >
        <div className="space-y-6">
          <p className="text-foreground leading-relaxed">
            Our platform uses a blind testing methodology combined with ELO
            ratings to rank AI models objectively.
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Model Submission
                </h3>
                <p className="text-muted-foreground text-sm">
                  Users upload their LLM models by providing API keys and test
                  prompts. Models remain anonymous during evaluation.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Blind Evaluation
                </h3>
                <p className="text-muted-foreground text-sm">
                  Judges compare responses from two anonymous models
                  side-by-side, selecting the better response based on quality,
                  accuracy, and helpfulness.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  ELO Ranking
                </h3>
                <p className="text-muted-foreground text-sm">
                  Models are ranked using the ELO rating system, which adjusts
                  ratings based on win/loss outcomes and opponent strength.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Results & Insights
                </h3>
                <p className="text-muted-foreground text-sm">
                  View comprehensive rankings, statistics, and performance
                  metrics on our public leaderboard.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-accent/20 border border-accent/30 p-4 rounded-lg">
            <p className="text-sm text-accent-foreground">
              <strong>💡 Pro Tip:</strong> The blind methodology eliminates
              brand bias, ensuring models are judged purely on performance, not
              reputation.
            </p>
          </div>
        </div>
      </Modal>

      {/* Help Modal */}
      <Modal
        isOpen={activeModal === "help"}
        onClose={closeModal}
        title="Help & FAQ"
      >
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              🚀 Getting Started
            </h3>
            <div className="space-y-2 text-sm text-foreground">
              <p>
                <strong>For Model Submitters:</strong> Login → Dashboard →
                Submit your model with API key and prompts → Wait for evaluation
              </p>
              <p>
                <strong>For Judges:</strong> Login → Judge Dashboard → Compare
                responses → Vote for better model
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-foreground mb-3">
              ❓ Frequently Asked Questions
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-foreground text-sm">
                  Q: Is my API key secure?
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  A: Yes, API keys are encrypted and never exposed to judges or
                  other users. They are used only to generate model responses.
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground text-sm">
                  Q: How are models kept anonymous?
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  A: During evaluation, models are labeled only as "Model A" and
                  "Model B". Judge see no identifying information.
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground text-sm">
                  Q: What is ELO rating?
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  A: ELO is a rating system that ranks models based on
                  head-to-head comparisons. Higher ratings indicate better
                  performance.
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground text-sm">
                  Q: Can I submit multiple models?
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  A: Yes! Submit as many models as you'd like to compare
                  different configurations or providers.
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground text-sm">
                  Q: How do I upload prompts via CSV?
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  A: Use the "CSV Upload" option in the dashboard. Download our
                  sample template for the correct format.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
            <p className="text-sm text-foreground">
              <strong>💬 Need More Help?</strong> Contact us at{" "}
              <a
                href="mailto:support@blindtest.ai"
                className="text-primary hover:underline"
              >
                support@blindtest.ai
              </a>
            </p>
          </div>
        </div>
      </Modal>
    </nav>
  );
};
