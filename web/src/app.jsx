import React, { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_PUBLIC_API_BASE || "http://localhost:8000";

const DISTRICTS = [
  "Все районы",
  "Kentron",
  "Arabkir",
  "Ajapnyak",
  "Avan",
  "Davtashen",
  "Erebuni",
  "Kanaker-Zeytun",
  "Malatia-Sebastia",
  "Nor Nork",
  "Nork-Marash",
  "Nubarashen",
  "Shengavit",
];

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

// утилита для склонения "объект/объекта/объектов"
function pluralRu(n) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return "ов";
  if (n1 === 1) return "";
  if (n1 >= 2 && n1 <= 4) return "а";
  return "ов";
}

export default function App() {
// ---------------- base state ----------------
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // сортировка (клиентская)
  const [sort, setSort] = useState("newest");

  // панель фильтров
  const [showFilters, setShowFilters] = useState(false);

  // применённые и черновые фильтры
  const [applied, setApplied] = useState({
    currency: "AMD",
    districts: [],
    priceFrom: "",
    priceTo: "",
    bedrooms: "",
    areaFrom: "",
    areaTo: "",
    floorFrom: "",
    floorTo: "",
    isNew: "",
    ppsFrom: "",
    ppsTo: "",
    hasAC: false,
    hasOven: false,
    hasDishwasher: false,
    hasTV: false,
    hasWiFi: false,
    hasMicrowave: false,
    hasFridge: false,
    isFurnished: "",
    bathShower: false,
    bathTub: false,
    type: "",
    isHouseYard: "",
    housePart: "",
  });
  const [draft, setDraft] = useState(applied);
  const [previewCount, setPreviewCount] = useState(null);
  const previewTimer = useRef(null);

  // --- NEW: клиентская фильтрация + сортировка (чтобы работало даже если бэк не фильтрует)
  function clientFilter(list, f) {
    return list.filter((x) => {
      if (f.type && x.type !== f.type) return false;

      if (Array.isArray(f.districts) && f.districts.length && !f.districts.includes(x.district)) {
        return false;
      }

      // Цена: учитываем валюту UI
      const price = f.currency === "USD" ? Number(x.price_usd) : Number(x.price_amd);
      if (String(f.priceFrom).trim() !== "" && price < Number(f.priceFrom)) return false;
      if (String(f.priceTo).trim()   !== "" && price > Number(f.priceTo))   return false;

      // Комнаты
      if (String(f.bedrooms).trim() !== "") {
        const want = Number(f.bedrooms);
        if (want === 3) {
          if (Number(x.bedrooms) < 3) return false;
        } else {
          if (Number(x.bedrooms) !== want) return false;
        }
      }

      // Площадь
      if (String(f.areaFrom).trim() !== "" && Number(x.area_sqm) < Number(f.areaFrom)) return false;
      if (String(f.areaTo).trim()   !== "" && Number(x.area_sqm) > Number(f.areaTo))   return false;

      // Этаж (для квартир)
      if (x.type === "apartment") {
        if (String(f.floorFrom).trim() !== "" && Number(x.floor) < Number(f.floorFrom)) return false;
        if (String(f.floorTo).trim()   !== "" && Number(x.floor) > Number(f.floorTo))   return false;
        if (String(f.isNew).trim() !== "" && Boolean(x.is_new_building) !== (f.isNew === true)) return false;
      }

      // Цена за м²
      const pps = Number(x.price_amd) / Math.max(1, Number(x.area_sqm));
      if (String(f.ppsFrom).trim() !== "" && pps < Number(f.ppsFrom)) return false;
      if (String(f.ppsTo).trim()   !== "" && pps > Number(f.ppsTo))   return false;

      // Удобства (в бэке snake_case)
      if (f.hasAC && !x.has_ac) return false;
      if (f.hasOven && !x.has_oven) return false;
      if (f.hasDishwasher && !x.has_dishwasher) return false;
      if (f.hasTV && !x.has_tv) return false;
      if (f.hasWiFi && !x.has_wifi) return false;
      if (f.hasMicrowave && !x.has_microwave) return false;
      if (f.hasFridge && !x.has_fridge) return false;

      // Дом-специфика
      if (x.type === "house") {
        if (String(f.isHouseYard).trim() !== "" && Boolean(x.is_house_yard) !== (f.isHouseYard === true)) return false;
        if (String(f.housePart).trim() !== "" && String(x.house_part || "") !== String(f.housePart)) return false;
      }

      return true;
    });
  }

  function clientSort(list, sort) {
    const a = [...list];
    switch (sort) {
      case "price_asc":  return a.sort((x, y) => x.price_amd - y.price_amd);
      case "price_desc": return a.sort((x, y) => y.price_amd - x.price_amd);
      case "area_asc":   return a.sort((x, y) => x.area_sqm - y.area_sqm);
      case "area_desc":  return a.sort((x, y) => y.area_sqm - x.area_sqm);
      case "newest":
      default:           return a.sort((x, y) => Number(y.id) - Number(x.id));
    }
  }

  // --- numeric helpers: поддержка "40,182008"
  const toNum = (v) => Number(String(v ?? "").replace(",", ".").trim());
  const isNum = (v) => Number.isFinite(toNum(v));

// --- numeric helpers: поддержка "40,182008"
const toNum = (v) => Number(String(v ?? "").replace(",", ".").trim());
const isNum = (v) => Number.isFinite(toNum(v));
  // ---------------- map ----------------
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markers = useRef([]);
  const markerById = useRef(new Map());
  const tempMarkerRef = useRef(null);

  // ---------------- preview & detail ----------------
  const [preview, setPreview] = useState(null); // объект для «предпросмотра»
  const [detailId, setDetailId] = useState(null); // id для детального экрана
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ---------------- admin ----------------
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState("dev123");
  const [creating, setCreating] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [showMy, setShowMy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    district: "",
    price_amd: "",
    bedrooms: "",
    area_sqm: "",
    floor: "",
    lat: "",
    lng: "",
    type: "apartment",
    description: "",
    has_ac: false,
    has_wifi: false,
    has_tv: false,
    has_fridge: false,
    has_dishwasher: false,
    has_oven: false,
    has_microwave: false,
    bath_shower: false,
    bath_tub: false,
    is_furnished: "",
    is_new_building: false,
    is_house_yard: false,
    house_part: "",
    photos: [],
  });
  const [edit, setEdit] = useState({
    id: "",
    price_amd: "",
    addPhotoUrl: "",
  });
  const fileInputRef = useRef(null);
  const [picking, setPicking] = useState(false);

  // restore from hash on load / navigate
  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash;
      const m = h.match(/#\/listing\/(\d+)/);
      if (m) {
        const id = Number(m[1]);
        setDetailId(id);
        setShowFilters(false);
        setPreview(null);
      } else {
        setDetailId(null);
        setDetail(null);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // load detail data
  useEffect(() => {
    if (!detailId) return;
    setDetailLoading(true);
    fetch(`${API}/api/listings/${detailId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setDetailLoading(false);
      })
      .catch(() => {
        setDetail(null);
        setDetailLoading(false);
      });
  }, [detailId]);

  // --- ОБНОВЛЁННАЯ загрузка списка: всегда тянем все и фильтруем клиентом
  useEffect(() => {
    let aborted = false;
    setLoading(true);
    fetch(`${API}/api/listings`)
      .then((r) => r.json())
      .then((data) => {
        if (aborted) return;
        const filtered = clientFilter(data, applied);
        const sorted = clientSort(filtered, sort);
        setItems(sorted);
        setTotal(filtered.length);
        setPreview((p) => (p ? sorted.find((x) => x.id === p.id) || p : null));
        setTimeout(() => renderMarkers(sorted), 0);
      })
      .catch(() => {
        if (!aborted) {
          setItems([]);
          setTotal(0);
          renderMarkers([]);
        }
      })
      .finally(() => !aborted && setLoading(false));
    return () => { aborted = true; };
  }, [JSON.stringify(applied), sort]);

  // карта
  useEffect(() => {
    if (!mapRef.current) return;
    // eslint-disable-next-line no-undef
    const Lmap = L.map(mapRef.current).setView([40.179, 44.499], 12);
    leafletMap.current = Lmap;
    // eslint-disable-next-line no-undef
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OSM",
    }).addTo(Lmap);
    return () => Lmap.remove();
  }, []);

  function renderMarkers(data) {
    if (!leafletMap.current) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    markerById.current.clear();
    data.forEach((x) => {
      // eslint-disable-next-line no-undef
      const m = L.marker([x.lat, x.lng]).addTo(leafletMap.current);
      m.on("click", () => {
        setPreview(x); // открыть превью при клике по пину
        // подвинем карту к точке
        leafletMap.current.setView(m.getLatLng(), 14, { animate: true });
      });
      m.bindTooltip(esc(x.title), { direction: "top" });
      markers.current.push(m);
      markerById.current.set(x.id, m);
    });
  }

  function focusMarker(id) {
    const m = markerById.current.get(id);
    if (m && leafletMap.current) {
      leafletMap.current.setView(m.getLatLng(), 14);
      m.openTooltip?.();
    }
  }

  // Плавно показать объект на карте, даже если маркер не в текущем списке
  function showOnMap({ id, lat, lng, title }) {
    const m = markerById.current.get(id);
    if (m && leafletMap.current) {
      highlightMarker(m);
      leafletMap.current.setView(m.getLatLng(), 14, { animate: true });
      m.openTooltip?.();
      return;
    }
    if (!leafletMap.current || lat == null || lng == null) return;
    // eslint-disable-next-line no-undef
    const temp = L.marker([lat, lng], { zIndexOffset: 1200 }).addTo(leafletMap.current);
    temp.bindTooltip(esc(title || "Объект"), { direction: "top", permanent: false });
    highlightMarker(temp);
    leafletMap.current.setView([lat, lng], 14, { animate: true });
    temp.openTooltip?.();
    setTimeout(() => { temp.remove?.(); }, 2500);
  }

  function highlightMarker(m) {
    try {
      m.setZIndexOffset?.(1000);
      setTimeout(() => m.setZIndexOffset?.(0), 2500);
    } catch {}
  }

  // выбор координат кликом по карте
  useEffect(() => {
    if (!picking || !leafletMap.current) return;
    const handler = (e) => {
      setForm((f) => ({ ...f, lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) }));
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setLatLng(e.latlng);
      } else {
        // eslint-disable-next-line no-undef
        tempMarkerRef.current = L.marker(e.latlng, { zIndexOffset: 1000 }).addTo(leafletMap.current);
      }
    };
    leafletMap.current.on("click", handler);
    return () => {
      leafletMap.current.off("click", handler);
    };
  }, [picking]);

  // предпросчёт количества для кнопки «Показать N объектов»
  useEffect(() => {
    if (!showFilters) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      fetch(`${API}/api/listings`)
        .then((r) => r.json())
        .then((data) => {
          const filtered = clientFilter(data, draft);
          setPreviewCount(filtered.length || 0);
        })
        .catch(() => setPreviewCount(null));
    }, 250);
    return () => previewTimer.current && clearTimeout(previewTimer.current);
  }, [draft, showFilters]);

  // handlers
  const updateDraft = (patch) => setDraft((s) => ({ ...s, ...patch }));
  function onDistrictsChange(e) {
    const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
    updateDraft({ districts: opts.filter((d) => d !== "Все районы") });
  }

  function applyDraft() {
    setApplied({ ...draft });
    setShowFilters(false);
    setPreviewCount(null);
  }

  function resetDraft() {
    const base = {
      currency: "AMD",
      districts: [],
      priceFrom: "",
      priceTo: "",
      bedrooms: "",
      areaFrom: "",
      areaTo: "",
      floorFrom: "",
      floorTo: "",
      isNew: "",
      ppsFrom: "",
      ppsTo: "",
      hasAC: false,
      hasOven: false,
      hasDishwasher: false,
      hasTV: false,
      hasWiFi: false,
      hasMicrowave: false,
      hasFridge: false,
      isFurnished: "",
      bathShower: false,
      bathTub: false,
      type: "",          // "", "apartment", "house"
      isHouseYard: "",
      housePart: "",
    };
    setDraft(base);
  }

  // open/close detail
  const openDetail = (id) => {
    window.location.hash = `#/listing/${id}`;
  };
  const closeDetail = () => {
    window.location.hash = "#/";
  };

  // ---------- Admin: upload & CRUD ----------
  async function uploadPhoto(file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("Upload failed");
    const j = await r.json(); // {url:"/uploads/xxx.jpg"}
    return j.url;
  }

  async function uploadPhotos() {
    try {
      const files = Array.from(fileInputRef?.current?.files || []).slice(0, 10);
      if (!files.length) {
        alert("Выберите файлы перед загрузкой");
        return;
      }
      const uploaded = [];
      for (const f of files) {
        uploaded.push(await uploadPhoto(f));
      }
      setForm((s) => ({ ...s, photos: [...(s.photos || []), ...uploaded] }));
      if (fileInputRef?.current) fileInputRef.current.value = "";
      alert("Фото загружено: " + uploaded.join(", "));
    } catch (e) {
      console.error(e);
      alert("Ошибка загрузки фото: " + (e.message || e));
    }
  }

  async function createListing() {
    try {
      if (!adminToken.trim()) {
        alert("Укажите Admin Token");
        return;
      }
      // базовая проверка обязательных полей
      const must = ["title","district","price_amd","bedrooms","area_sqm","type"];
      if (form.type === "apartment") must.push("floor");
      for (const k of must) {
        if (!String(form[k] ?? "").trim()) {
          alert(`Заполните поле: ${k}`);
          return;
        }
      }

      // координаты: либо введены, либо выбраны на карте
      if (!isNum(form.lat) || !isNum(form.lng)) {
        alert("Укажите координаты (введите с точкой или нажмите «Выбрать на карте»).");
        return;
      }

      setCreating(true);

      const payload = {
        title: form.title.trim(),
        district: form.district,
        price_amd: toNum(form.price_amd),
        bedrooms: toNum(form.bedrooms),
        area_sqm: toNum(form.area_sqm),
        floor: form.type === "apartment" ? toNum(form.floor) : 0,
        lat: toNum(form.lat),
        lng: toNum(form.lng),
        type: form.type,
        description: form.description || "",

        // удобства (snake_case как в бэке)
        has_ac: !!form.has_ac,
        has_wifi: !!form.has_wifi,
        has_tv: !!form.has_tv,
        has_fridge: !!form.has_fridge,
        has_dishwasher: !!form.has_dishwasher,
        has_oven: !!form.has_oven,
        has_microwave: !!form.has_microwave,

        // доп. критерии
        is_furnished: String(form.is_furnished) === "true",
        bath_shower: !!form.bath_shower,
        bath_tub: !!form.bath_tub,

        // специфично
        is_new_building: form.type === "apartment" ? !!form.is_new_building : false,
        is_house_yard: form.type === "house" ? !!form.is_house_yard : false,
        house_part: form.type === "house" ? (form.house_part || "") : "",

        photos: form.photos || [],
      };

      const res = await fetch(`${API}/api/admin/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка сервера");
      }

      const created = await res.json();

      alert(`Создано! ID: ${created.id}`);
      setMyListings((s) => [created, ...s]);
      // очистим форму
      setForm({
        title: "", district: "", price_amd: "", bedrooms: "", area_sqm: "",
        floor: "", lat: "", lng: "", type: "apartment", description: "",
        photos: [],
        has_ac:false,has_wifi:false,has_tv:false,has_fridge:false,
        has_dishwasher:false,has_oven:false,has_microwave:false,
        is_furnished:"", bath_shower:false, bath_tub:false,
        is_new_building:false, is_house_yard:false, house_part:""
      });
      if (fileInputRef?.current) fileInputRef.current.value = "";

      // обновим список и закроем админку
      setApplied((s) => ({ ...s }));
      setShowAdmin(false);
    } catch (e) {
      console.error(e);
      alert("Ошибка создания: " + (e.message || e));
    } finally {
      setCreating(false);
    }
// если ещё не объявлено рядом с остальными useState:
const [creating, setCreating] = useState(false);

async function createListing() {
  try {
    // проверка токена админа
    if (!adminToken.trim()) {
      alert("Укажите Admin Token");
      return;
    }

    // обязательные поля
    const must = ["title","district","price_amd","bedrooms","area_sqm","type"];
    if (form.type === "apartment") must.push("floor");
    for (const k of must) {
      if (!String(form[k] ?? "").trim()) {
        alert(`Заполните поле: ${k}`);
        return;
      }
    }

    // координаты (поддержка запятой/точки)
    if (!isNum(form.lat) || !isNum(form.lng)) {
      alert("Укажите координаты (введите с точкой/запятой или нажмите «Выбрать на карте»).");
      return;
    }

    setCreating(true);

    const payload = {
      title: form.title.trim(),
      district: form.district,
      price_amd: toNum(form.price_amd),
      bedrooms: toNum(form.bedrooms),
      area_sqm: toNum(form.area_sqm),
      floor: form.type === "apartment" ? toNum(form.floor) : 0,
      lat: toNum(form.lat),
      lng: toNum(form.lng),
      type: form.type,
      description: form.description || "",

      // удобства
      has_ac: !!form.has_ac,
      has_wifi: !!form.has_wifi,
      has_tv: !!form.has_tv,
      has_fridge: !!form.has_fridge,
      has_dishwasher: !!form.has_dishwasher,
      has_oven: !!form.has_oven,
      has_microwave: !!form.has_microwave,

      // доп. критерии
      is_furnished: String(form.is_furnished) === "true",
      bath_shower: !!form.bath_shower,
      bath_tub: !!form.bath_tub,

      // специфично
      is_new_building: form.type === "apartment" ? !!form.is_new_building : false,
      is_house_yard: form.type === "house" ? !!form.is_house_yard : false,
      house_part: form.type === "house" ? (form.house_part || "") : "",

      photos: form.photos || [],
    };

    const res = await fetch(`${API}/api/admin/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Ошибка сервера");
    }

    const created = await res.json();
    alert(`Создано! ID: ${created.id}`);

    // сброс формы
    setForm({
      title: "", district: "", price_amd: "", bedrooms: "", area_sqm: "",
      floor: "", lat: "", lng: "", type: "apartment", description: "",
      photos: [],
      has_ac:false,has_wifi:false,has_tv:false,has_fridge:false,
      has_dishwasher:false,has_oven:false,has_microwave:false,
      is_furnished:"", bath_shower:false, bath_tub:false,
      is_new_building:false, is_house_yard:false, house_part:""
    });
    if (fileInputRef?.current) fileInputRef.current.value = "";

    // обновляем каталог по новой логике: всегда забираем всё и фильтруем/сортируем на клиенте
    fetch(`${API}/api/listings`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = clientFilter(data, applied);
        const sorted = clientSort(filtered, sort);
        setItems(sorted);
        setTotal(filtered.length);
        setPreview((p) => (p ? sorted.find((x) => x.id === p.id) || p : null));
        setTimeout(() => renderMarkers(sorted), 0);
      });

    // закрываем админку
    setShowAdmin(false);
  } catch (e) {
    console.error(e);
    alert("Ошибка создания: " + (e.message || e));
  } finally {
    setCreating(false);
  }
}
  }

  async function updateListing() {
    if (!edit.id) return alert("Укажи ID для редактирования");
    const body = {};
    if (edit.price_amd) body.price_amd = Number(edit.price_amd);
    if (edit.addPhotoUrl) body.photos = [(detail?.photos||[])[0], edit.addPhotoUrl].filter(Boolean); // пример: перезапишем список
    const res = await fetch(`${API}/api/admin/listings/${edit.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("Ошибка: " + (data?.detail || res.statusText));
      return;
    }
    alert("Обновлено");
    setEdit({ id: "", price_amd: "", addPhotoUrl: "" });
    fetch(`${API}/api/listings`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = clientFilter(data, applied);
        const sorted = clientSort(filtered, sort);
        setItems(sorted);
        setTotal(filtered.length);
        setPreview((p) => (p ? sorted.find((x) => x.id === p.id) || p : null));
        setTimeout(() => renderMarkers(sorted), 0);
      });
  }

  async function deleteListing(id) {
    if (!window.confirm("Удалить объект #" + id + "?")) return;
    const res = await fetch(`${API}/api/admin/listings/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Token": adminToken },
    });
    if (!res.ok) {
      const j = await res.json().catch(()=>null);
      alert("Ошибка: " + (j?.detail || res.statusText));
      return;
    }
    alert("Удалено");
    setMyListings((s) => s.filter((x) => x.id !== id));
    fetch(`${API}/api/listings`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = clientFilter(data, applied);
        const sorted = clientSort(filtered, sort);
        setItems(sorted);
        setTotal(filtered.length);
        setPreview((p) => (p ? sorted.find((x) => x.id === p.id) || p : null));
        setTimeout(() => renderMarkers(sorted), 0);
      });
  }

  async function loadMyListings() {
    try {
      if (!adminToken.trim()) {
        alert("Укажите Admin Token");
        return;
      }
      const res = await fetch(`${API}/api/admin/my-listings`, {
        headers: { "X-Admin-Token": adminToken },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка сервера");
      }
      const data = await res.json();
      setMyListings(data);
      setShowMy(true);
    } catch (e) {
      console.error(e);
      alert("Ошибка загрузки: " + (e.message || e));
    }
  }

// ---------------- styles ----------------
const css = `
html, body, #root { height: 100%; margin: 0; }
body { font-family: -apple-system, system-ui, Segoe UI, Roboto, Arial, sans-serif; background: #f6f7f9; color:#0f172a; }
.app { display: grid; grid-template-columns: 1fr 460px; height: 100%; }

@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; }
  .side { order:-1; height: 54%; position:relative; z-index:5; }
  .mapWrap { height: 46%; }
}

.topbar { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#fff; border-bottom:1px solid #e5e7eb; position:sticky; top:0; z-index:10;}
.logo { font-weight:700; letter-spacing:.2px; }
.mapWrap { position:relative; z-index:0; }

/* --- FIX: UI всегда над картой --- */
.side { position: relative; z-index: 5000; }
#map { position: relative; z-index: 0 !important; }

/* Опускаем все слои и контролы Leaflet ниже UI */
.leaflet-container,
.leaflet-pane,
.leaflet-tile-pane,
.leaflet-overlay-pane,
.leaflet-marker-pane,
.leaflet-popup-pane,
.leaflet-tooltip-pane,
.leaflet-top,
.leaflet-bottom,
.leaflet-control { z-index: 0 !important; }

#map { width:100%; height: calc(100% - 56px); }
.panel { padding:12px; overflow:auto; height: calc(100% - 56px); }
.card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:12px; margin-bottom:12px; box-shadow: 0 2px 8px rgba(17,24,39,.04); transition: transform .08s ease; }
.card.hoverable:hover { transform: translateY(-2px); }
.filters { display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; margin-bottom:12px; }
.field { display:flex; flex-direction:column; gap:4px; font-size:12px; }
.col2 { grid-column: span 2; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 12px; border-radius:10px; border:1px solid #d1d5db; background:#fff; cursor:pointer; }
.btn.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
.btn:focus { outline: 2px solid #2563eb33; }
.input { padding:8px; border:1px solid #d1d5db; border-radius:8px; min-width:120px; }
.pill { background:#f1f5f9; border:1px solid #e2e8f0; padding:2px 8px; border-radius:999px; font-size:12px; }
.row { display:flex; gap:8px; flex-wrap: wrap; }
.price { font-weight:700; }
.muted { color:#475569; font-size:12px; }

/* Preview sheet (mobile-first bottom sheet) */
.sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 100000 !important; display:flex; justify-content:center; }
.sheet-card { width: min(640px, 96%); margin: 8px; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:12px; box-shadow: 0 10px 30px rgba(2,6,23,.15); }
.sheet-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.sheet-title { font-weight:700; }

/* Detail drawer (fills viewport on mobile, side panel on desktop) */
.drawer { position: fixed; inset: 0; z-index: 110000 !important; background: rgba(15,23,42,.24); display:flex; }
.drawer-card { margin-left:auto; width: min(720px, 100%); height: 100%; background:#fff; border-left:1px solid #e5e7eb; display:flex; flex-direction:column; }
@media (max-width: 900px) { .drawer-card { width: 100%; } }
.drawer-head { display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid #e5e7eb; background:#fff; position:sticky; top:0; }
.drawer-title { font-weight:700; }
.gallery { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; padding:12px; }
.gallery-item { background:#f1f5f9; border:1px solid #e2e8f0; aspect-ratio: 4/3; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#475569; }
`;

// -------- render ----------
return (
  <div className="app">
    <style>{css}</style>

    {/* MAP COLUMN */}
    <div className="mapWrap">
      <div className="topbar">
        <div className="logo">White Safe Estate</div>
        <div className="pill">Yerevan</div>
        <button className="btn" onClick={() => setShowAdmin(!showAdmin)}>⚙ Админ</button>
      </div>
      <div id="map" ref={mapRef}></div>
    </div>

    {/* SIDE COLUMN */}
    <aside className="side">
      <div className="topbar">
        <div className="muted">Фильтры</div>
        <div className="row" style={{ marginLeft: "auto", gap: 8 }}>
          <select
            className="btn"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            title="Сортировка"
          >
            <option value="newest">Свежее</option>
            <option value="price_asc">Цена ↑</option>
            <option value="price_desc">Цена ↓</option>
            <option value="area_asc">Площадь ↑</option>
            <option value="area_desc">Площадь ↓</option>
          </select>

          <button
            className="btn"
            onClick={() =>
              setApplied((s) => ({
                ...s,
                currency: s.currency === "AMD" ? "USD" : "AMD",
              }))
            }
            title="Валюта цен"
          >
            {applied.currency}
          </button>

          <button
            className="btn"
            onClick={() => {
              setShowFilters(!showFilters);
              if (!showFilters) setDraft(applied);
            }}
          >
            {showFilters ? "Скрыть фильтры" : "Показать фильтры"}
          </button>
        </div>
      </div>

      <div className="panel">
        {/* === АДМИН-ПАНЕЛЬ (перед фильтрами) === */}
        {showAdmin && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Админ-панель</div>

            <div className="field">
              <label>Admin Token</label>
              <input className="btn" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "12px 0" }} />

            {/* Основные поля */}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <input className="btn" placeholder="Заголовок" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ flex: "1 1 260px" }} />
              <input className="btn" placeholder="Район (Kentron/...)" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} style={{ flex: "1 1 200px" }} />
              <select className="btn" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="apartment">Квартира</option>
                <option value="house">Дом</option>
              </select>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <input className="btn" placeholder="Цена AMD" type="number" value={form.price_amd} onChange={(e) => setForm({ ...form, price_amd: e.target.value })} />
              <input className="btn" placeholder="Спальни" type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
              <input className="btn" placeholder="Площадь м²" type="number" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} />
              <input className="btn" placeholder="Этаж" type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} disabled={form.type === "house"} />
            </div>

            {/* Описание */}
            <div className="field" style={{ marginTop: 8 }}>
              <label>Описание</label>
              <textarea className="btn" rows={3} placeholder="Краткое описание" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Удобства */}
            <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
              <label className="btn"><input type="checkbox" checked={!!form.has_ac} onChange={e => setForm({ ...form, has_ac: e.target.checked })} />&nbsp;Кондиционер</label>
              <label className="btn"><input type="checkbox" checked={!!form.has_wifi} onChange={e => setForm({ ...form, has_wifi: e.target.checked })} />&nbsp;Wi-Fi</label>
              <label className="btn"><input type="checkbox" checked={!!form.has_tv} onChange={e => setForm({ ...form, has_tv: e.target.checked })} />&nbsp;TV</label>
              <label className="btn"><input type="checkbox" checked={!!form.has_fridge} onChange={e => setForm({ ...form, has_fridge: e.target.checked })} />&nbsp;Холодильник</label>
              <label className="btn"><input type="checkbox" checked={!!form.has_dishwasher} onChange={e => setForm({ ...form, has_dishwasher: e.target.checked })} />&nbsp;Посудомоечная</label>
              <label className="btn"><input type="checkbox" checked={!!form.has_oven} onChange={e => setForm({ ...form, has_oven: e.target.checked })} />&nbsp;Духовка</label>
              <label className="btn"><input type="checkbox" checked={!!form.has_microwave} onChange={e => setForm({ ...form, has_microwave: e.target.checked })} />&nbsp;Микроволновка</label>
              <label className="btn"><input type="checkbox" checked={!!form.bath_shower}
                onChange={e => setForm({ ...form, bath_shower: e.target.checked })} />&nbsp;Душ</label>
              <label className="btn"><input type="checkbox" checked={!!form.bath_tub}
                onChange={e => setForm({ ...form, bath_tub: e.target.checked })} />&nbsp;Ванна</label>
              <div className="field" style={{minWidth:160}}>
                <label>Мебель</label>
                <select className="btn" value={String(form.is_furnished || "")}
                        onChange={e => setForm({ ...form, is_furnished: e.target.value === "" ? "" : e.target.value === "true" })}>
                  <option value="">Неважно</option>
                  <option value="true">Есть мебель</option>
                  <option value="false">Без мебели</option>
                </select>
              </div>
<label className="btn">
  <input
    type="checkbox"
    checked={!!form.bath_shower}
    onChange={e => setForm({ ...form, bath_shower: e.target.checked })}
  />
  &nbsp;Душ
</label>

<label className="btn">
  <input
    type="checkbox"
    checked={!!form.bath_tub}
    onChange={e => setForm({ ...form, bath_tub: e.target.checked })}
  />
  &nbsp;Ванна
</label>

<div className="field" style={{ minWidth: 160 }}>
  <label>Мебель</label>
  <select
    className="btn"
    value={String(form.is_furnished || "")}
    onChange={e =>
      setForm({
        ...form,
        is_furnished: e.target.value === "" ? "" : e.target.value === "true",
      })
    }
  >
    <option value="">Неважно</option>
    <option value="true">Есть мебель</option>
    <option value="false">Без мебели</option>
  </select>
</div>
            </div>

            {/* Дом/Квартира спец-поля */}
            {form.type === "apartment" && (
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <label className="btn">
                  <input type="checkbox" checked={String(form.is_new_building) === "true"} onChange={e => setForm({ ...form, is_new_building: e.target.checked })} />
                  &nbsp;Новостройка
                </label>
              </div>
            )}
            {form.type === "house" && (
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <label className="btn">
                  <input type="checkbox" checked={String(form.is_house_yard) === "true"} onChange={e => setForm({ ...form, is_house_yard: e.target.checked })} />
                  &nbsp;Свой двор
                </label>
                <select className="btn" value={form.house_part || ""} onChange={(e) => setForm({ ...form, house_part: e.target.value })}>
                  <option value="">Дом полностью/часть</option>
                  <option value="full">Полностью</option>
                  <option value="part">Часть дома</option>
                </select>
              </div>
            )}

            {/* Координаты: выбрать на карте */}
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <input className="btn" placeholder="lat" type="number" step="0.000001" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              <input className="btn" placeholder="lng" type="number" step="0.000001" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
              <button className="btn" onClick={() => setPicking(true)}>Выбрать на карте</button>
            </div>

            {/* Фото: массовая загрузка до 10 */}
            <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "center" }}>
              <input ref={fileInputRef} className="btn" type="file" accept="image/*" multiple />
              <button className="btn" onClick={uploadPhotos}>Загрузить фото (до 10)</button>
            </div>
            {(form.photos || []).length > 0 && (
              <div className="muted" style={{ marginTop: 8 }}>
                Фото ({(form.photos || []).length}): {(form.photos || []).map((u) => <div key={u}>{u}</div>)}
              </div>
            )}

            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn primary" onClick={createListing} disabled={creating}>Создать</button>
              <button className="btn" onClick={loadMyListings}>Мои объекты</button>
            </div>
          </div>
        )}

        {showMy && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Мои объекты</div>
            {(myListings || []).map((x) => (
              <div key={x.id} className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                <div>#{x.id} {esc(x.title)}</div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn" onClick={() => openDetail(x.id)}>Открыть</button>
                  <button className="btn" onClick={() => deleteListing(x.id)}>Удалить</button>
                </div>
              </div>
            ))}
            {myListings.length === 0 && <div className="muted">Нет объектов</div>}
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={() => setShowMy(false)}>Закрыть</button>
            </div>
          </div>
        )}

        {/* ФИЛЬТРЫ */}
        {showFilters && (
          <>
            <div className="filters">
              {/* TYPE SELECTOR — первый шаг */}
              <div className="field col2">
                <label>Тип</label>
                <div className="row">
                  <button
                    className="btn"
                    onClick={() => updateDraft({ type: "" })}
                    aria-pressed={draft.type === "" ? "true" : "false"}
                  >
                    Квартира/Дом (не важно)
                  </button>
                  <button
                    className="btn"
                    onClick={() => updateDraft({ type: "apartment" })}
                    aria-pressed={draft.type === "apartment" ? "true" : "false"}
                  >
                    Квартира
                  </button>
                  <button
                    className="btn"
                    onClick={() => updateDraft({ type: "house" })}
                    aria-pressed={draft.type === "house" ? "true" : "false"}
                  >
                    Дом
                  </button>
                </div>
              </div>

              {/* DISTRICTS — второй шаг */}
              <div className="field col2">
                <label>Районы</label>
                <select
                  className="btn"
                  multiple
                  size={7}
                  value={draft.districts}
                  onChange={onDistrictsChange}
                  style={{ height: 140 }}
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* GENERAL PRICE */}
              <div className="field">
                <label>Цена {applied.currency === "USD" ? "($)" : "(AMD)"} — от</label>
                <input
                  className="btn"
                  type="number"
                  min="0"
                  value={draft.priceFrom}
                  onChange={(e) => updateDraft({ priceFrom: e.target.value })}
                  placeholder={applied.currency === "USD" ? "напр. 800" : "напр. 300000"}
                />
              </div>
              <div className="field">
                <label>Цена — до</label>
                <input
                  className="btn"
                  type="number"
                  min="0"
                  value={draft.priceTo}
                  onChange={(e) => updateDraft({ priceTo: e.target.value })}
                  placeholder={applied.currency === "USD" ? "напр. 2000" : "напр. 900000"}
                />
              </div>

              {/* BEDROOMS */}
              <div className="field">
                <label>Спальни</label>
                <select
                  className="btn"
                  value={String(draft.bedrooms)}
                  onChange={(e) =>
                    updateDraft({ bedrooms: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                >
                  <option value="">Любые</option>
                  <option value="0">Студия</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3+</option>
                </select>
              </div>

              {/* Площадь */}
              <div className="field">
                <label>Площадь (м²) — от</label>
                <input
                  className="btn"
                  type="number"
                  min="0"
                  value={draft.areaFrom}
                  onChange={(e) => updateDraft({ areaFrom: e.target.value })}
                  placeholder="м² от"
                />
              </div>
              <div className="field">
                <label>Площадь (м²) — до</label>
                <input
                  className="btn"
                  type="number"
                  min="0"
                  value={draft.areaTo}
                  onChange={(e) => updateDraft({ areaTo: e.target.value })}
                  placeholder="м² до"
                />
              </div>

              {/* СПЕЦИФИКА ДЛЯ КВАРТИР */}
              {(draft.type === "" || draft.type === "apartment") && (
                <>
                  <div className="field">
                    <label>Этаж — от</label>
                    <input
                      className="btn"
                      type="number"
                      value={draft.floorFrom}
                      onChange={(e) => updateDraft({ floorFrom: e.target.value })}
                      placeholder="от"
                    />
                  </div>
                  <div className="field">
                    <label>Этаж — до</label>
                    <input
                      className="btn"
                      type="number"
                      value={draft.floorTo}
                      onChange={(e) => updateDraft({ floorTo: e.target.value })}
                      placeholder="до"
                    />
                  </div>

                  <div className="field">
                    <label>Новостройка</label>
                    <select
                      className="btn"
                      value={String(draft.isNew)}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateDraft({ isNew: v === "" ? "" : v === "true" });
                      }}
                    >
                      <option value="">Не важно</option>
                      <option value="true">Да</option>
                      <option value="false">Нет</option>
                    </select>
                  </div>
                </>
              )}

              {/* Цена за м² */}
              <div className="field">
                <label>Цена за м² — от</label>
                <input
                  className="btn"
                  type="number"
                  min="0"
                  value={draft.ppsFrom}
                  onChange={(e) => updateDraft({ ppsFrom: e.target.value })}
                  placeholder="от"
                />
              </div>
              <div className="field">
                <label>Цена за м² — до</label>
                <input
                  className="btn"
                  type="number"
                  min="0"
                  value={draft.ppsTo}
                  onChange={(e) => updateDraft({ ppsTo: e.target.value })}
                  placeholder="до"
                />
              </div>

              {/* Удобства */}
              <label className="btn">
                <input type="checkbox" checked={draft.hasAC} onChange={(e) => updateDraft({ hasAC: e.target.checked })} />
                &nbsp;Кондиционер
              </label>
              <label className="btn">
                <input type="checkbox" checked={draft.hasOven} onChange={(e) => updateDraft({ hasOven: e.target.checked })} />
                &nbsp;Духовой шкаф
              </label>
              <label className="btn">
                <input type="checkbox" checked={draft.hasDishwasher} onChange={(e) => updateDraft({ hasDishwasher: e.target.checked })} />
                &nbsp;Посудомоечная
              </label>
              <label className="btn">
                <input type="checkbox" checked={draft.hasTV} onChange={(e) => updateDraft({ hasTV: e.target.checked })} />
                &nbsp;Телевизор
              </label>
              <label className="btn">
                <input type="checkbox" checked={draft.hasWiFi} onChange={(e) => updateDraft({ hasWiFi: e.target.checked })} />
                &nbsp;Wi-Fi
              </label>
              <label className="btn">
                <input type="checkbox" checked={draft.hasMicrowave} onChange={(e) => updateDraft({ hasMicrowave: e.target.checked })} />
                &nbsp;Микроволновка
              </label>
              <label className="btn">
                <input type="checkbox" checked={draft.hasFridge} onChange={(e) => updateDraft({ hasFridge: e.target.checked })} />
                &nbsp;Холодильник
              </label>

              {/* СПЕЦИФИКА ДЛЯ ДОМОВ */}
              {(draft.type === "" || draft.type === "house") && (
                <>
                  <div className="field">
                    <label>Свой двор</label>
                    <select
                      className="btn"
                      value={String(draft.isHouseYard)}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateDraft({ isHouseYard: v === "" ? "" : v === "true" });
                      }}
                    >
                      <option value="">Не важно</option>
                      <option value="true">Есть</option>
                      <option value="false">Нет</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Дом полностью/часть</label>
                    <select
                      className="btn"
                      value={draft.housePart}
                      onChange={(e) => updateDraft({ housePart: e.target.value })}
                    >
                      <option value="">Любой</option>
                      <option value="full">Полностью</option>
                      <option value="part">Часть дома</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <button className="btn" onClick={resetDraft}>Сбросить</button>
              <button className="btn primary" onClick={applyDraft}>
                {previewCount == null
                  ? "Показать"
                  : `Показать ${previewCount} объект${pluralRu(previewCount)}`}
              </button>
            </div>
          </>
        )}

        <div className="muted" style={{ marginBottom: 8 }}>
          Найдено: <b>{loading ? "..." : total}</b>
        </div>

        {loading ? (
          <div className="card">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="card">Ничего не найдено</div>
        ) : null}

        {items.map((x) => (
          <div
            key={x.id}
            className="card hoverable"
            onMouseEnter={() => focusMarker(x.id)}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>{x.title}</div>
              <div className="price">
                {applied.currency === "USD"
                  ? `$${Math.round(x.price_usd).toLocaleString()}`
                  : `${Number(x.price_amd).toLocaleString()} AMD`}
              </div>
            </div>
            <div className="muted">
              {x.district} • {x.bedrooms}-комн • {x.area_sqm} м² • эт. {x.floor}{" "}
              {x.is_new_building ? "• Новостройка" : ""}
              {x.type === "house" ? " • Дом" : ""}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              {x.has_ac && <div className="pill">AC</div>}
              {x.has_wifi && <div className="pill">Wi-Fi</div>}
              {x.has_tv && <div className="pill">TV</div>}
              {x.has_fridge && <div className="pill">Холодильник</div>}
              {x.has_dishwasher && <div className="pill">ПММ</div>}
              {x.has_oven && <div className="pill">Духовка</div>}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => focusMarker(x.id)}>
                Показать на карте
              </button>
              <button className="btn primary" onClick={() => openDetail(x.id)}>
                Показать полностью
              </button>
              {showAdmin && (
                <>
                  <button className="btn" onClick={() => setEdit((e) => ({ ...e, id: x.id }))}>
                    Редакт.
                  </button>
                  <button className="btn" onClick={() => deleteListing(x.id)}>Удалить</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>

    {/* PREVIEW SHEET (клик по пину) */}
    {preview && (
      <div className="sheet" role="dialog" aria-label="Предпросмотр">
        <div className="sheet-card">
          <div className="sheet-head">
            <div className="sheet-title">{preview.title}</div>
            <button className="btn" onClick={() => setPreview(null)}>✕</button>
          </div>
          <div className="muted" style={{marginBottom:8}}>
            {preview.district} • {preview.bedrooms}-комн • {preview.area_sqm} м² • эт. {preview.floor}
          </div>
          <div className="price" style={{marginBottom:12}}>
            {applied.currency === "USD"
              ? `$${Math.round(preview.price_usd).toLocaleString()}`
              : `${Number(preview.price_amd).toLocaleString()} AMD`}
          </div>
          <div className="row">
            <button
              className="btn"
              onClick={() =>
                showOnMap({ id: preview.id, lat: preview.lat, lng: preview.lng, title: preview.title })
              }
            >
              Показать на карте
            </button>
            <button className="btn primary" onClick={() => openDetail(preview.id)}>
              Показать полностью
            </button>
          </div>
        </div>
      </div>
    )}

    {/* DETAIL DRAWER (полная карточка) */}
    {detailId && (
      <div className="drawer" role="dialog" aria-label="Карточка квартиры">
        <div className="drawer-card">
          <div className="drawer-head">
            <button className="btn" onClick={closeDetail}>← Назад</button>
            <div className="drawer-title">{detail?.title || "Объект"}</div>
          </div>

          {detailLoading ? (
            <div className="card">Загрузка...</div>
          ) : detail ? (
            <>
              <div className="gallery">
                <div className="gallery-item">Фото 1 (заглушка)</div>
                <div className="gallery-item">Фото 2 (заглушка)</div>
                <div className="gallery-item">Фото 3 (заглушка)</div>
              </div>

              <div className="card">
                <div className="row" style={{justifyContent:"space-between", alignItems:"center"}}>
                  <div className="price">
                    {applied.currency === "USD"
                      ? `$${Math.round(detail.price_usd).toLocaleString()}`
                      : `${Number(detail.price_amd).toLocaleString()} AMD`}
                  </div>
                  <div className="pill">{detail.district}</div>
                </div>
                <div className="muted" style={{marginTop:6}}>
                  {detail.bedrooms}-комн • {detail.area_sqm} м² • эт. {detail.floor} {detail.is_new_building ? "• Новостройка" : ""}
                </div>
                <div className="row" style={{marginTop:10}}>
                  {detail.has_ac && <div className="pill">AC</div>}
                  {detail.has_wifi && <div className="pill">Wi-Fi</div>}
                  {detail.has_tv && <div className="pill">TV</div>}
                  {detail.has_fridge && <div className="pill">Холодильник</div>}
                  {detail.has_dishwasher && <div className="pill">ПММ</div>}
                  {detail.has_oven && <div className="pill">Духовка</div>}
                </div>
              </div>

              <div className="card">
                <div style={{fontWeight:600, marginBottom:6}}>Описание</div>
                <div className="muted">
                  {detail?.description ? detail.description : "Описание будет добавлено."}
                </div>
              </div>

              <div className="card">
                <div style={{fontWeight:600, marginBottom:6}}>Адрес и локация</div>
                <div className="muted">{detail.address || "Ереван"}</div>
                <div className="row" style={{marginTop:8}}>
                  <button
                    className="btn"
                    onClick={() =>
                      showOnMap({ id: detail.id, lat: detail.lat, lng: detail.lng, title: detail.title })
                    }
                  >
                    Показать на карте
                  </button>
                </div>
              </div>

              <div className="card">
                <div style={{fontWeight:600, marginBottom:6}}>Контакты</div>
                <div className="muted">Написать менеджеру (кнопка будет вести в бот)</div>
                <div className="row" style={{marginTop:8}}>
                  <button className="btn primary">Написать</button>
                  <button className="btn">Позвонить</button>
                </div>
              </div>
            </>
          ) : (
            <div className="card">Не удалось загрузить объект</div>
          )}
      </div>
      </div>
    )}

    {picking && (
      <div style={{
        position:"fixed", left:0, right:0, bottom:0, display:"flex", justifyContent:"center",
        padding:12, zIndex:200000
      }}>
        <div className="card" style={{display:"flex", gap:8, alignItems:"center"}}>
          <div className="muted">Точка: {form.lat || "—"}, {form.lng || "—"}</div>
          <button className="btn primary" onClick={() => setPicking(false)}>Поставить здесь</button>
          <button className="btn" onClick={() => {
            if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; }
            setForm((s)=>({ ...s, lat:"", lng:"" }));
            setPicking(false);
          }}>Отмена</button>
        </div>
      </div>
    )}
  </div>
);
}  // ← эта скобка закрывает export default function App() { ... }
