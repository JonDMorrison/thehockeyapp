import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AppShell, PageContainer, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <AppShell hideNav>
      <PageContainer className="flex flex-col items-center justify-center min-h-[80vh]">
        <EmptyState
          icon={AlertCircle}
          title="Page not found"
          description={`The page "${location.pathname}" doesn't exist or has been moved.`}
        />
        <Button asChild variant="team" className="mt-4">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </PageContainer>
    </AppShell>
  );
};

export default NotFound;
