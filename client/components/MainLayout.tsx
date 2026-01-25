import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell, Lock } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-primary/20 bg-background/80 backdrop-blur-md shadow-blue-glow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-primary shadow-blue-glow-lg flex items-center justify-center transition-transform group-hover:scale-110">
                <svg
                  className="w-6 h-6 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-extrabold text-primary glow-blue hidden sm:block tracking-tight">
                Al-Ghaith Pharmacy
              </h1>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                className="p-2.5 hover:bg-primary/10 rounded-xl transition-all text-muted-foreground hover:text-primary hover:shadow-blue-glow"
                title="الإشعارات"
              >
                <Bell className="w-6 h-6" />
              </Link>
              <Link
                to="/admin-log"
                className="p-2.5 hover:bg-primary/10 rounded-xl transition-all text-muted-foreground hover:text-primary hover:shadow-blue-glow"
                title="غرفة الإدارة"
              >
                <Lock className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 dark:bg-slate-900/50 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium">
              <strong>BY: NZAR NURI</strong>
            </p>
            <h1>
              <strong>07804678287</strong>
            </h1>
          </div>
        </div>
      </footer>
    </div>
  );
}
