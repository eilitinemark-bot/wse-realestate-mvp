import React from "react";

export default function ListingFormStep3({ data, onChange }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
        Шаг 3: Описание
      </div>
      <div className="field">
        <label>Описание</label>
        <textarea
          className="btn"
          rows={4}
          placeholder="Краткое описание"
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
        />
      </div>
    </div>
  );
}

