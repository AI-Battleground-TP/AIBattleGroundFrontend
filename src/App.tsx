//.
import React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { AppRouter } from "./router";

const App: React.FC = () => {
  return (
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <AppRouter />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            expand={true}
            duration={4000}
          />
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  );
};

export default App;
