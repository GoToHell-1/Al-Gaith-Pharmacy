import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  ArrowLeft,
  Lock,
  LogOut,
  Trash2,
  Plus,
  Loader,
} from "lucide-react";
import { database, ref, onValue, off } from "@/lib/firebase";

interface Activity {
  id: string;
  type: "add_medicine" | "delete_medicine";
  medicineName: string;
  categoryId: string;
  categoryName: string;
  timestamp: string;
  timestamp_ms: number;
}

export default function AdminLog() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Load activities from Firebase
  useEffect(() => {
    if (!authenticated) return;

    const activitiesRef = ref(database, "activities");
    const unsubscribe = onValue(activitiesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const activitiesList = Object.entries(data).map(
          ([id, activity]: any) => ({
            id,
            ...activity,
          }),
        );
        // Sort by timestamp (newest first)
        activitiesList.sort(
          (a, b) => b.timestamp_ms - a.timestamp_ms,
        );
        setActivities(activitiesList);
      } else {
        setActivities([]);
      }
    });

    return () => off(activitiesRef);
  }, [authenticated]);

  const handleLogin = () => {
    setIsLoading(true);
    // Simulate password check delay
    setTimeout(() => {
      if (password === "000") {
        setAuthenticated(true);
        setPassword("");
      } else {
        alert("كلمة السر غير صحيحة");
      }
      setIsLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setPassword("");
  };

  const getActivityIcon = (type: string) => {
    return type === "add_medicine" ? (
      <Plus className="w-5 h-5" />
    ) : (
      <Trash2 className="w-5 h-5" />
    );
  };

  const getActivityLabel = (type: string) => {
    return type === "add_medicine" ? "إضافة دواء" : "حذف دواء";
  };

  const getActivityColor = (type: string) => {
    return type === "add_medicine"
      ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700"
      : "bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700";
  };

  const getActivityBadgeColor = (type: string) => {
    return type === "add_medicine"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  if (!authenticated) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Lock className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">
                  غرفة الإدارة
                </h1>
              </div>
              <p className="text-muted-foreground">
                أدخل كلمة السر للوصول إلى سجل الأنشطة
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  كلمة السر
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                  placeholder="أدخل كلمة السر"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                  autoFocus
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader className="w-4 h-4 animate-spin" />}
                {isLoading ? "جاري التحقق..." : "دخول"}
              </button>

              <Link
                to="/"
                className="mt-4 block text-center text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                ← العودة إلى الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              title="العودة"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                غرفة الإدارة
              </h1>
              <p className="text-muted-foreground">
                سجل أنشطة إضافة وحذف الأدوية
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:bg-destructive/90 transition-colors w-full sm:w-auto justify-center"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>

        {/* Activities List */}
        {activities.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-muted/20 rounded-2xl border border-border">
            <p className="text-muted-foreground mb-2">
              لا توجد أنشطة مسجلة بعد
            </p>
            <p className="text-sm text-muted-foreground">
              ستظهر هنا جميع عمليات إضافة وحذف الأدوية
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const activityDate = new Date(activity.timestamp);
              return (
                <div
                  key={activity.id}
                  className={`border rounded-2xl p-4 sm:p-6 transition-all ${getActivityColor(activity.type)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`p-3 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          activity.type === "add_medicine"
                            ? "bg-green-200 text-green-700 dark:bg-green-700 dark:text-green-200"
                            : "bg-red-200 text-red-700 dark:bg-red-700 dark:text-red-200"
                        }`}
                      >
                        {getActivityIcon(activity.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 flex-wrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getActivityBadgeColor(activity.type)}`}
                          >
                            {getActivityLabel(activity.type)}
                          </span>
                          <p className="text-sm text-muted-foreground">
                            {activityDate.toLocaleString("ar-SA", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </p>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 break-words">
                          {activity.medicineName}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          الفئة:{" "}
                          <span className="font-semibold">
                            {activity.categoryName}
                          </span>
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/category/${activity.categoryId}`}
                      className="text-primary hover:text-primary/80 transition-colors font-semibold text-sm whitespace-nowrap"
                    >
                      عرض الفئة →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Statistics */}
        {activities.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-6 rounded-2xl bg-green-50 border border-green-300 dark:bg-green-950 dark:border-green-700">
              <p className="text-sm text-muted-foreground mb-2">
                إجمالي الأدوية المضافة
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {activities.filter((a) => a.type === "add_medicine").length}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-red-50 border border-red-300 dark:bg-red-950 dark:border-red-700">
              <p className="text-sm text-muted-foreground mb-2">
                إجمالي الأدوية المحذوفة
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {activities.filter((a) => a.type === "delete_medicine").length}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-blue-50 border border-blue-300 dark:bg-blue-950 dark:border-blue-700">
              <p className="text-sm text-muted-foreground mb-2">
                إجمالي الأنشطة
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {activities.length}
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
