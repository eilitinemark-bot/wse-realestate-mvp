import React from "react";

export default function ListingFormStep1({ data, onChange, errors = {} }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
        Шаг 1: Основное
      </div>
      <div className="field">
        <label>Заголовок</label>
        <input
          className="btn"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
        />
        {errors.title && (
          <div style={{ color: "red", fontSize: 12 }}>{errors.title}</div>
        )}
      </div>
      <div className="field">
        <label>Район</label>
        <input
          className="btn"
          value={data.district}
          onChange={(e) => onChange({ ...data, district: e.target.value })}
        />
        {errors.district && (
          <div style={{ color: "red", fontSize: 12 }}>{errors.district}</div>
        )}
      </div>
      <div className="field">
        <label>Тип</label>
        <select
          className="btn"
          value={data.type}
          onChange={(e) => onChange({ ...data, type: e.target.value })}
        >
          <option value="apartment">Квартира</option>
          <option value="house">Дом</option>
        </select>
      </div>
    </div>
  );
}

