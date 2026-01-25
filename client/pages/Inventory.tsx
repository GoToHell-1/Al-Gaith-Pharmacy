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
  quantity: number;
  expiryDate: string;
  notes: string;
  image?: string;
}

export default function Inventory() {
  const { employee } = useParams<{ employee: string }>();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [formData, setFormData] = useState<Partial<Medicine>>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const employeeName =
    employee?.charAt(0).toUpperCase() + employee?.slice(1).toLowerCase();

  // Load medicines from Firebase on mount
  useEffect(() => {
    if (!employee) return;

    const medicinesRef = ref(database, `medicines/${employee}`);

    const unsubscribe = onValue(medicinesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const medicinesList = Object.entries(data).map(([id, medicine]: any) => ({
          id,
          ...medicine,
        }));
        setMedicines(medicinesList as Medicine[]);
      } else {
        setMedicines([]);
      }
    });

    return () => off(medicinesRef);
  }, [employee]);

  const handleAddMedicine = () => {
    if (!formData.name || !formData.quantity || !formData.expiryDate) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (!employee) return;

    const medicineData = {
      name: formData.name || "",
      quantity: formData.quantity || 0,
      expiryDate: formData.expiryDate || "",
      notes: formData.notes || "",
      image: formData.image,
    };

    if (isEditing) {
      // Update existing medicine in Firebase
      const medicineRef = ref(database, `medicines/${employee}/${isEditing}`);
      set(medicineRef, medicineData);
      setIsEditing(null);
    } else {
      // Add new medicine to Firebase
      const medicineId = Date.now().toString();
      const medicineRef = ref(database, `medicines/${employee}/${medicineId}`);
      set(medicineRef, medicineData);
    }

    setFormData({});
    setShowForm(false);
  };

  const handleEditMedicine = (medicine: Medicine) => {
    setFormData(medicine);
    setIsEditing(medicine.id);
    setShowForm(true);
  };

  const handleDeleteMedicine = (id: string) => {
    if (window.confirm("هل تريد حذف هذا الدواء؟")) {
      if (!employee) return;

      const medicineRef = ref(database, `medicines/${employee}/${id}`);
      remove(medicineRef);
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

  const isExpiringSoon = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              title="العودة للموظفين"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                جرد {employeeName}
              </h1>
              <p className="text-muted-foreground">إدارة الأدوية والمخزون</p>
            </div>
          </div>

          <button
            onClick={() => {
              setFormData({});
              setIsEditing(null);
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center"
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
                  العدد *
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
                  placeholder="أدخل العدد"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  تاريخ الانتهاء *
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
            </div>

            {/* Camera & Image Section */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleCameraCapture}
                className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors flex-1"
              >
                <Camera className="w-5 h-5" />
                التقط صورة
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors flex-1"
              >
                <Plus className="w-5 h-5" />
                اختر صورة
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

        {/* Medicines List */}
        {medicines.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-muted/20 rounded-2xl border border-border">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
              لا توجد أدوية مضافة حتى الآن
            </h3>
            <p className="text-muted-foreground mb-6">
              انقر على زر "إضافة دواء" لبدء الجرد
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {medicines.map((medicine) => (
              <div
                key={medicine.id}
                className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image */}
                {medicine.image && (
                  <img
                    src={medicine.image}
                    alt={medicine.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
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
                {isExpiringSoon(medicine.expiryDate) && !isExpired(medicine.expiryDate) && (
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العدد:</span>
                    <span className="font-semibold text-foreground">
                      {medicine.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الانتهاء:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(medicine.expiryDate).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
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
