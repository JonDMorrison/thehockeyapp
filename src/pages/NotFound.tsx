import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AppShell, PageContainer, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";
import { logger } from "@/core";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    logger.warn("404: Non-existent route accessed", { path: location.pathname });
  }, [location.pathname]);

  return (
    <AppShell hideNav>
      <PageContainer className="flex flex-col items-center justify-center min-h-[80vh]">
        <EmptyState
          icon={AlertCircle}
          title={t("common.pageNotFound")}
          description={t("common.pageNotFoundDescription", { path: location.pathname })}
        />
        <Button asChild variant="team" className="mt-4">
          {(
            <Link to="/today">
              <Home className="w-4 h-4 mr-2" />
              {t("common.backToHome")}
            </Link>
          )}
        </Button>
      </PageContainer>
    </AppShell>
  );
};

export default NotFound;
