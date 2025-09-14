import React from "react";

export default function ListingFormStep2({ data, onChange, errors = {} }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
        Шаг 2: Детали
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <input
          className="btn"
          placeholder="Цена AMD"
          type="number"
          value={data.price_amd}
          onChange={(e) => onChange({ ...data, price_amd: e.target.value })}
        />
        <input
          className="btn"
          placeholder="Спальни"
          type="number"
          value={data.bedrooms}
          onChange={(e) => onChange({ ...data, bedrooms: e.target.value })}
        />
        <input
          className="btn"
          placeholder="Площадь м²"
          type="number"
          value={data.area_sqm}
          onChange={(e) => onChange({ ...data, area_sqm: e.target.value })}
        />
        <input
          className="btn"
          placeholder="Этаж"
          type="number"
          value={data.floor}
          onChange={(e) => onChange({ ...data, floor: e.target.value })}
          disabled={data.type === "house"}
        />
      </div>
      <div>
        {errors.price_amd && (
          <div style={{ color: "red", fontSize: 12 }}>{errors.price_amd}</div>
        )}
        {errors.bedrooms && (
          <div style={{ color: "red", fontSize: 12 }}>{errors.bedrooms}</div>
        )}
        {errors.area_sqm && (
          <div style={{ color: "red", fontSize: 12 }}>{errors.area_sqm}</div>
        )}
        {errors.floor && (
          <div style={{ color: "red", fontSize: 12 }}>{errors.floor}</div>
        )}
      </div>
    </div>
  );
}

