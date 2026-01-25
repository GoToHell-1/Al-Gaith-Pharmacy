import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  Bell,
  AlertCircle,
  Trash2,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { database, ref, onValue, off } from "@/lib/firebase";

interface Medicine {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string;
  notes: string;
  drugCategory?: string;
  image?: string;
  categoryId: string;
  categoryName: string;
  responsiblePerson: string;
}

export default function Notifications() {
  const [expiringSoon, setExpiringSoon] = useState<Medicine[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const categoriesRef = ref(database, "drugCategories");
    const medicinesData: Medicine[] = [];
    let categoriesLoaded = 0;
    let totalCategories = 0;

    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const categories = snapshot.val();
        totalCategories = Object.keys(categories).length;
        categoriesLoaded = 0;

        Object.entries(categories).forEach(([categoryId, category]: any) => {
          const medicinesRef = ref(database, `medicines/${categoryId}`);

          const unsubscribeMedicines = onValue(medicinesRef, (medSnapshot) => {
            categoriesLoaded++;

            // Clear previous data for this category
            const filtered = medicinesData.filter(
              (m) => m.categoryId !== categoryId,
            );

            if (medSnapshot.exists()) {
              const medicines = medSnapshot.val();
              const today = new Date();

              Object.entries(medicines).forEach(
                ([medicineId, medicine]: any) => {
                  const expiryDate = new Date(medicine.expiryDate);
                  const daysUntilExpiry = Math.floor(
                    (expiryDate.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );

                  // Include medicines expiring within 30 days (and not expired)
                  if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
                    filtered.push({
                      id: medicineId,
                      name: medicine.name,
                      quantity: medicine.quantity,
                      expiryDate: medicine.expiryDate,
                      notes: medicine.notes,
                      drugCategory: medicine.drugCategory,
                      image: medicine.image,
                      categoryId,
                      categoryName: category.name,
                      responsiblePerson: category.responsiblePerson,
                    });
                  }
                },
              );
            }

            medicinesData.splice(0, medicinesData.length, ...filtered);

            // Sort by expiration date (closest first)
            const sorted = [...filtered].sort(
              (a, b) =>
                new Date(a.expiryDate).getTime() -
                new Date(b.expiryDate).getTime(),
            );

            setExpiringSoon(sorted);

            return () => off(medicinesRef);
          });
        });
      } else {
        setExpiringSoon([]);
      }
    });

    return () => off(categoriesRef);
  }, []);

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const getExpiryStatus = (daysLeft: number) => {
    if (daysLeft <= 0) return "منتهي الصلاحية";
    if (daysLeft === 1) return "ينتهي غدا";
    if (daysLeft <= 7) return `ينتهي في ${daysLeft} أيام`;
    return `ينتهي في ${daysLeft} يوم`;
  };

  const getStatusColor = (daysLeft: number) => {
    if (daysLeft <= 0) return "bg-destructive/10 border-destructive/30";
    if (daysLeft <= 3) return "bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700";
    if (daysLeft <= 7) return "bg-orange-50 border-orange-300 dark:bg-orange-950 dark:border-orange-700";
    return "bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-700";
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/"
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title="العودة"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              الإشعارات اليومية
            </h1>
          </div>
        </div>

        <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
          قائمة الأدوية التي ستنتهي صلاحيتها خلال الـ 30 يوم القادمة
        </p>

        {/* Notifications List */}
        {expiringSoon.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-muted/20 rounded-2xl border border-border max-w-2xl">
            <Bell className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
              لا توجد تنبيهات
            </h3>
            <p className="text-muted-foreground mb-6">
              جميع الأدوية آمنة، لا توجد أدوية ستنتهي صلاحيتها قريبا
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {expiringSoon.map((medicine) => {
              const daysLeft = getDaysUntilExpiry(medicine.expiryDate);
              return (
                <div
                  key={`${medicine.categoryId}-${medicine.id}`}
                  className={`border rounded-2xl p-4 sm:p-6 transition-all ${getStatusColor(daysLeft)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-accent mt-0.5" />
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-foreground">
                            {medicine.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            الفئة: {medicine.categoryName}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            الكمية
                          </p>
                          <p className="font-semibold text-foreground">
                            {medicine.quantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            تاريخ الانتهاء
                          </p>
                          <p className="font-semibold text-foreground">
                            {new Date(medicine.expiryDate).toLocaleDateString(
                              "ar-SA",
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            الموظف المسؤول
                          </p>
                          <p className="font-semibold text-foreground">
                            {medicine.responsiblePerson}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            الحالة
                          </p>
                          <p className="font-semibold text-accent flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {getExpiryStatus(daysLeft)}
                          </p>
                        </div>
                      </div>

                      {medicine.drugCategory && (
                        <p className="text-sm text-muted-foreground mb-2">
                          فئة الدواء: <span className="font-semibold text-foreground">{medicine.drugCategory}</span>
                        </p>
                      )}

                      {medicine.notes && (
                        <p className="text-sm text-muted-foreground mb-2">
                          ملاحظات: <span className="font-semibold text-foreground">{medicine.notes}</span>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setExpanded(
                          expanded ===
                            `${medicine.categoryId}-${medicine.id}`
                            ? null
                            : `${medicine.categoryId}-${medicine.id}`,
                        )
                      }
                      className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
                    >
                      {expanded ===
                      `${medicine.categoryId}-${medicine.id}`
                        ? "إغلاق"
                        : "تفاصيل"}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expanded === `${medicine.categoryId}-${medicine.id}` && (
                    <div className="mt-4 pt-4 border-t border-current/20">
                      {medicine.image && (
                        <img
                          src={medicine.image}
                          alt={medicine.name}
                          className="w-full sm:w-48 h-auto rounded-lg mb-4"
                        />
                      )}
                      <Link
                        to={`/category/${medicine.categoryId}`}
                        className="inline-block text-primary hover:text-primary/80 font-semibold transition-colors"
                      >
                        → الذهاب إلى الفئة
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {expiringSoon.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-muted-foreground mb-2">ستنتهي خلال 3 أيام</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {expiringSoon.filter(
                  (m) => getDaysUntilExpiry(m.expiryDate) <= 3,
                ).length}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/30">
              <p className="text-sm text-muted-foreground mb-2">ستنتهي خلال أسبوع</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {expiringSoon.filter(
                  (m) =>
                    getDaysUntilExpiry(m.expiryDate) <= 7 &&
                    getDaysUntilExpiry(m.expiryDate) > 3,
                ).length}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-muted-foreground mb-2">ستنتهي خلال 30 يوم</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {expiringSoon.filter(
                  (m) =>
                    getDaysUntilExpiry(m.expiryDate) <= 30 &&
                    getDaysUntilExpiry(m.expiryDate) > 7,
                ).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
