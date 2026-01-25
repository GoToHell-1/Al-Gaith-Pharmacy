import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Pill, Plus, Folder, Trash2 } from "lucide-react";
import { database, ref, set, remove, onValue, off } from "@/lib/firebase";

interface DrugCategory {
  id: string;
  name: string;
  responsiblePerson: string;
  createdAt: string;
  medicineCount?: number;
}

export default function Index() {
  const [categories, setCategories] = useState<DrugCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPerson, setNewCategoryPerson] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [categoryPassword, setCategoryPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  // Load categories from Firebase
  useEffect(() => {
    const categoriesRef = ref(database, "drugCategories");

    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const categoriesList = Object.entries(data).map(
          ([id, category]: any) => ({
            id,
            name: category.name,
            responsiblePerson: category.responsiblePerson || "",
            createdAt: category.createdAt,
            medicineCount: 0,
          }),
        );
        setCategories(
          categoriesList.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      } else {
        setCategories([]);
      }
    });

    return () => off(categoriesRef);
  }, []);

  // Load medicine counts for each category
  useEffect(() => {
    categories.forEach((category) => {
      const medicinesRef = ref(database, `medicines/${category.id}`);

      const unsubscribe = onValue(medicinesRef, (snapshot) => {
        setCategories((prevCategories) =>
          prevCategories.map((cat) =>
            cat.id === category.id
              ? {
                ...cat,
                medicineCount: snapshot.exists() ? Object.keys(snapshot.val()).length : 0,
              }
              : cat,
          ),
        );
      });

      return () => off(medicinesRef);
    });
  }, [categories.length]);

  const handlePasswordSubmit = async () => {
    if (categoryPassword !== "964") {
      alert("كلمة السر غير صحيحة");
      return;
    }

    if (!newCategoryName.trim()) {
      alert("يرجى إدخال اسم الفئة الدوائية");
      return;
    }

    if (!newCategoryPerson.trim()) {
      alert("يرجى إدخال اسم الموظف المسؤول");
      return;
    }

    setIsLoading(true);
    try {
      const categoryId = Date.now().toString();
      const categoryRef = ref(database, `drugCategories/${categoryId}`);
      await set(categoryRef, {
        name: newCategoryName.trim(),
        responsiblePerson: newCategoryPerson.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewCategoryName("");
      setNewCategoryPerson("");
      setCategoryPassword("");
      setShowForm(false);
      setShowPasswordPrompt(false);
    } catch (error) {
      console.error("خطأ في إنشاء الفئة:", error);
      alert("حدث خطأ في إنشاء الفئة");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      alert("يرجى إدخال اسم الفئة الدوائية");
      return;
    }

    if (!newCategoryPerson.trim()) {
      alert("يرجى إدخال اسم الموظف المسؤول");
      return;
    }

    setShowPasswordPrompt(true);
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm("هل تريد حذف هذه الفئة الدوائية؟")) {
      const categoryRef = ref(database, `drugCategories/${id}`);
      remove(categoryRef);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesCategory = category.name
      .toLowerCase()
      .includes(searchCategory.toLowerCase());
    const matchesEmployee = category.responsiblePerson
      .toLowerCase()
      .includes(searchEmployee.toLowerCase());

    return (searchCategory === "" || matchesCategory) &&
      (searchEmployee === "" || matchesEmployee);
  });

  return (
    <MainLayout>
      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              أدخل كلمة السر
            </h2>
            <p className="text-muted-foreground mb-6">
              يرجى إدخال كلمة السر لإنشاء فئة دوائية جديدة
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-2">
                كلمة السر
              </label>
              <input
                type="password"
                value={categoryPassword}
                onChange={(e) => setCategoryPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handlePasswordSubmit();
                }}
                placeholder="أدخل كلمة السر"
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                autoFocus
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handlePasswordSubmit}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? "جاري التحقق..." : "تأكيد"}
              </button>
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setCategoryPassword("");
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Pill className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
              فئات الأدوية
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            إدارة الأدوية حسب الفئات الدوائية
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                ابحث عن فئة دوائية
              </label>
              <input
                type="text"
                placeholder="أدخل اسم الفئة"
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                ابحث عن موظف مسؤول
              </label>
              <input
                type="text"
                placeholder="أدخل اسم الموظف"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Create Category Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold shadow-blue-glow hover:shadow-blue-glow-lg hover:scale-105 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            إنشاء فئة دوائية جديدة
          </button>
        </div>

        {/* Create Category Form */}
        {showForm && (
          <div className="max-w-md mx-auto mb-8 p-6 bg-white dark:bg-slate-800 border border-primary/20 rounded-2xl shadow-blue-glow animate-in fade-in zoom-in duration-300">
            <h2 className="text-xl font-bold text-primary glow-blue mb-4">
              إنشاء فئة دوائية جديدة
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">
                اسم الفئة الدوائية *
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600 shadow-sm"
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleCreateCategory();
                }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">
                اسم الموظف المسؤول *
              </label>
              <input
                type="text"
                value={newCategoryPerson}
                onChange={(e) => setNewCategoryPerson(e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600 shadow-sm"
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleCreateCategory();
                }}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCreateCategory}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold shadow-blue-glow hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isLoading ? "جاري الإنشاء..." : "إنشاء"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setNewCategoryName("");
                  setNewCategoryPerson("");
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-muted/20 rounded-2xl border border-primary/10 max-w-2xl mx-auto backdrop-blur-sm">
            <Folder className="w-12 h-12 sm:w-16 sm:h-16 text-primary/50 mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
              {categories.length === 0 ? "لا توجد فئات دوائية حتى الآن" : "لا توجد نتائج بحث"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {categories.length === 0 ? "انقر على زر \"إنشاء فئة دوائية جديدة\" لبدء إضافة الأدوية" : "جرب تغيير معايير البحث"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-primary/10 dark:border-primary/20 shadow-sm hover:shadow-blue-glow hover:border-primary/50 transition-all duration-300"
              >
                <Link
                  to={`/category/${category.id}`}
                  className="block p-6 sm:p-8 text-center h-full flex flex-col items-center justify-center gap-4"
                >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Folder Icon */}
                  <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-blue-glow group-hover:shadow-blue-glow-lg transition-all duration-300">
                    <Folder className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
                  </div>

                  {/* Category Name */}
                  <h2 className="relative z-10 text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {category.name}
                  </h2>

                  {/* Responsible Person */}
                  <p className="relative z-10 text-sm text-muted-foreground">
                    {category.responsiblePerson}
                  </p>

                  {/* Arrow */}
                  <div className="relative z-10 text-primary text-2xl transform group-hover:translate-x-1 transition-transform duration-300">
                    ←
                  </div>
                </Link>

                {/* Medicine Count Badge */}
                <div className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-blue-glow">
                  {category.medicineCount || 0}
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteCategory(category.id);
                  }}
                  className="absolute top-2 right-2 z-20 p-2 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="حذف الفئة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        {filteredCategories.length > 0 && (
          <div className="mt-16 sm:mt-20 p-6 sm:p-8 rounded-2xl bg-secondary/40 border border-primary/20 max-w-2xl mx-auto">
            <p className="text-center text-sm sm:text-base text-foreground">
              <span className="font-semibold">اضغط على أي فئة</span> لإضافة أو
              تعديل الأدوية فيها
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
