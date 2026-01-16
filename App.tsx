import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, 
    Search, 
    PlusCircle, 
    ChevronRight, 
    Package, 
    AlertTriangle, 
    CheckCircle,
    Calendar,
    Edit2,
    Trash2,
    Minus,
    Plus,
    LogOut
} from 'lucide-react';
import { EMPLOYEES, InventoryItem } from './types';
import { subscribeToInventory, addItem, updateItem, deleteItem, uploadImageToStorage } from './services/firebase';
import ItemModal from './components/ItemModal';

function App() {
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // Load Data when user changes
    useEffect(() => {
        if (!currentUser) {
            setInventory([]);
            return;
        }

        const unsubscribe = subscribeToInventory(currentUser, (items) => {
            setInventory(items);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Computed Stats
    const stats = useMemo(() => {
        const total = inventory.length;
        const today = new Date();
        const threeMonthsFuture = new Date();
        threeMonthsFuture.setMonth(today.getMonth() + 3);

        const expiringSoon = inventory.filter(item => {
            if (!item.expiry) return false;
            const [m, y] = item.expiry.split('/');
            if (!m || !y) return false;
            const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
            const expiryDate = new Date(year, parseInt(m) - 1);
            return expiryDate <= threeMonthsFuture;
        }).length;

        return { total, expiringSoon };
    }, [inventory]);

    // Filter Items
    const filteredItems = useMemo(() => {
        return inventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventory, searchTerm]);

    // Handlers
    const handleSaveItem = async (data: Omit<InventoryItem, 'id'>, imageSource: string | null) => {
        if (!currentUser) return;

        let finalImage = data.image;

        // If it's a base64 string, upload it to storage
        if (imageSource && imageSource.startsWith('data:')) {
            try {
                finalImage = await uploadImageToStorage(currentUser, imageSource);
            } catch (error) {
                console.error("Upload failed", error);
                // Fallback to null or keep logic
            }
        }

        const payload = { ...data, image: finalImage };

        if (editingItem) {
            await updateItem(currentUser, editingItem.id, payload);
        } else {
            await addItem(currentUser, payload);
        }
    };

    const handleDelete = async (id: string) => {
        if (!currentUser) return;
        if (window.confirm('هل أنت متأكد من حذف هذه المادة؟')) {
            await deleteItem(currentUser, id);
        }
    };

    const handleQuantityChange = async (item: InventoryItem, delta: number) => {
        if (!currentUser) return;
        const newQty = Math.max(0, item.quantity + delta);
        await updateItem(currentUser, item.id, { quantity: newQty });
    };

    const openAddModal = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    // --- RENDER ---

    // 1. Selection Screen
    if (!currentUser) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_#1e293b_0%,_#0f172a_100%)]">
                <div className="text-center mb-10 animate-[fadeInUp_0.6s_ease-out_both]">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-accent-teal to-accent-blue bg-clip-text text-transparent mb-2">
                        صيدلية الغيث
                    </h1>
                    <p className="text-slate-300">نظام إدارة المخزون الرقمي الشامل</p>
                </div>

                <div className="grid grid-cols-1 gap-4 w-full max-w-[350px]">
                    {EMPLOYEES.map((name, idx) => (
                        <button
                            key={name}
                            onClick={() => setCurrentUser(name)}
                            style={{ animationDelay: `${idx * 0.05}s` }}
                            className="group flex items-center gap-4 p-4 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 hover:border-accent-teal hover:-translate-y-1 transition-all duration-300 animate-[fadeInUp_0.5s_ease-out_both]"
                        >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-teal to-accent-blue flex items-center justify-center text-slate-900 shadow-lg group-hover:rotate-12 transition-transform">
                                <Users size={24} />
                            </div>
                            <span className="text-xl font-bold text-green-400 group-hover:text-green-300 transition-colors">{name}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // 2. Dashboard Screen
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#1e293b_0%,_#0f172a_100%)] p-4 sm:p-6 pb-24">
            <div className="max-w-[720px] mx-auto space-y-6">
                
                {/* Header / Nav */}
                <header className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setCurrentUser(null)}
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            >
                                <LogOut size={18} />
                            </button>
                            <div>
                                <h2 className="text-2xl font-black text-white leading-none">{currentUser}</h2>
                                <span className="text-xs text-accent-teal font-semibold">لوحة التحكم الرئيسية</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl flex items-center px-3 h-12">
                            <Search className="text-slate-500 ml-2" size={20} />
                            <input 
                                type="text"
                                placeholder="بحث عن مادة..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent w-full h-full text-white placeholder-slate-500 focus:outline-none"
                            />
                        </div>
                        <button 
                            onClick={openAddModal}
                            className="bg-gradient-to-r from-accent-teal to-accent-blue text-slate-900 px-4 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-teal-500/20 active:scale-95 transition-all"
                        >
                            <PlusCircle size={20} />
                            <span className="hidden sm:inline">إضافة</span>
                        </button>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-glass backdrop-blur-md border border-glass-border rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-xs">إجمالي المواد</span>
                        <div className="flex justify-between items-end mt-2">
                            <span className="text-2xl font-black text-accent-teal">{stats.total}</span>
                            <Package size={16} className="text-slate-600" />
                        </div>
                    </div>
                    <div className="bg-glass backdrop-blur-md border border-glass-border rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-xs">صلاحية قريبة</span>
                        <div className="flex justify-between items-end mt-2">
                            <span className={`text-2xl font-black ${stats.expiringSoon > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                                {stats.expiringSoon}
                            </span>
                            <AlertTriangle size={16} className={stats.expiringSoon > 0 ? 'text-red-400' : 'text-slate-600'} />
                        </div>
                    </div>
                    <div className="bg-glass backdrop-blur-md border border-glass-border rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                        <span className="text-slate-400 text-xs">حالة النظام</span>
                        <div className="flex justify-between items-end mt-2">
                            <span className="text-lg font-bold text-green-400">متصل</span>
                            <CheckCircle size={16} className="text-green-400" />
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <Package size={48} className="mx-auto mb-4 opacity-20" />
                            <p>لا توجد مواد تطابق بحثك</p>
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <div key={item.id} className="bg-glass backdrop-blur-md border border-glass-border rounded-2xl p-3 flex flex-col gap-3 group hover:border-accent-blue/30 transition-all">
                                {/* Image & Title */}
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-slate-900 relative flex-shrink-0">
                                        <img 
                                            src={item.image || `https://picsum.photos/seed/${item.id}/200/200`} 
                                            alt={item.name}
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-100 truncate">{item.name}</h3>
                                            <div className="flex items-center gap-1 text-xs text-accent-teal mt-1">
                                                <Calendar size={12} />
                                                <span dir="ltr">{item.expiry}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-2 bg-slate-900/50 w-fit p-1 rounded-lg border border-white/5">
                                            <button 
                                                onClick={() => handleQuantityChange(item, -1)}
                                                className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                                            <button 
                                                onClick={() => handleQuantityChange(item, 1)}
                                                className="w-7 h-7 rounded-md bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 flex items-center justify-center transition-colors"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions & Notes */}
                                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-md max-w-[50%] truncate">
                                        {item.notes || 'لا توجد ملاحظات'}
                                    </span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => openEditModal(item)}
                                            className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <ItemModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                item={editingItem} 
                onSave={handleSaveItem}
            />

            {/* Mobile Floating Action Button (Alternative to top button for better UX on long lists) */}
            <button 
                onClick={openAddModal}
                className="fixed bottom-6 left-6 w-14 h-14 bg-accent-teal text-slate-900 rounded-full shadow-lg shadow-teal-500/40 flex items-center justify-center z-30 sm:hidden active:scale-90 transition-transform"
            >
                <Plus size={28} />
            </button>
        </div>
    );
}

export default App;