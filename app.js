// تكامل كامل مع Firebase Realtime Database و Storage (استخدام compat SDK لتبسيط الاندماج)

// ----- تكوين Firebase (استبدل بالقيم التي أعطيتني إياها - تم تضمينها هنا) -----
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

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

// قائمة الموظفين ثابتة كما طلبت
const EMPLOYEES = ["ايهاب","بسام","ضحى","سارة","حوراء","معاذ","محمود","نزار"];

let state = {
  selectedEmployee: EMPLOYEES[0],
  data: {}, // { employeeName: [items...] } مع كل عنصر يحتوي على _key (مفتاح من قاعدة البيانات)
  miswak: [] // قائمة النواقص الخاصة بالمسواك، كل عنصر يحتوي على _key
};

/* ---- مساعدة DOM ---- */
function $(sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }

/* ---- تحميل واستماع للبيانات من Firebase ---- */
function attachDatabaseListeners(){
  // استمع لكل موظف على المسار inventory/{employee}
  EMPLOYEES.forEach(emp => {
    const ref = database.ref(`inventory/${emp}`);
    ref.on('value', snapshot => {
      const val = snapshot.val();
      const arr = [];
      if(val){
        Object.entries(val).forEach(([k,v]) => {
          v._key = k;
          arr.push(v);
        });
      }
      state.data[emp] = arr;
      // فقط إعادة عرض إذا كان الموظف المحدد هو نفس الموظف الذي تغيرت بياناته
      if(state.selectedEmployee === emp) renderInventory();
      renderEmployeeTabs(); // لتحديث أرقام/حالة - إن أردت يمكن تحسينها لإعادة رسم أقل
    });
  });

  // نواقص المسواك (قائمة عامة)
  const misRef = database.ref('miswak');
  misRef.on('value', snapshot => {
    const val = snapshot.val();
    const arr = [];
    if(val){
      Object.entries(val).forEach(([k,v])=>{
        v._key = k;
        arr.push(v);
      });
      // نرتب حسب الوقت الأحدث أولاً
      arr.sort((a,b) => (b.at || 0) - (a.at || 0));
    }
    state.miswak = arr;
    renderMiswakList();
  });
}

/* ---- رندر الواجهة ---- */
function renderEmployeeTabs(){
  const container = $("#employeesList");
  container.innerHTML = "";
  EMPLOYEES.forEach(name => {
    const btn = document.createElement("button");
    btn.className = "tab" + (state.selectedEmployee===name ? " active" : "");
    // ضع رقم العناصر ضمن التاغ (اختياري)
    const count = (state.data[name] || []).length;
    btn.textContent = `${name} ${count ? `(${count})` : ''}`;
    btn.onclick = () => {
      state.selectedEmployee = name;
      renderEmployeeTabs();
      renderInventory();
      populateEmployeeSelect();
    };
    container.appendChild(btn);
  });
}

function populateEmployeeSelect(){
  const sel = $("#employeeSelect");
  sel.innerHTML = "";
  EMPLOYEES.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if(name === state.selectedEmployee) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderInventory(){
  const area = $("#inventoryArea");
  const items = state.data[state.selectedEmployee] || [];
  if(!items.length){
    area.innerHTML = `<p class="muted">لا توجد مواد مسجّلة لدى ${state.selectedEmployee} بعد.</p>`;
    return;
  }
  const table = document.createElement("table");
  table.className = "inventory-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>صورة</th><th>اسم المادة</th><th>صنف</th><th>انتهاء</th><th>الكمية</th><th>ملاحظة</th><th>إجراءات</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  items.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.image ? `<img src="${it.image}" alt="صورة">` : ""}</td>
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.category||"")}</td>
      <td>${it.expiry || ""}</td>
      <td>${it.qty}</td>
      <td>${escapeHtml(it.note||"")}</td>
      <td class="actions">
        <button class="edit" data-key="${it._key}">تعديل</button>
        <button class="del" data-key="${it._key}">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  area.innerHTML = "";
  area.appendChild(table);

  table.querySelectorAll("button.del").forEach(btn=>{
    btn.addEventListener("click", e=>{
      const key = btn.dataset.key;
      if(!key) return;
      if(confirm("هل تريد حذف هذه المادة؟")){
        const emp = state.selectedEmployee;
        database.ref(`inventory/${emp}/${key}`).remove()
          .catch(err => alert("خطأ عند الحذف: " + err.message));
      }
    });
  });

  table.querySelectorAll("button.edit").forEach(btn=>{
    btn.addEventListener("click", e=>{
      const key = btn.dataset.key;
      if(!key) return;
      startEditItemByKey(key);
    });
  });
}

/* ---- فورم الإضافة ---- */
function setupForms(){
  const form = $("#itemForm");
  form.addEventListener("submit", async (ev)=>{
    ev.preventDefault();
    const name = $("#itemName").value.trim();
    if(!name) return alert("أدخل اسم المادة");
    const category = $("#itemCategory").value.trim();
    const expiry = $("#itemExpiry").value;
    const qty = parseInt($("#itemQty").value,10) || 0;
    const note = $("#itemNote").value.trim();
    const employee = $("#employeeSelect").value || state.selectedEmployee;
    const fileInput = $("#itemImage");
    let imageData = "";
    let storagePath = "";

    try {
      if(fileInput.files && fileInput.files[0]){
        const file = fileInput.files[0];
        const ts = Date.now();
        const path = `images/inventory/${employee}/${ts}_${file.name.replaceAll(/\s+/g,'_')}`;
        const ref = storage.ref().child(path);
        const snapshot = await ref.put(file);
        imageData = await snapshot.ref.getDownloadURL();
        storagePath = path;
      }

      const item = {
        name, category, expiry, qty, note, image: imageData, storagePath,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };

      // ادفع العنصر إلى قاعدة البيانات تحت مسار inventory/{employee}
      await database.ref(`inventory/${employee}`).push(item);
      form.reset();
      populateEmployeeSelect();
      alert("تمت إضافة المادة بنجاح في Firebase");
    } catch(err){
      console.error(err);
      alert("حدث خطأ أثناء الرفع: " + (err.message || err));
    }
  });

  $("#clearForm").addEventListener("click", ()=> form.reset());

  // نواقص المسواك
  const mf = $("#miswakForm");
  mf.addEventListener("submit", async (ev)=>{
    ev.preventDefault();
    const file = $("#miswakImage").files[0];
    if(!file) return alert("التقط صورة للمسواك");
    const note = $("#miswakNote").value.trim();
    try {
      const ts = Date.now();
      const path = `images/miswak/${ts}_${file.name.replaceAll(/\s+/g,'_')}`;
      const ref = storage.ref().child(path);
      const snapshot = await ref.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      const obj = { image: downloadURL, storagePath: path, note, at: firebase.database.ServerValue.TIMESTAMP };
      await database.ref('miswak').push(obj);
      mf.reset();
    } catch(err){
      console.error(err);
      alert("خطأ أثناء رفع صورة المسواك: " + (err.message || err));
    }
  });
  $("#clearMiswak").addEventListener("click", ()=> $("#miswakForm").reset());
}

/* ---- عرض قائمة النواقص ---- */
function renderMiswakList(){
  const container = $("#miswakList");
  if(!state.miswak.length){
    container.innerHTML = `<p class="muted">لا توجد نواقص مسجّلة بعد.</p>`;
    return;
  }
  container.innerHTML = "";
  state.miswak.forEach((m, idx)=>{
    const div = document.createElement("div");
    div.className = "miswak-item";
    const when = m.at ? new Date(m.at).toLocaleString() : "";
    div.innerHTML = `
      <img src="${m.image}" alt="مسواك">
      <div style="flex:1">
        <div><strong>ملاحظة:</strong> ${escapeHtml(m.note || "-")}</div>
        <div class="muted" style="font-size:0.9rem">أضيفت: ${when}</div>
      </div>
      <div>
        <button class="btn" data-key="${m._key}">حذف</button>
      </div>
    `;
    container.appendChild(div);
    div.querySelector("button").addEventListener("click", ()=>{
      if(confirm("حذف من قائمة النواقص؟")){
        const key = div.querySelector("button").dataset.key;
        if(key) {
          // احذف السجل ومن ثم احذف الصورة من التخزين إن وُجدت
          database.ref(`miswak/${key}`).once('value').then(snap=>{
            const val = snap.val();
            if(val && val.storagePath){
              storage.ref().child(val.storagePath).delete().catch(()=>{/* تجاهل أخطاء الحذف */});
            }
            return database.ref(`miswak/${key}`).remove();
          }).catch(err => alert("خطأ: " + err.message));
        }
      }
    });
  });
}

/* ---- تحرير عنصر عبر المفتاح (key) ---- */
function startEditItemByKey(key){
  const emp = state.selectedEmployee;
  database.ref(`inventory/${emp}/${key}`).once('value').then(snap=>{
    const item = snap.val();
    if(!item) return alert("العنصر غير موجود");
    // املىء الفورم بالقيم
    $("#itemName").value = item.name || "";
    $("#itemCategory").value = item.category || "";
    $("#itemExpiry").value = item.expiry || "";
    $("#itemQty").value = item.qty || 0;
    $("#itemNote").value = item.note || "";
    $("#employeeSelect").value = emp;

    if(!confirm("سيتم استبدال العنصر الحالي عند حفظ التعديلات. اضغط موافق للمتابعة.")) return;
    // إذا كانت هناك صورة مخزنة في التخزين، سنحاول حذفها (اختياري) — هنا نحذف الصورة السابقة كي لا تتراكم
    if(item.storagePath){
      storage.ref().child(item.storagePath).delete().catch(()=>{/* تجاهل أخطاء الحذف */});
    }
    // حذف السجل الأصلي وسيقوم المستخدم بالضغط على "إضافة" لحفظ الجديد
    return database.ref(`inventory/${emp}/${key}`).remove();
  }).catch(err => alert("خطأ عند جلب العنصر: " + err.message));
}

/* ---- مساعدة رفع الملفات ---- */
function readFileAsDataURL(file){
  return new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = ()=> res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

/* ---- حماية النصوص من XSS بسيطة ---- */
function escapeHtml(s){
  if(!s) return "";
  return s.toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

/* ---- تهيئة ---- */
function init(){
  // ملء مصفوفة البيانات الفارغة أولاً
  EMPLOYEES.forEach(e => state.data[e] = []);
  populateEmployeeSelect();
  renderEmployeeTabs();
  renderInventory();

  attachDatabaseListeners();
  setupForms();
}

init();