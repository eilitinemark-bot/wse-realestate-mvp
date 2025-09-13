import React, { useEffect, useMemo, useRef, useState } from "react";

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

  // ---------------- map ----------------
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markers = useRef([]);
  const markerById = useRef(new Map());

  // ---------------- preview & detail ----------------
  const [preview, setPreview] = useState(null); // объект для «предпросмотра»
  const [detailId, setDetailId] = useState(null); // id для детального экрана
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ---------------- admin ----------------
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState("dev123");
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
    photos: [],
  });
  const [edit, setEdit] = useState({
    id: "",
    price_amd: "",
    addPhotoUrl: "",
  });
  const fileInputRef = useRef(null);

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

  // -------- helpers for filters --------
  const buildParams = (state) => {
    const p = new URLSearchParams();
    (state.districts || []).forEach((d) => {
      if (d && d !== "Все районы") p.append("districts", d);
    });
    if (state.priceFrom) p.set("price_from", state.priceFrom);
    if (state.priceTo) p.set("price_to", state.priceTo);
    if (state.currency) p.set("currency", state.currency);
    if (state.bedrooms !== "") p.set("bedrooms", state.bedrooms);
    if (state.areaFrom) p.set("area_from", state.areaFrom);
    if (state.areaTo) p.set("area_to", state.areaTo);
    if (state.floorFrom) p.set("floor_from", state.floorFrom);
    if (state.floorTo) p.set("floor_to", state.floorTo);
    if (state.isNew !== "") p.set("is_new_building", state.isNew);
    if (state.ppsFrom) p.set("price_per_sqm_from", state.ppsFrom);
    if (state.ppsTo) p.set("price_per_sqm_to", state.ppsTo);
    if (state.hasAC) p.set("has_ac", "true");
    if (state.hasOven) p.set("has_oven", "true");
    if (state.hasDishwasher) p.set("has_dishwasher", "true");
    if (state.hasTV) p.set("has_tv", "true");
    if (state.hasWiFi) p.set("has_wifi", "true");
    if (state.hasMicrowave) p.set("has_microwave", "true");
    if (state.hasFridge) p.set("has_fridge", "true");
    if (state.isFurnished !== "") p.set("is_furnished", state.isFurnished);
    if (state.bathShower) p.set("bath_shower", "true");
    if (state.bathTub) p.set("bath_tub", "true");
    if (state.type) p.set("type", state.type);
    if (state.isHouseYard !== "") p.set("is_house_yard", state.isHouseYard);
    if (state.housePart) p.set("house_part", state.housePart);
    return p.toString();
  };

  const appliedQuery = useMemo(() => buildParams(applied), [applied]);

  // fetch списка
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/listings?${appliedQuery}`)
      .then((r) => r.json())
      .then((d) => {
        let arr = [...d];
        switch (sort) {
          case "price_asc":
            arr.sort((a, b) =>
              (applied.currency === "USD" ? a.price_usd : a.price_amd) -
              (applied.currency === "USD" ? b.price_usd : b.price_amd)
            );
            break;
          case "price_desc":
            arr.sort((a, b) =>
              (applied.currency === "USD" ? b.price_usd : b.price_amd) -
              (applied.currency === "USD" ? a.price_usd : a.price_amd)
            );
            break;
          case "area_asc":
            arr.sort((a, b) => a.area_sqm - b.area_sqm);
            break;
          case "area_desc":
            arr.sort((a, b) => b.area_sqm - a.area_sqm);
            break;
          case "newest":
          default:
            break;
        }
        setItems(arr);
        setTotal(arr.length || 0);
        setLoading(false);
        setPreview((p) => (p ? arr.find((x) => x.id === p.id) || p : null));
        setTimeout(() => renderMarkers(arr), 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
        setLoading(false);
        renderMarkers([]);
      });
  }, [appliedQuery, sort, applied.currency]);

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

  // предпросчёт количества для кнопки «Показать N объектов»
  useEffect(() => {
    if (!showFilters) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      const q = buildParams(draft);
      fetch(`${API}/api/listings?${q}`)
        .then((r) => r.json())
        .then((d) => setPreviewCount(d.length || 0))
        .catch(() => setPreviewCount(null));
    }, 250);
    return () => previewTimer.current && clearTimeout(previewTimer.current);
  }, [draft, showFilters]);

  // handlers
  const updateDraft = (patch) => setDraft((s) => ({ ...s, ...patch }));
  const onDistrictsChange = (e) => {
    const arr = Array.from(e.target.selectedOptions).map((o) => o.value);
    if (arr.includes("Все районы")) updateDraft({ districts: [] });
    else updateDraft({ districts: arr });
  };
  const resetDraft = () =>
    setDraft({
      ...draft,
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
  const applyDraft = () => {
    setApplied(draft);
    setShowFilters(false);
  };

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

  async function createListing() {
    const payload = {
      ...form,
      price_amd: Number(form.price_amd),
      bedrooms: Number(form.bedrooms),
      area_sqm: Number(form.area_sqm),
      floor: Number(form.floor),
      lat: Number(form.lat),
      lng: Number(form.lng),
      photos: form.photos || [],
    };
    const res = await fetch(`${API}/api/admin/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("Ошибка: " + (data?.detail || res.statusText));
      return;
    }
    alert("Создано: #" + data.id);
    setForm({
      title: "",
      district: "",
      price_amd: "",
      bedrooms: "",
      area_sqm: "",
      floor: "",
      lat: "",
      lng: "",
      type: "apartment",
      photos: [],
    });
    // обновим список
    const q = buildParams(applied);
    fetch(`${API}/api/listings?${q}`).then(r=>r.json()).then(setItems);
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
    const q = buildParams(applied);
    fetch(`${API}/api/listings?${q}`).then(r=>r.json()).then(setItems);
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
    const q = buildParams(applied);
    fetch(`${API}/api/listings?${q}`).then(r=>r.json()).then(setItems);
  }

  // -------- render ----------
  return (
    <div className="app">
      <style>{css}</style>

      <div className="mapWrap">
        <div className="topbar">
          <div className="logo">White Safe Estate</div>
          <div className="pill">Yerevan</div>
          <button className="btn" onClick={() => setShowAdmin(!showAdmin)}>⚙ Админ</button>
        </div>
        <div id="map" ref={mapRef}></div>
      </div>

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
          {showFilters && (
            <>
              <div className="filters">
                {/* DISTRICTS */}
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
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PRICE */}
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
                      updateDraft({
                        bedrooms:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">Любые</option>
                    <option value="0">Студия</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3+</option>
                  </select>
                </div>

                {/* AREA */}
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

                {/* FLOOR */}
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

                {/* NEW */}
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

                {/* PPS */}
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

                {/* Furniture */}
                <div className="field">
                  <label>Мебель</label>
                  <select
                    className="btn"
                    value={String(draft.isFurnished)}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateDraft({ isFurnished: v === "" ? "" : v === "true" });
                    }}
                  >
                    <option value="">Неважно</option>
                    <option value="true">Меблирована</option>
                    <option value="false">Без мебели</option>
                  </select>
                </div>

                {/* Bathroom */}
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.bathShower}
                    onChange={(e) => updateDraft({ bathShower: e.target.checked })}
                  />
                  &nbsp;Душ
                </label>
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.bathTub}
                    onChange={(e) => updateDraft({ bathTub: e.target.checked })}
                  />
                  &nbsp;Ванна
                </label>

                {/* Appliances */}
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.hasAC}
                    onChange={(e) => updateDraft({ hasAC: e.target.checked })}
                  />
                  &nbsp;Кондиционер
                </label>
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.hasOven}
                    onChange={(e) => updateDraft({ hasOven: e.target.checked })}
                  />
                  &nbsp;Духовой шкаф
                </label>
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.hasDishwasher}
                    onChange={(e) =>
                      updateDraft({ hasDishwasher: e.target.checked })
                    }
                  />
                  &nbsp;Посудомоечная
                </label>
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.hasTV}
                    onChange={(e) => updateDraft({ hasTV: e.target.checked })}
                  />
                  &nbsp;Телевизор
                </label>
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.hasWiFi}
                    onChange={(e) => updateDraft({ hasWiFi: e.target.checked })}
                  />
                  &nbsp;Wi-Fi
                </label>
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.hasMicrowave}
                    onChange={(e) =>
                      updateDraft({ hasMicrowave: e.target.checked })
                    }
                  />
                  &nbsp;Микроволновка
                </label>
                <label className="btn">
                  <input
                    type="checkbox"
                    checked={draft.hasFridge}
                    onChange={(e) => updateDraft({ hasFridge: e.target.checked })}
                  />
                  &nbsp;Холодильник
                </label>

                {/* Type / house */}
                <div className="field">
                  <label>Тип</label>
                  <select
                    className="btn"
                    value={draft.type}
                    onChange={(e) => updateDraft({ type: e.target.value })}
                  >
                    <option value="">Любой</option>
                    <option value="apartment">Квартира</option>
                    <option value="house">Дом</option>
                  </select>
                </div>

                <div className="field">
                  <label>Свой двор (для дома)</label>
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
              </div>

              <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                <button className="btn" onClick={resetDraft}>
                  Сбросить
                </button>
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
                    <button className="btn" onClick={() => setEdit((e)=>({...e, id: x.id}))}>Редакт.</button>
                    <button className="btn" onClick={() => deleteListing(x.id)}>Удалить</button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* ADMIN PANEL */}
          {showAdmin && (
            <div className="card" style={{ marginTop: 20 }}>
              <h3>Админ-панель</h3>

              <div className="field">
                <label>Admin Token</label>
                <input className="input" value={adminToken} onChange={e=>setAdminToken(e.target.value)} />
              </div>

              <hr style={{ margin: "12px 0", borderColor: "#e5e7eb" }}/>

              <div className="muted" style={{ marginBottom:8 }}>Создать объект</div>
              <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                {["title","district","price_amd","bedrooms","area_sqm","floor","lat","lng"].map(f=>(
                  <input key={f} className="input" placeholder={f} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/>
                ))}
                <select className="input" value={form.type} onChange={e=>setForm({...form, type: e.target.value})}>
                  <option value="apartment">apartment</option>
                  <option value="house">house</option>
                </select>
              </div>
              <div className="row" style={{ marginTop:8 }}>
                <input ref={fileInputRef} type="file" accept="image/*" className="input" />
                <button className="btn" onClick={async()=>{
                  const f = fileInputRef.current?.files?.[0];
                  if (!f) return;
                  try {
                    const url = await uploadPhoto(f);
                    setForm((s)=>({...s, photos: [...(s.photos||[]), url]}));
                    fileInputRef.current.value = "";
                  } catch(e){
                    alert("Upload error");
                  }
                }}>Загрузить фото</button>
              </div>
              <div className="muted" style={{marginTop:6}}>
                Фото: {(form.photos||[]).length ? form.photos.join(", ") : "нет"}
              </div>

              <div className="row" style={{ marginTop:10 }}>
                <button className="btn primary" onClick={createListing}>Создать</button>
              </div>

              <hr style={{ margin: "12px 0", borderColor: "#e5e7eb" }}/>

              <div className="muted" style={{ marginBottom:8 }}>Редактирование (упрощённо)</div>
              <div className="row" style={{ flexWrap:"wrap" }}>
                <input className="input" style={{minWidth:100}} placeholder="ID" value={edit.id} onChange={e=>setEdit({...edit, id: e.target.value})}/>
                <input className="input" placeholder="Новая цена AMD" value={edit.price_amd} onChange={e=>setEdit({...edit, price_amd: e.target.value})}/>
                <input className="input" placeholder="Добавить фото URL" value={edit.addPhotoUrl} onChange={e=>setEdit({...edit, addPhotoUrl: e.target.value})}/>
              </div>
              <div className="row" style={{ marginTop:8 }}>
                <button className="btn" onClick={updateListing}>Сохранить</button>
                <button className="btn" onClick={()=> { if(edit.id) deleteListing(edit.id); }}>Удалить по ID</button>
              </div>
            </div>
          )}
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
                {/* Галерея — пока заглушка */}
                <div className="gallery">
                  <div className="gallery-item">Фото 1 (заглушка)</div>
                  <div className="gallery-item">Фото 2 (заглушка)</div>
                  <div className="gallery-item">Фото 3 (заглушка)</div>
                </div>

                {/* Цена и краткие хар-ки */}
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

                {/* Описание */}
                <div className="card">
                  <div style={{fontWeight:600, marginBottom:6}}>Описание</div>
                  <div className="muted">
                    {detail?.description ? detail.description : "Описание будет добавлено."}
                  </div>
                </div>

                {/* Адрес и локация */}
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

                {/* Контакты */}
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
    </div>
  );
}

function pluralRu(n){
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return "ов";
  if (n1 > 1 && n1 < 5) return "а";
  if (n1 === 1) return "";
  return "ов";
}

const css = `
html, body, #root { height: 100%; margin: 0; }
body { font-family: -apple-system, system-ui, Segoe UI, Roboto, Arial, sans-serif; background: #f6f7f9; color:#0f172a; }
.app { display: grid; grid-template-columns: 1fr 460px; height: 100%; }
@media (max-width: 900px) { .app { grid-template-columns: 1fr; } .side { order:-1; height: 54%; position:relative; z-index:5; } .mapWrap{ height: 46%; } }
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
.leaflet-control {
  z-index: 0 !important;
}

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
