import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  Plus,
  Trash2,
  Edit2,
  Camera,
  AlertCircle,
  Package,
  ArrowLeft,
} from "lucide-react";
import { database, ref, set, remove, onValue, off } from "@/lib/firebase";

interface Medicine {
  id: string;
  name: string;
  quantity?: number;
  expiryDate?: string;
  notes?: string;
  image?: string;
  drugCategory?: string;
  productionDate?: string;
}

interface Category {
  id: string;
  name: string;
  responsiblePerson: string;
  createdAt: string;
}

export default function CategoryDetails() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [formData, setFormData] = useState<Partial<Medicine>>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchMedicine, setSearchMedicine] = useState("");
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editCategoryData, setEditCategoryData] = useState({ name: "", responsiblePerson: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load category details
  useEffect(() => {
    if (!categoryId) return;

    const categoryRef = ref(database, `drugCategories/${categoryId}`);
    const unsubscribe = onValue(categoryRef, (snapshot) => {
      if (snapshot.exists()) {
        setCategory({
          id: categoryId,
          ...snapshot.val(),
        });
      }
    });

    return () => off(categoryRef);
  }, [categoryId]);

  // Load medicines from this category
  useEffect(() => {
    if (!categoryId) return;

    const medicinesRef = ref(database, `medicines/${categoryId}`);
    const unsubscribe = onValue(medicinesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const medicinesList = Object.entries(data).map(
          ([id, medicine]: any) => ({
            id,
            ...medicine,
          }),
        );
        // Sort by expiration date (closest first)
        medicinesList.sort(
          (a, b) =>
            new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
        );
        setMedicines(medicinesList);
      } else {
        setMedicines([]);
      }
    });

    return () => off(medicinesRef);
  }, [categoryId]);

  const handleAddMedicine = async () => {
    if (!formData.name?.trim()) {
      alert("يرجى إدخال اسم الدواء على الأقل");
      return;
    }

    if (!categoryId) return;

    const medicineData = {
      name: formData.name.trim(),
      quantity: formData.quantity || 0,
      expiryDate: formData.expiryDate || "",
      productionDate: formData.productionDate || "",
      notes: formData.notes || "",
      image: formData.image,
      drugCategory: formData.drugCategory || "",
    };

    if (isEditing) {
      // Update existing medicine
      const medicineRef = ref(database, `medicines/${categoryId}/${isEditing}`);
      await set(medicineRef, medicineData);
      setIsEditing(null);
    } else {
      // Add new medicine
      const medicineId = Date.now().toString();
      const medicineRef = ref(
        database,
        `medicines/${categoryId}/${medicineId}`,
      );
      await set(medicineRef, medicineData);

      // Log the activity
      const activityId = Date.now().toString();
      const activityRef = ref(database, `activities/${activityId}`);
      await set(activityRef, {
        type: "add_medicine",
        medicineName: formData.name,
        categoryId: categoryId,
        categoryName: category?.name,
        timestamp: new Date().toISOString(),
        timestamp_ms: Date.now(),
      });
    }

    setFormData({});
    setShowForm(false);
  };

  const handleEditMedicine = (medicine: Medicine) => {
    setFormData(medicine);
    setIsEditing(medicine.id);
    setShowForm(true);
  };

  const handleEditCategory = async () => {
    if (!editCategoryData.name.trim() || !editCategoryData.responsiblePerson.trim()) {
      alert("يرجى ملء جميع الحقول");
      return;
    }

    if (!categoryId) return;

    const categoryRef = ref(database, `drugCategories/${categoryId}`);
    await set(categoryRef, {
      name: editCategoryData.name.trim(),
      responsiblePerson: editCategoryData.responsiblePerson.trim(),
      createdAt: category?.createdAt,
    });

    setCategory({
      id: categoryId,
      name: editCategoryData.name.trim(),
      responsiblePerson: editCategoryData.responsiblePerson.trim(),
      createdAt: category?.createdAt || "",
    });

    setIsEditingCategory(false);
  };

  const filteredMedicines = medicines.filter((medicine) =>
    medicine.name.toLowerCase().includes(searchMedicine.toLowerCase()),
  );

  const handleDeleteMedicine = (id: string) => {
    const medicine = medicines.find((m) => m.id === id);
    const confirmMessage = `تأكيد: هل تريد حذف "${medicine?.name}"؟\n\nسيتم تسجيل هذه العملية في غرفة الإدارة.`;

    if (window.confirm(confirmMessage)) {
      if (!categoryId) return;

      const medicineRef = ref(database, `medicines/${categoryId}/${id}`);
      remove(medicineRef);

      // Log the activity
      const activityId = Date.now().toString();
      const activityRef = ref(database, `activities/${activityId}`);
      set(activityRef, {
        type: "delete_medicine",
        medicineName: medicine?.name,
        categoryId: categoryId,
        categoryName: category?.name,
        timestamp: new Date().toISOString(),
        timestamp_ms: Date.now(),
      });
    }
  };

  const detectDocumentEdges = (imageData: ImageData): number[] | null => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert to grayscale
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Apply Sobel edge detection
    const edges = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx =
          -gray[(y - 1) * width + (x - 1)] +
          gray[(y - 1) * width + (x + 1)] -
          2 * gray[y * width + (x - 1)] +
          2 * gray[y * width + (x + 1)] -
          gray[(y + 1) * width + (x - 1)] +
          gray[(y + 1) * width + (x + 1)];

        const gy =
          -gray[(y - 1) * width + (x - 1)] -
          2 * gray[(y - 1) * width + x] -
          gray[(y - 1) * width + (x + 1)] +
          gray[(y + 1) * width + (x - 1)] +
          2 * gray[(y + 1) * width + x] +
          gray[(y + 1) * width + (x + 1)];

        edges[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // Find contours - simple approach: find bounding box of edges
    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0;
    let edgeCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (edges[idx] > 50) {
          edgeCount++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // If we found edges, return the bounding box
    if (edgeCount > width * height * 0.01) {
      // At least 1% of pixels should be edges
      const padding = 20;
      return [
        Math.max(0, minX - padding),
        Math.max(0, minY - padding),
        Math.min(width, maxX + padding),
        Math.min(height, maxY + padding),
      ];
    }

    return null;
  };

  const cropImageToDocument = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const bounds = detectDocumentEdges(imageData);

        if (bounds) {
          const [x1, y1, x2, y2] = bounds;
          const cropWidth = x2 - x1;
          const cropHeight = y2 - y1;

          const croppedCanvas = document.createElement("canvas");
          croppedCanvas.width = cropWidth;
          croppedCanvas.height = cropHeight;

          const croppedCtx = croppedCanvas.getContext("2d");
          if (croppedCtx) {
            croppedCtx.drawImage(img, x1, y1, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            resolve(croppedCanvas.toDataURL("image/jpeg"));
          } else {
            resolve(dataUrl);
          }
        } else {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    });
  };

  const handleSmartCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.play();

      setTimeout(async () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL("image/jpeg");
          const croppedImage = await cropImageToDocument(imageData);
          setFormData({ ...formData, image: croppedImage });
        }
        stream.getTracks().forEach((track) => track.stop());
      }, 1000);
    } catch (error) {
      alert("لم يتمكن من الوصول إلى الكاميرا");
      console.error(error);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.play();

      setTimeout(() => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL("image/jpeg");
          setFormData({ ...formData, image: imageData });
        }
        stream.getTracks().forEach((track) => track.stop());
      }, 1000);
    } catch (error) {
      alert("لم يتمكن من الوصول إلى الكاميرا");
      console.error(error);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, image: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  if (!category) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Edit Category Modal */}
        {isEditingCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                تعديل الفئة الدوائية
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    اسم الفئة
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.name}
                    onChange={(e) =>
                      setEditCategoryData({
                        ...editCategoryData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    اسم الموظف المسؤول
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.responsiblePerson}
                    onChange={(e) =>
                      setEditCategoryData({
                        ...editCategoryData,
                        responsiblePerson: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleEditCategory}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  حفظ
                </button>
                <button
                  onClick={() => setIsEditingCategory(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 flex-1">
            <Link
              to="/"
              className="p-2 hover:bg-primary/10 rounded-lg transition-all text-muted-foreground hover:text-primary flex-shrink-0"
              title="العودة"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground glow-blue">
                  {category.name}
                </h1>
                <button
                  onClick={() => {
                    setEditCategoryData({
                      name: category.name,
                      responsiblePerson: category.responsiblePerson,
                    });
                    setIsEditingCategory(true);
                  }}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-all text-muted-foreground hover:text-primary flex-shrink-0"
                  title="تعديل الفئة"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground">
                المسؤول:{" "}
                <span className="font-semibold text-primary">
                  {category.responsiblePerson}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setFormData({});
              setIsEditing(null);
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-primary-foreground rounded-lg font-bold shadow-blue-glow hover:shadow-blue-glow-lg hover:scale-105 transition-all w-full sm:w-auto justify-center flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            إضافة دواء
          </button>
        </div>

        {/* Form Section */}
        {showForm && (
          <div className="mb-8 p-6 sm:p-8 bg-white dark:bg-slate-800 border border-border rounded-2xl shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-foreground">
              {isEditing ? "تعديل الدواء" : "إضافة دواء جديد"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  اسم الدواء *
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="أدخل اسم الدواء"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  الكمية
                </label>
                <input
                  type="number"
                  value={formData.quantity || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="أدخل الكمية"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                />
              </div>

              {/* Production Date */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  تاريخ الإنتاج
                </label>
                <input
                  type="text"
                  value={formData.productionDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, productionDate: e.target.value })
                  }
                  placeholder="YYYY-MM-DD (مثال: 2024-01-15)"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  تاريخ الانتهاء
                </label>
                <input
                  type="text"
                  value={formData.expiryDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDate: e.target.value })
                  }
                  placeholder="YYYY-MM-DD (مثال: 2024-12-25)"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="أضف ملاحظات إضافية"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                />
              </div>

              {/* Drug Category */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  فئة الدواء
                </label>
                <input
                  type="text"
                  value={formData.drugCategory || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, drugCategory: e.target.value })
                  }
                  placeholder="مثال: مسكنات الألم، مضادات حيوية"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                />
              </div>
            </div>

            {/* Camera & Image Section */}
            <div className="mt-6 flex flex-col gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">مسح ضوئي ذكي للباكيت:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleSmartCameraCapture}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex-1"
                  >
                    <Camera className="w-5 h-5" />
                    مسح ضوئي ذكي
                  </button>
                  <button
                    onClick={handleCameraCapture}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors flex-1"
                  >
                    <Camera className="w-5 h-5" />
                    التقط يدويا
                  </button>
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-5 h-5" />
                اختر صورة من الملفات
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Image Preview */}
            {formData.image && (
              <div className="mt-6">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="max-w-xs h-auto rounded-lg border border-border"
                />
              </div>
            )}

            {/* Form Actions */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleAddMedicine}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                {isEditing ? "تحديث الدواء" : "إضافة الدواء"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                  setIsEditing(null);
                }}
                className="flex-1 px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Search Medicines */}
        {medicines.length > 0 && (
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground mb-2">
              ابحث عن دواء
            </label>
            <input
              type="text"
              placeholder="أدخل اسم الدواء"
              value={searchMedicine}
              onChange={(e) => setSearchMedicine(e.target.value)}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        )}

        {/* Medicines List */}
        {filteredMedicines.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-muted/20 rounded-2xl border border-primary/10 backdrop-blur-sm">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-primary/40 mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
              {medicines.length === 0 ? "لا توجد أدوية مضافة حتى الآن" : "لا توجد نتائج بحث"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {medicines.length === 0 ? "انقر على زر \"إضافة دواء\" لبدء الجرد" : "جرب تغيير معايير البحث"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredMedicines.map((medicine) => (
              <div
                key={medicine.id}
                className="bg-white dark:bg-slate-800 border border-primary/10 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-blue-glow hover:border-primary/40 transition-all duration-300"
              >
                {/* Image */}
                {medicine.image && (
                  <img
                    src={medicine.image}
                    alt={medicine.name}
                    className="w-full h-48 object-cover rounded-xl mb-4 border border-primary/10 shadow-sm"
                  />
                )}

                {/* Expiry Status */}
                {isExpired(medicine.expiryDate) && (
                  <div className="mb-3 p-2 sm:p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="text-sm text-destructive font-semibold">
                      منتهي الصلاحية
                    </span>
                  </div>
                )}
                {isExpiringSoon(medicine.expiryDate) &&
                  !isExpired(medicine.expiryDate) && (
                    <div className="mb-3 p-2 sm:p-3 bg-accent/10 border border-accent/30 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-accent" />
                      <span className="text-sm text-accent font-semibold">
                        سينتهي قريبا
                      </span>
                    </div>
                  )}

                {/* Content */}
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                  {medicine.name}
                </h3>

                <div className="space-y-2 mb-4 text-sm sm:text-base">
                  {medicine.quantity !== undefined && medicine.quantity > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الكمية:</span>
                      <span className="font-semibold text-foreground">
                        {medicine.quantity}
                      </span>
                    </div>
                  )}
                  {medicine.productionDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ الإنتاج:</span>
                      <span className="font-semibold text-foreground">
                        {new Date(medicine.productionDate).toLocaleDateString(
                          "ar-SA",
                        )}
                      </span>
                    </div>
                  )}
                  {medicine.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الانتهاء:</span>
                      <span className="font-semibold text-foreground">
                        {new Date(medicine.expiryDate).toLocaleDateString(
                          "ar-SA",
                        )}
                      </span>
                    </div>
                  )}
                  {medicine.drugCategory && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">فئة الدواء:</span>
                      <span className="font-semibold text-foreground">
                        {medicine.drugCategory}
                      </span>
                    </div>
                  )}
                  {medicine.notes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ملاحظات:</span>
                      <span className="font-semibold text-foreground">
                        {medicine.notes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditMedicine(medicine)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm sm:text-base"
                  >
                    <Edit2 className="w-4 h-4" />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteMedicine(medicine.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/5 transition-colors text-sm sm:text-base"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
