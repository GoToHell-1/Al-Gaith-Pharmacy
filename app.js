import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as sRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAfxmjn2bt2KcOdiuGQcvhNFxknDey3SwE",
    authDomain: "pharmacy-e9599.firebaseapp.com",
    databaseURL: "https://pharmacy-e9599-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pharmacy-e9599",
    storageBucket: "pharmacy-e9599.firebasestorage.app",
    messagingSenderId: "67459379712",
    appId: "1:67459379712:web:ba1c59f53f9ff6db995ee5",
    measurementId: "G-QQZ9NL28V4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

const employees = ['ايهاب', 'بسام', 'ضحى', 'حوراء', 'سارة', 'معاذ', 'محمود', 'نزار'];
let currentUser = null;
let inventory = [];
let cameraStream = null;

// DOM Elements
const selectionScreen = document.getElementById('selection-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const employeeGrid = document.getElementById('employee-grid');
const itemsGrid = document.getElementById('items-grid');
const currentUserName = document.getElementById('current-user-name');
const searchInput = document.getElementById('search-input');
const backBtn = document.getElementById('back-btn');
const addItemBtn = document.getElementById('add-item-btn');
const modal = document.getElementById('modal');
const itemForm = document.getElementById('item-form');
const closeModals = document.querySelectorAll('.close-modal');
const imageInput = document.getElementById('item-image');
const imagePreviewContainer = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const totalItemsEl = document.getElementById('total-items');
const expiringSoonEl = document.getElementById('expiring-soon');
const recentActivities = document.getElementById('recent-activities');

// Camera Elements
const cameraOverlay = document.getElementById('camera-overlay');
const video = document.getElementById('video');
const startCameraBtn = document.getElementById('start-camera');
const captureBtn = document.getElementById('capture-btn');
const closeCameraBtn = document.getElementById('close-camera');

// --- Initialization ---

function init() {
    renderEmployees();
    setupEventListeners();
}

function renderEmployees() {
    // Render the initial selection list (kept simple)
    employeeGrid.innerHTML = employees.map(name => `
        <div class="employee-card" onclick="selectUser('${name}')">
            <div class="avatar-wrapper">
                <i class="fas fa-user-md"></i>
            </div>
            <h3>${name}</h3>
        </div>
    `).join('');
}

// --- Navigation ---

function selectUser(name) {
    currentUser = name;
    currentUserName.textContent = name;

    loadUserData();

    selectionScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
}

function goBack() {
    currentUser = null;
    dashboardScreen.classList.remove('active');
    selectionScreen.classList.add('active');
}

// --- Data Management ---

function loadUserData() {
    if (!currentUser) return;
    const userRef = ref(db, `inventory/${currentUser}`);
    onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            inventory = Object.keys(data).map(key => ( {
                id: key,
                ...data[key]
            }));
        } else {
            inventory = [];
        }
        renderInventory(searchInput.value);
    });
}

function updateStats() {
    totalItemsEl.textContent = inventory.reduce((sum, it) => sum + (parseInt(it.quantity) || 0), 0);

    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    const expiringSoonCount = inventory.filter(item => {
        const itemDate = parseExpiry(item.expiry);
        return itemDate && itemDate <= threeMonthsFromNow;
    }).length;

    expiringSoonEl.textContent = expiringSoonCount;
}

function parseExpiry(expiryStr) {
    if (!expiryStr) return null;
    // Accept MM/YYYY or MM/YY
    const parts = expiryStr.split('/');
    if (parts.length !== 2) return null;
    const [month, year] = parts;
    const fullYear = year.length === 2 ? "20" + year : year;
    const m = parseInt(month);
    const y = parseInt(fullYear);
    if (isNaN(m) || isNaN(y)) return null;
    return new Date(y, m - 1, 1);
}

// --- Camera Functions ---

async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        video.srcObject = cameraStream;
        cameraOverlay.classList.add('active');
    } catch (err) {
        alert('تعذر الوصول إلى الكاميرا: ' + err.message);
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraOverlay.classList.remove('active');
}

function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Luxury Flash Effect
    video.style.opacity = '0';
    setTimeout(() => {
        previewImg.src = canvas.toDataURL('image/jpeg', 0.8);
        previewImg.style.display = 'block';
        stopCamera();
        video.style.opacity = '1';
    }, 200);
}

// --- UI Rendering ---

function renderInventory(searchTerm = '') {
    const filtered = inventory.filter(item =>
        item.name.toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    itemsGrid.innerHTML = filtered.map(item => {
        const expiryDate = parseExpiry(item.expiry);
        const isExpired = expiryDate ? (expiryDate < new Date()) : false;
        const isExpiringSoon = expiryDate ? checkExpiry(expiryDate) : false;
        let statusLabel = 'In Stock';
        let statusClass = 'status-ok';
        if (isExpired) {
            statusLabel = 'منتهي الصلاحية';
            statusClass = 'status-expired';
        } else if (isExpiringSoon) {
            statusLabel = 'قاربة على الانتهاء';
            statusClass = 'status-warning';
        } else if ((parseInt(item.quantity) || 0) <= 5) {
            statusLabel = 'Low Stock';
            statusClass = 'status-low';
        }

        return `
            <div class="item-card">
                <div class="row">
                    <div class="left">
                        <div class="item-image-container">
                            <img src="${item.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${item.name}">
                        </div>
                    </div>
                    <div class="center">
                        <h3 class="item-title">${item.name}</h3>
                        <div class="item-sub">SKU: ${item.sku || item.id || '—'}</div>
                        <div class="controls">
                            <button class="qty-btn" onclick="updateQty('${item.id}', -1)"><i class="fas fa-minus"></i></button>
                            <div class="qty-val">${item.quantity}</div>
                            <button class="qty-btn" onclick="updateQty('${item.id}', 1)"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    <div class="right">
                        <div class="expiry">Expiry: ${item.expiry || 'N/A'}</div>
                        <div class="status ${statusClass}">${statusLabel}</div>
                        <div class="tools">
                            <button class="tool-btn edit" onclick="editItem('${item.id}')"><i class="fas fa-pen"></i></button>
                            <button class="tool-btn delete" onclick="deleteItem('${item.id}')"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (filtered.length === 0) {
        itemsGrid.innerHTML = `<div class="empty-state">لا توجد مواد تطابق بحثك</div>`;
    }

    updateStats();
    renderRecentActivities();
}

function checkExpiry(expiryDate) {
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30);
    return diffMonths < 3;
}

function renderRecentActivities() {
    // For demo, show the latest inventory items as activities
    if (!recentActivities) return;
    const latest = inventory.slice().reverse().slice(0, 6);
    recentActivities.innerHTML = latest.map(it => `
        <div class="activity-row">
            <div class="act-avatar"><i class="fas fa-box"></i></div>
            <div class="act-body">
                <div class="act-text">تمت إضافة ${it.quantity} وحدة من '${it.name}'</div>
                <div class="act-time">الآن</div>
            </div>
        </div>
    `).join('');
}

// --- CRUD Operations ---

async function updateQty(id, delta) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        const newQty = Math.max(0, parseInt(item.quantity || 0) + delta);
        const itemRef = ref(db, `inventory/${currentUser}/${id}`);
        await update(itemRef, { quantity: newQty });
    }
}

async function deleteItem(id) {
    if (confirm('هل أنت متأكد من حذف هذه المادة تماماً؟')) {
        const itemRef = ref(db, `inventory/${currentUser}/${id}`);
        await remove(itemRef);
    }
}

function editItem(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    document.getElementById('modal-title').textContent = 'تعديل بيانات المادة';
    document.getElementById('edit-id').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-quantity').value = item.quantity;
    document.getElementById('item-expiry').value = item.expiry;
    document.getElementById('item-notes').value = item.notes || '';

    if (item.image) {
        previewImg.src = item.image;
        previewImg.style.display = 'block';
    } else {
        previewImg.style.display = 'none';
        previewImg.src = '';
    }

    modal.classList.add('active');
}

// --- Event Listeners ---

function setupEventListeners() {
    backBtn.addEventListener('click', goBack);

    addItemBtn.addEventListener('click', () => {
        itemForm.reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('modal-title').textContent = 'إضافة مادة للمخزن';
        previewImg.style.display = 'none';
        previewImg.src = '';
        modal.classList.add('active');
    });

    closeModals.forEach(btn => {
        btn.addEventListener('click', () => modal.classList.remove('active'));
    });

    startCameraBtn.addEventListener('click', startCamera);
    closeCameraBtn.addEventListener('click', stopCamera);
    captureBtn.addEventListener('click', capturePhoto);

    imagePreviewContainer.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const saveBtn = itemForm.querySelector('.btn-save');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'جاري المعالجة...';

        try {
            const id = document.getElementById('edit-id').value;
            const name = document.getElementById('item-name').value;
            const quantity = parseInt(document.getElementById('item-quantity').value || 0);
            const expiry = document.getElementById('item-expiry').value;
            const notes = document.getElementById('item-notes').value;
            let imageUrl = null;

            if (previewImg.src && previewImg.src.startsWith('data:')) {
                const storageRef = sRef(storage, `images/${currentUser}/${Date.now()}.jpg`);
                await uploadString(storageRef, previewImg.src, 'data_url');
                imageUrl = await getDownloadURL(storageRef);
            } else if (previewImg.src && !previewImg.src.includes('via.placeholder')) {
                imageUrl = previewImg.src;
            }

            const itemData = { name, quantity, expiry, notes, image: imageUrl };

            if (id) {
                await update(ref(db, `inventory/${currentUser}/${id}`), itemData);
            } else {
                await push(ref(db, `inventory/${currentUser}`), itemData);
            }

            modal.classList.remove('active');
        } catch (error) {
            console.error(error);
            alert('خطأ في الاتصال بقاعدة البيانات');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    });

    searchInput.addEventListener('input', (e) => {
        renderInventory(e.target.value);
    });
}

// Global scope expose
window.selectUser = selectUser;
window.updateQty = updateQty;
window.deleteItem = deleteItem;
window.editItem = editItem;

init();