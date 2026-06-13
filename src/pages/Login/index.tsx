import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  createOrganization,
  detectHeadAccess,
  getMe,
  getMyOrganizations,
  loginRequest,
  selectOrganizationToken,
  signupRequest,
  type OrganizationItem,
} from "../../lib/authApi";
import { Eye, EyeOff } from "lucide-react";

type LoginStep = "credentials" | "organization";
type SignupStep = "credentials" | "organization";
type SignupOrgMode = "join" | "new";

const mapSignupErrorMessage = (error: unknown, signupOrgMode: SignupOrgMode) => {
  const fallbackMessage = "Sign up islemi basarisiz.";

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  if (
    signupOrgMode === "join" &&
    error.message.trim() === "Email address already registered."
  ) {
    return "An account with this email already exists. If the organization ID was incorrect, log in and continue with the correct organization.";
  }

  return error.message;
};

export const Login: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const isSignupPath = location.pathname === "/signup";

  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [signupStep, setSignupStep] = useState<SignupStep>("credentials");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loginAccessToken, setLoginAccessToken] = useState("");
  const [loginOrganizations, setLoginOrganizations] = useState<OrganizationItem[]>(
    []
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupSurname, setSignupSurname] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupOrgMode, setSignupOrgMode] = useState<SignupOrgMode>("join");
  const [signupOrganizationId, setSignupOrganizationId] = useState("");
  const [signupOrganizationName, setSignupOrganizationName] = useState("");

  const resetErrors = () => setErrorMessage("");

  const handleLoginCredentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetErrors();
    setIsSubmitting(true);
    try {
      const tokenResponse = await loginRequest(
        loginEmail.trim().toLowerCase(),
        loginPassword.trim()
      );
      const organizations = await getMyOrganizations(tokenResponse.access_token);

      if (!organizations.length) {
        setErrorMessage("Bu kullanici herhangi bir organization'a ait degil.");
        return;
      }

      setLoginAccessToken(tokenResponse.access_token);
      setLoginOrganizations(organizations);
      setSelectedOrgId(organizations[0].id);
      setLoginStep("organization");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Login islemi basarisiz."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    resetErrors();

    if (!loginAccessToken) {
      setErrorMessage("Oturum bilgisi bulunamadi, tekrar login ol.");
      setLoginStep("credentials");
      return;
    }

    if (!selectedOrgId) {
      setErrorMessage("Lutfen bir organization sec.");
      return;
    }

    const selectedOrganization = loginOrganizations.find(
      (organization) => organization.id === selectedOrgId
    );

    if (!selectedOrganization) {
      setErrorMessage("Secilen organization bulunamadi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const switchedToken = await selectOrganizationToken(
        loginAccessToken,
        selectedOrgId
      );
      const finalAccessToken = switchedToken.access_token;
      const finalRefreshToken = switchedToken.refresh_token;
      const me = await getMe(finalAccessToken);
      const isHeadUser = await detectHeadAccess(finalAccessToken, selectedOrgId);
      const mappedRole = isHeadUser ? "user" : "judge";

      login({
        email: me.email,
        name: `${me.name} ${me.surname}`.trim(),
        role: mappedRole,
        isHead: isHeadUser,
        organizationId: selectedOrganization.id,
        organizationName: selectedOrganization.name,
        accessToken: finalAccessToken,
        refreshToken: finalRefreshToken,
        organizations: loginOrganizations,
      });

      navigate(mappedRole === "judge" ? "/judge" : "/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Organization secimi basarisiz."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupCredentialsSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    resetErrors();
    setSignupStep("organization");
  };

  const handleCompleteSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    resetErrors();
    setIsSubmitting(true);

    const normalizedOrgName = signupOrganizationName.trim();
    const normalizedOrgId = signupOrganizationId.trim();
    if (signupOrgMode === "join" && !normalizedOrgId) {
      setErrorMessage("Organization ID gerekli.");
      setIsSubmitting(false);
      return;
    }
    if (signupOrgMode === "new" && !normalizedOrgName) {
      setErrorMessage("New organization icin ad gerekli.");
      setIsSubmitting(false);
      return;
    }

    try {
      const normalizedEmail = signupEmail.trim().toLowerCase();
      const normalizedPassword = signupPassword.trim();

      await signupRequest({
        email: normalizedEmail,
        password: normalizedPassword,
        name: signupName.trim(),
        surname: signupSurname.trim(),
        phone: signupPhone.trim() || undefined,
      });

      const initialToken = await loginRequest(normalizedEmail, normalizedPassword);
      let selectedOrganizationId = normalizedOrgId;
      let selectedOrganizationName = normalizedOrgName;

      if (signupOrgMode === "new") {
        const createdOrg = await createOrganization(
          initialToken.access_token,
          normalizedOrgName
        );
        selectedOrganizationId = createdOrg.id;
        selectedOrganizationName = createdOrg.name;
      }

      if (!selectedOrganizationId) {
        throw new Error("Organization secimi tamamlanamadi.");
      }

      const switchedToken = await selectOrganizationToken(
        initialToken.access_token,
        selectedOrganizationId
      );
      const finalAccessToken = switchedToken.access_token;
      const finalRefreshToken = switchedToken.refresh_token;
      const me = await getMe(finalAccessToken);

      let organizationName = selectedOrganizationName;
      const organizations = await getMyOrganizations(finalAccessToken);
      const matchedOrganization = organizations.find(
        (org) => org.id === selectedOrganizationId
      );
      if (matchedOrganization) {
        organizationName = matchedOrganization.name;
      }

      const isHeadUser = await detectHeadAccess(
        finalAccessToken,
        selectedOrganizationId
      );
      const mappedRole = isHeadUser ? "user" : "judge";

      signup({
        email: me.email,
        name: `${me.name} ${me.surname}`.trim(),
        role: mappedRole,
        isHead: isHeadUser,
        organizationId: selectedOrganizationId,
        organizationName: organizationName || "Organization",
        accessToken: finalAccessToken,
        refreshToken: finalRefreshToken,
        organizations,
      });

      navigate(mappedRole === "judge" ? "/judge" : "/dashboard");
    } catch (error) {
      setErrorMessage(mapSignupErrorMessage(error, signupOrgMode));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{isSignupPath ? "Sign Up" : "Login"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSignupPath && loginStep === "credentials" && (
            <form className="space-y-4" onSubmit={handleLoginCredentialsSubmit}>
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowLoginPassword((open) => !open)}
                    aria-label={
                      showLoginPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                  Next
                </Button>
              </div>
            </form>
          )}

          {!isSignupPath && loginStep === "organization" && (
            <form className="space-y-4" onSubmit={handleCompleteLogin}>
              <div className="space-y-3">
                <Label>Select Organization</Label>
                <RadioGroup
                  value={selectedOrgId}
                  onValueChange={setSelectedOrgId}
                  className="gap-3"
                >
                  {loginOrganizations.map((organization) => (
                    <label
                      key={organization.id}
                      className="flex items-center gap-3 rounded-md border p-3 cursor-pointer"
                    >
                      <RadioGroupItem value={organization.id} id={organization.id} />
                      <div>
                        <p className="font-medium">{organization.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {organization.id}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLoginStep("credentials")}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                  Login
                </Button>
              </div>
            </form>
          )}

          {isSignupPath && signupStep === "credentials" && (
            <form className="space-y-4" onSubmit={handleSignupCredentialsSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-surname">Surname</Label>
                  <Input
                    id="signup-surname"
                    value={signupSurname}
                    onChange={(event) => setSignupSurname(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    className="pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSignupPassword((open) => !open)}
                    aria-label={
                      showSignupPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showSignupPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone">Phone (optional)</Label>
                <Input
                  id="signup-phone"
                  value={signupPhone}
                  onChange={(event) => setSignupPhone(event.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                  Next
                </Button>
              </div>
            </form>
          )}

          {isSignupPath && signupStep === "organization" && (
            <form className="space-y-5" onSubmit={handleCompleteSignup}>
              <div className="space-y-3">
                <Label>Organization Option</Label>
                <RadioGroup
                  value={signupOrgMode}
                  onValueChange={(value) => setSignupOrgMode(value as SignupOrgMode)}
                  className="gap-3"
                >
                  <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer">
                    <RadioGroupItem value="join" id="join-existing-org" />
                    <div>
                      <p className="font-medium">Join with Organization ID</p>
                      <p className="text-sm text-muted-foreground">
                        Existing organization ID ile katil.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer">
                    <RadioGroupItem value="new" id="create-new-org" />
                    <div>
                      <p className="font-medium">Create New Organization</p>
                      <p className="text-sm text-muted-foreground">
                        Sifirdan organization olustur.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {signupOrgMode === "join" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-organization-id">Organization ID</Label>
                    <Input
                      id="signup-organization-id"
                      value={signupOrganizationId}
                      onChange={(event) => setSignupOrganizationId(event.target.value)}
                      placeholder="UUID organization id"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="signup-new-org-name">Organization Name</Label>
                  <Input
                    id="signup-new-org-name"
                    value={signupOrganizationName}
                    onChange={(event) =>
                      setSignupOrganizationName(event.target.value)
                    }
                    placeholder="Your new organization"
                    required
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSignupStep("credentials")}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                  Sign Up
                </Button>
              </div>
            </form>
          )}

          {errorMessage && (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
