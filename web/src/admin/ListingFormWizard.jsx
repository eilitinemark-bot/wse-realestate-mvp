import React, { useState } from "react";
import ListingFormStep1 from "./ListingFormStep1.jsx";
import ListingFormStep2 from "./ListingFormStep2.jsx";
import ListingFormStep3 from "./ListingFormStep3.jsx";

export default function ListingFormWizard({ onClose, onSubmit }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    title: "",
    district: "",
    type: "apartment",
    price_amd: "",
    bedrooms: "",
    area_sqm: "",
    floor: "",
    description: "",
  });
  const [errors, setErrors] = useState({});

  const steps = [
    {
      component: ListingFormStep1,
      validate: (d) => {
        const e = {};
        if (!d.title.trim()) e.title = "Укажите заголовок";
        if (!d.district.trim()) e.district = "Укажите район";
        return e;
      },
    },
    {
      component: ListingFormStep2,
      validate: (d) => {
        const e = {};
        if (!d.price_amd) e.price_amd = "Цена обязательна";
        if (!d.bedrooms) e.bedrooms = "Укажите спальни";
        if (!d.area_sqm) e.area_sqm = "Укажите площадь";
        if (d.type === "apartment" && !d.floor) e.floor = "Укажите этаж";
        return e;
      },
    },
    { component: ListingFormStep3, validate: () => ({}) },
  ];

  const Current = steps[step].component;

  function next() {
    const e = steps[step].validate(draft);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function prev() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function finish() {
    const e = steps[step].validate(draft);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSubmit?.(draft);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 600 }}>
        <Current data={draft} onChange={setDraft} errors={errors} />
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          {step > 0 && (
            <button className="btn" onClick={prev}>
              Назад
            </button>
          )}
          {step < steps.length - 1 && (
            <button className="btn primary" onClick={next}>
              Далее
            </button>
          )}
          {step === steps.length - 1 && (
            <button className="btn primary" onClick={finish}>
              Сохранить
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

