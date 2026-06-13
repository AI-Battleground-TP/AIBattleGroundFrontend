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
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  User, 
  MoreVertical, 
  Menu, 
  X, 
  Building2, 
  LogOut, 
  Info, 
  Settings, 
  HelpCircle, 
  LayoutDashboard, 
  Trophy, 
  BookOpen, 
  Users, 
  ClipboardCheck, 
  Layout 
} from "lucide-react";
import { createOrganization, joinOrganization } from "../lib/authApi";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    organizations,
    logout,
    switchRole,
    refreshOrganizations,
    switchOrganization,
    isSwitchingOrganization,
  } = useAuth();
  const [activeModal, setActiveModal] = useState<
    "about" | "howItWorks" | "help" | null
  >(null);
  const [isSwitchDialogOpen, setIsSwitchDialogOpen] = useState(false);
  const [pendingOrganizationId, setPendingOrganizationId] = useState("");
  const [switchOrgError, setSwitchOrgError] = useState("");
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [joinOrganizationId, setJoinOrganizationId] = useState("");
  const [isJoiningOrganization, setIsJoiningOrganization] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const closeModal = () => setActiveModal(null);

  const handleMenuItemClick = (modal: "about" | "howItWorks" | "help") => {
    setActiveModal(modal);
  };

  const handleLogout = () => {
    logout();
  };

  const openSwitchOrganizationDialog = () => {
    setPendingOrganizationId(user?.organizationId || organizations[0]?.id || "");
    setSwitchOrgError("");
    setIsSwitchDialogOpen(true);
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

  const handleSwitchOrganization = async () => {
    if (!pendingOrganizationId) {
      setSwitchOrgError("Lutfen bir organization sec.");
      return;
    }

    try {
      const nextUser = await switchOrganization(pendingOrganizationId);
      setIsSwitchDialogOpen(false);
      setSwitchOrgError("");
      navigate(nextUser.role === "judge" ? "/judge" : "/dashboard");
    } catch (error) {
      setSwitchOrgError(
        error instanceof Error
          ? error.message
          : "Organization degistirme basarisiz."
      );
    }
  };

  const handleCreateOrganization = async () => {
    const organizationName = newOrganizationName.trim();
    if (!organizationName) {
      setSwitchOrgError("Organization name is required.");
      return;
    }

    const accessToken = localStorage.getItem("bt_access_token");
    if (!accessToken) {
      setSwitchOrgError("Missing access token.");
      return;
    }

    setIsCreatingOrganization(true);
    setSwitchOrgError("");
    try {
      const organization = await createOrganization(accessToken, organizationName);
      await refreshOrganizations();
      setPendingOrganizationId(organization.id);
      setNewOrganizationName("");
    } catch (error) {
      setSwitchOrgError(
        error instanceof Error ? error.message : "Organization could not be created."
      );
    } finally {
      setIsCreatingOrganization(false);
    }
  };

  const handleJoinOrganization = async () => {
    const orgId = joinOrganizationId.trim();
    if (!orgId) {
      setSwitchOrgError("Organization ID is required.");
      return;
    }

    const accessToken = localStorage.getItem("bt_access_token");
    if (!accessToken) {
      setSwitchOrgError("Missing access token.");
      return;
    }

    setIsJoiningOrganization(true);
    setSwitchOrgError("");
    try {
      const organization = await joinOrganization(accessToken, orgId);
      await refreshOrganizations();
      setPendingOrganizationId(organization.id);
      setJoinOrganizationId("");
    } catch (error) {
      setSwitchOrgError(
        error instanceof Error ? error.message : "Could not join organization."
      );
    } finally {
      setIsJoiningOrganization(false);
    }
  };

  const currentOrganizationLabel =
    user?.organizationName ||
    organizations.find((o) => o.id === user?.organizationId)?.name ||
    "";

  const navLinks = [
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ...(user?.role === "judge" ? [{ to: "/guidelines", label: "Guidelines", icon: BookOpen }] : []),
    ...(user?.role === "user" ? [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/models", label: "Models", icon: Layout },
      { to: "/questions", label: "Questions", icon: HelpCircle },
      { to: "/results", label: "Results", icon: ClipboardCheck },
      ...(user.isHead ? [{ to: "/judges", label: "Judges", icon: Users }] : []),
    ] : []),
    ...(user?.role === "judge" ? [{ to: "/judge", label: "Judge", icon: ClipboardCheck }] : []),
  ];

  return (
    <>
      <nav className="bg-background border-b sticky top-0 z-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side: Logo & Navigation */}
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex items-center shrink-0 mr-6">
                <Link to="/" className="flex items-center space-x-2">
                  <img
                    src="/logo_yazisiz.png"
                    alt="AI Battleground"
                    className="h-10 w-auto"
                  />
                  <span className="text-lg font-bold bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent hidden md:block">
                    AI Battleground
                  </span>
                </Link>
              </div>

              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center space-x-1 overflow-x-auto no-scrollbar">
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to}>
                    <Button
                      size="sm"
                      variant={isActive(link.to) ? "secondary" : "ghost"}
                      className="px-3 whitespace-nowrap"
                    >
                      <link.icon className="w-4 h-4 mr-1.5" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side actions (Desktop) */}
            <div className="hidden md:flex items-center space-x-3 ml-4">
              {user ? (
                <>
                  {user.isHead && (
                    <div className="flex items-center space-x-1 border border-border rounded-md p-1 bg-muted/30 shrink-0">
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
                  )}

                  <div className="flex items-center gap-2 max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate text-sm text-foreground font-medium">
                          {currentOrganizationLabel || "—"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {currentOrganizationLabel || "No organization selected"}
                      </TooltipContent>
                    </Tooltip>
                    <ShadcnButton
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 px-2"
                      onClick={openSwitchOrganizationDialog}
                    >
                      <Building2 className="w-3.5 h-3.5 mr-1.5" />
                      <span className="hidden lg:inline text-xs ml-1.5">Switch</span>
                    </ShadcnButton>
                  </div>

                  <div className="h-6 w-px bg-border mx-1" />

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
                      <p>{user.name}</p>
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <ShadcnButton
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 w-8"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </ShadcnButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5 md:hidden">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator className="md:hidden" />
                      <DropdownMenuItem onClick={() => handleMenuItemClick("about")}>
                        <Info className="w-4 h-4 mr-2" />
                        About Us
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMenuItemClick("howItWorks")}>
                        <HelpCircle className="w-4 h-4 mr-2" />
                        How It Works
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMenuItemClick("help")}>
                        <Settings className="w-4 h-4 mr-2" />
                        Help & FAQ
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/login">
                    <Button size="sm" variant="ghost">Login</Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center">
               <ShadcnButton
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </ShadcnButton>
            </div>
          </div>
        </div>

        {/* Mobile Menu Content */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t bg-background overflow-y-auto max-h-[calc(100vh-4rem)]">
            <div className="px-4 pt-2 pb-6 space-y-4">
              {/* User Info on Mobile */}
              {user && (
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Nav Links on Mobile */}
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Navigation
                </p>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.to)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <link.icon className="w-4 h-4 mr-3" />
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Actions on Mobile */}
              {user && (
                <div className="space-y-4 pt-2 border-t">
                  {user.isHead && (
                    <div className="px-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Role
                      </p>
                      <div className="flex p-1 bg-muted rounded-md">
                        <button
                          onClick={() => handleRoleSwitch("user")}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            user.role === "user"
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          Head
                        </button>
                        <button
                          onClick={() => handleRoleSwitch("judge")}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            user.role === "judge"
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          Judge
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="px-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Organization
                    </p>
                    <div className="flex items-center justify-between p-3 bg-muted/30 border rounded-md">
                      <span className="text-sm truncate mr-2 font-medium">{currentOrganizationLabel || "No Organization"}</span>
                      <ShadcnButton
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={() => {
                          openSwitchOrganizationDialog();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1.5" />
                        Switch
                      </ShadcnButton>
                    </div>
                  </div>

                  <div className="px-3 pt-2 space-y-1">
                     <button
                      onClick={() => {
                        handleMenuItemClick("about");
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      <Info className="w-4 h-4 mr-3 text-muted-foreground" />
                      About Us
                    </button>
                    <button
                      onClick={() => {
                        handleMenuItemClick("howItWorks");
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      <HelpCircle className="w-4 h-4 mr-3 text-muted-foreground" />
                      How It Works
                    </button>
                    <button
                      onClick={() => {
                        handleMenuItemClick("help");
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
                      Help & FAQ
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors mt-2"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              )}

              {!user && (
                <div className="grid grid-cols-2 gap-3 px-3">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Login</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <Dialog open={isSwitchDialogOpen} onOpenChange={setIsSwitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Organization</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Select
              value={pendingOrganizationId}
              onValueChange={(value) => {
                setPendingOrganizationId(value);
                setSwitchOrgError("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {switchOrgError && (
              <p className="text-sm text-destructive">{switchOrgError}</p>
            )}

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium text-foreground">
                Create Organization
              </p>
              <div className="flex gap-2">
                <Input
                  value={newOrganizationName}
                  onChange={(event) => {
                    setNewOrganizationName(event.target.value);
                    setSwitchOrgError("");
                  }}
                  placeholder="New organization name"
                  disabled={isCreatingOrganization || isSwitchingOrganization}
                />
                <ShadcnButton
                  type="button"
                  variant="outline"
                  onClick={handleCreateOrganization}
                  disabled={
                    isCreatingOrganization ||
                    isSwitchingOrganization ||
                    !newOrganizationName.trim()
                  }
                >
                  {isCreatingOrganization ? "Creating..." : "Create"}
                </ShadcnButton>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium text-foreground">
                Join Organization
              </p>
              <div className="flex gap-2">
                <Input
                  value={joinOrganizationId}
                  onChange={(event) => {
                    setJoinOrganizationId(event.target.value);
                    setSwitchOrgError("");
                  }}
                  placeholder="Organization ID"
                  disabled={isJoiningOrganization || isSwitchingOrganization}
                />
                <ShadcnButton
                  type="button"
                  variant="outline"
                  onClick={handleJoinOrganization}
                  disabled={
                    isJoiningOrganization ||
                    isSwitchingOrganization ||
                    !joinOrganizationId.trim()
                  }
                >
                  {isJoiningOrganization ? "Joining..." : "Join"}
                </ShadcnButton>
              </div>
            </div>
          </div>

          <DialogFooter>
            <ShadcnButton
              variant="outline"
              onClick={() => setIsSwitchDialogOpen(false)}
              disabled={isSwitchingOrganization}
            >
              Cancel
            </ShadcnButton>
            <ShadcnButton
              onClick={handleSwitchOrganization}
              disabled={
                isSwitchingOrganization ||
                !pendingOrganizationId ||
                pendingOrganizationId === user?.organizationId
              }
            >
              {isSwitchingOrganization ? "Switching..." : "Switch"}
            </ShadcnButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
};
