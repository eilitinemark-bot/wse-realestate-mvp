import React from "react";
import "./admin.css";

export default function AdminPanel({
  adminToken,
  setAdminToken,
  form,
  setForm,
  DISTRICTS,
  setPicking,
  fileInputRef,
  uploadPhotos,
  createListing,
  loadMyListings,
  showMy,
  setShowMy,
  myListings,
  openDetail,
  deleteListing,
  creating,
  esc,
}) {
  return (
    <div className="admin-panel">
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Админ-панель</div>

        <div className="field">
          <label>Admin Token</label>
          <input className="btn" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "12px 0" }} />

        {/* Основные поля */}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            className="btn"
            placeholder="Заголовок"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ flex: "1 1 260px" }}
          />
          <select
            className="btn"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            style={{ flex: "1 1 200px" }}
          >
            <option value="" disabled>
              Район (Kentron/...)
            </option>
            {DISTRICTS.filter((d) => d.value).map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select className="btn" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="apartment">Квартира</option>
            <option value="house">Дом</option>
          </select>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input
            className="btn"
            placeholder="Цена AMD"
            type="number"
            value={form.price_amd}
            onChange={(e) => setForm({ ...form, price_amd: e.target.value })}
          />
          <input
            className="btn"
            placeholder="Спальни"
            type="number"
            value={form.bedrooms}
            onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
          />
          <input
            className="btn"
            placeholder="Площадь м²"
            type="number"
            value={form.area_sqm}
            onChange={(e) => setForm({ ...form, area_sqm: e.target.value })}
          />
          <input
            className="btn"
            placeholder="Этаж"
            type="number"
            value={form.floor}
            onChange={(e) => setForm({ ...form, floor: e.target.value })}
            disabled={form.type === "house"}
          />
        </div>

        {/* Описание */}
        <div className="field" style={{ marginTop: 8 }}>
          <label>Описание</label>
          <textarea
            className="btn"
            rows={3}
            placeholder="Краткое описание"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Удобства */}
        <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.has_ac}
              onChange={(e) => setForm({ ...form, has_ac: e.target.checked })}
            />
            &nbsp;Кондиционер
          </label>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.has_wifi}
              onChange={(e) => setForm({ ...form, has_wifi: e.target.checked })}
            />
            &nbsp;Wi-Fi
          </label>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.has_tv}
              onChange={(e) => setForm({ ...form, has_tv: e.target.checked })}
            />
            &nbsp;TV
          </label>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.has_fridge}
              onChange={(e) => setForm({ ...form, has_fridge: e.target.checked })}
            />
            &nbsp;Холодильник
          </label>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.has_dishwasher}
              onChange={(e) => setForm({ ...form, has_dishwasher: e.target.checked })}
            />
            &nbsp;Посудомоечная
          </label>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.has_oven}
              onChange={(e) => setForm({ ...form, has_oven: e.target.checked })}
            />
            &nbsp;Духовка
          </label>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.has_microwave}
              onChange={(e) => setForm({ ...form, has_microwave: e.target.checked })}
            />
            &nbsp;Микроволновка
          </label>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.bath_shower}
              onChange={(e) => setForm({ ...form, bath_shower: e.target.checked })}
            />
            &nbsp;Душ
          </label>
          <label className="btn">
            <input
              type="checkbox"
              checked={!!form.bath_tub}
              onChange={(e) => setForm({ ...form, bath_tub: e.target.checked })}
            />
            &nbsp;Ванна
          </label>
          <div className="field" style={{ minWidth: 160 }}>
            <label>Мебель</label>
            <select
              className="btn"
              value={String(form.is_furnished || "")}
              onChange={(e) =>
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
              <input
                type="checkbox"
                checked={String(form.is_new_building) === "true"}
                onChange={(e) => setForm({ ...form, is_new_building: e.target.checked })}
              />
              &nbsp;Новостройка
            </label>
          </div>
        )}
        {form.type === "house" && (
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <label className="btn">
              <input
                type="checkbox"
                checked={String(form.is_house_yard) === "true"}
                onChange={(e) => setForm({ ...form, is_house_yard: e.target.checked })}
              />
              &nbsp;Свой двор
            </label>
            <select
              className="btn"
              value={form.house_part || ""}
              onChange={(e) => setForm({ ...form, house_part: e.target.value })}
            >
              <option value="">Дом полностью/часть</option>
              <option value="full">Полностью</option>
              <option value="part">Часть дома</option>
            </select>
          </div>
        )}

        {/* Координаты: выбрать на карте */}
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input
            className="btn"
            placeholder="lat"
            type="number"
            step="0.000001"
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: e.target.value })}
          />
          <input
            className="btn"
            placeholder="lng"
            type="number"
            step="0.000001"
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: e.target.value })}
          />
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
    </div>
  );
}

