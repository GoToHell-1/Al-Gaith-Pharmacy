import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-accent mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-foreground mb-2">404</h1>
          <p className="text-xl text-muted-foreground mb-4">
            آسف! الصفحة غير موجودة
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {location.pathname}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;
