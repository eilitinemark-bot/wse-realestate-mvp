from fastapi import FastAPI, Query, UploadFile, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Literal
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base, Session
from sqlalchemy.sql import func
import os, json

# === config ===
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wse.sqlite3")
engine = create_engine(DATABASE_URL, future=True)

ADMIN_TOKENS = [t.strip() for t in os.getenv("ADMIN_TOKENS", os.getenv("ADMIN_TOKEN", "dev123")).split(",") if t.strip()]
USD_RATE = float(os.getenv("CURRENCY_USD_RATE", "390.0"))

Base = declarative_base()

class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    district = Column(String, index=True)
    price_amd = Column(Integer, index=True)
    price_usd = Column(Float, index=True)
    bedrooms = Column(Integer, index=True)
    area_sqm = Column(Float, index=True)
    floor = Column(Integer, index=True)
    is_new_building = Column(Boolean, default=False, index=True)
    has_ac = Column(Boolean, default=False, index=True)
    has_oven = Column(Boolean, default=False, index=True)
    has_dishwasher = Column(Boolean, default=False, index=True)
    has_tv = Column(Boolean, default=False, index=True)
    has_wifi = Column(Boolean, default=False, index=True)
    has_microwave = Column(Boolean, default=False, index=True)
    has_fridge = Column(Boolean, default=False, index=True)
    is_furnished = Column(Boolean, default=True, index=True)
    bath_shower = Column(Boolean, default=True, index=True)
    bath_tub = Column(Boolean, default=False, index=True)
    type = Column(String, default="apartment", index=True)  # apartment|house
    is_house_yard = Column(Boolean, default=False, index=True)
    house_part = Column(String, default="full")             # full|part
    admin_token = Column(String, index=True)
    lat = Column(Float)
    lng = Column(Float)
    price_per_sqm = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    photos_json = Column(Text, default="[]")  # JSON-строка с массивом фото

Base.metadata.create_all(engine)

# --- сидим тестовые данные ---
def seed():
    with Session(engine) as s:
        if s.query(Listing).count() > 0:
            return
        demo = [
            dict(title="Квартира в Кентроне", district="Kentron", price_amd=450000, price_usd=1150, bedrooms=1,
                 area_sqm=55, floor=5, is_new_building=True, has_ac=True, has_wifi=True, has_tv=True,
                 lat=40.179, lng=44.499, price_per_sqm=450000/55,
                 photos_json=json.dumps(["/uploads/demo.jpg"])),
            dict(title="2к в Арабкире", district="Arabkir", price_amd=700000, price_usd=1800, bedrooms=2,
                 area_sqm=85, floor=8, is_new_building=False, has_ac=True, has_oven=True, has_fridge=True,
                 lat=40.205, lng=44.490, price_per_sqm=700000/85,
                 photos_json=json.dumps(["/uploads/demo2.jpg"])),
            dict(title="Дом с двором в Аджапняке", district="Ajapnyak", price_amd=900000, price_usd=2300, bedrooms=3,
                 area_sqm=120, floor=1, type="house", is_house_yard=True, is_new_building=False, has_wifi=True,
                 lat=40.206, lng=44.452, price_per_sqm=900000/120,
                 photos_json=json.dumps([])),
        ]
        for d in demo:
            s.add(Listing(**d))
        s.commit()
seed()

class ListingOut(BaseModel):
    id: int
    title: str
    district: str
    price_amd: int
    price_usd: float
    bedrooms: int
    area_sqm: float
    floor: int
    is_new_building: bool
    has_ac: bool
    has_oven: bool
    has_dishwasher: bool
    has_tv: bool
    has_wifi: bool
    has_microwave: bool
    has_fridge: bool
    is_furnished: bool
    bath_shower: bool
    bath_tub: bool
    type: Literal["apartment","house"]
    is_house_yard: bool
    house_part: str
    lat: float
    lng: float
    price_per_sqm: float
    photos: List[str] = []
    class Config:
        from_attributes = True

# входные модели для админки
class ListingIn(BaseModel):
    title: str
    district: str
    price_amd: int
    bedrooms: int
    area_sqm: float
    floor: int
    type: Literal["apartment","house"] = "apartment"
    is_new_building: bool = False
    lat: float
    lng: float
    has_ac: bool = False
    has_oven: bool = False
    has_dishwasher: bool = False
    has_tv: bool = False
    has_wifi: bool = False
    has_microwave: bool = False
    has_fridge: bool = False
    is_furnished: bool = True
    bath_shower: bool = True
    bath_tub: bool = False
    is_house_yard: bool = False
    house_part: str = "full"
    price_usd: Optional[float] = None
    photos: List[str] = []

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    district: Optional[str] = None
    price_amd: Optional[int] = None
    price_usd: Optional[float] = None
    bedrooms: Optional[int] = None
    area_sqm: Optional[float] = None
    floor: Optional[int] = None
    type: Optional[Literal["apartment","house"]] = None
    is_new_building: Optional[bool] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    has_ac: Optional[bool] = None
    has_oven: Optional[bool] = None
    has_dishwasher: Optional[bool] = None
    has_tv: Optional[bool] = None
    has_wifi: Optional[bool] = None
    has_microwave: Optional[bool] = None
    has_fridge: Optional[bool] = None
    is_furnished: Optional[bool] = None
    bath_shower: Optional[bool] = None
    bath_tub: Optional[bool] = None
    is_house_yard: Optional[bool] = None
    house_part: Optional[str] = None
    photos: Optional[List[str]] = None

app = FastAPI(title="WSE API", version="0.1.0")

# --- статика и CORS ---
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- admin helper ---
def ensure_admin(request: Request) -> str:
    token = request.headers.get("X-Admin-Token")
    if not token or token not in ADMIN_TOKENS:
        raise HTTPException(401, "Unauthorized")
    return token

# --- healthcheck ---
@app.get("/api/ping")
def ping():
    return {"ok": True}

# --- список квартир ---
@app.get("/api/listings", response_model=list[ListingOut])
def search(
    districts: Optional[List[str]] = Query(None),
    price_from: Optional[int] = None,
    price_to: Optional[int] = None,
    currency: Literal["AMD","USD"] = "AMD",
    bedrooms: Optional[int] = None,
    area_from: Optional[float] = None,
    area_to: Optional[float] = None,
    floor_from: Optional[int] = None,
    floor_to: Optional[int] = None,
    is_new_building: Optional[bool] = None,
    price_per_sqm_from: Optional[float] = None,
    price_per_sqm_to: Optional[float] = None,
    has_ac: Optional[bool] = None,
    has_oven: Optional[bool] = None,
    has_dishwasher: Optional[bool] = None,
    has_tv: Optional[bool] = None,
    has_wifi: Optional[bool] = None,
    has_microwave: Optional[bool] = None,
    has_fridge: Optional[bool] = None,
    is_furnished: Optional[bool] = None,
    bath_shower: Optional[bool] = None,
    bath_tub: Optional[bool] = None,
    type: Optional[str] = None,
    is_house_yard: Optional[bool] = None,
    house_part: Optional[str] = None,
):
    with Session(engine) as s:
        q = s.query(Listing)
        # … все фильтры как раньше …
        rows = q.order_by(Listing.created_at.desc()).all()
        out = [ListingOut.model_validate(r).model_dump() for r in rows]
        for i, r in enumerate(rows):
            out[i]["photos"] = json.loads(r.photos_json or "[]")
        return out
    with Session(engine) as s:
        q = s.query(Listing)
        # фильтры как у тебя
        rows = q.order_by(Listing.created_at.desc()).all()
        out = [ListingOut.model_validate(r).model_dump() for r in rows]
        for i, r in enumerate(rows):
            out[i]["photos"] = json.loads(r.photos_json or "[]")
        return out

# --- детальная карточка ---
@app.get("/api/listings/{lid}", response_model=ListingOut)
def get_one(lid: int):
    with Session(engine) as s:
        row = s.get(Listing, lid)
        if not row:
            raise HTTPException(404, "Not found")
        item = ListingOut.model_validate(row).model_dump()
        item["photos"] = json.loads(row.photos_json or "[]")
        return item

# --- загрузка файлов ---
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    filename = file.filename
    base, ext = os.path.splitext(filename)
    i = 1
    save_path = os.path.join("uploads", filename)
    while os.path.exists(save_path):
        filename = f"{base}_{i}{ext}"
        save_path = os.path.join("uploads", filename)
        i += 1
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{filename}"}

# --- ADMIN CRUD ---
@app.post("/api/admin/listings", response_model=ListingOut)
def admin_create_listing(payload: ListingIn, request: Request):
    token = ensure_admin(request)
    price_usd = payload.price_usd if payload.price_usd else round(payload.price_amd / USD_RATE, 2)
    price_per_sqm = round(payload.price_amd / payload.area_sqm, 2)
    with Session(engine) as s:
        row = Listing(**payload.model_dump(exclude={"photos"}),
                      price_usd=price_usd,
                      price_per_sqm=price_per_sqm,
                      admin_token=token,
                      photos_json=json.dumps(payload.photos or []))
        s.add(row)
        s.commit()
        s.refresh(row)
        item = ListingOut.model_validate(row).model_dump()
        item["photos"] = json.loads(row.photos_json or "[]")
        return item

@app.put("/api/admin/listings/{lid}", response_model=ListingOut)
def admin_update_listing(lid: int, payload: ListingUpdate, request: Request):
    token = ensure_admin(request)
    with Session(engine) as s:
        row = s.get(Listing, lid)
        if not row:
            raise HTTPException(404, "Not found")
        if row.admin_token and row.admin_token != token:
            raise HTTPException(403, "Forbidden")
        data = payload.model_dump(exclude_unset=True)
        if "price_amd" in data and ("area_sqm" in data or row.area_sqm):
            area = data.get("area_sqm", row.area_sqm)
            if area:
                row.price_per_sqm = round(data["price_amd"] / area, 2)
        if "price_amd" in data and "price_usd" not in data:
            row.price_usd = round(data["price_amd"] / USD_RATE, 2)
        for k, v in data.items():
            if k == "photos" and v is not None:
                row.photos_json = json.dumps(v)
            elif hasattr(row, k):
                setattr(row, k, v)
        s.commit()
        s.refresh(row)
        item = ListingOut.model_validate(row).model_dump()
        item["photos"] = json.loads(row.photos_json or "[]")
        return item

@app.delete("/api/admin/listings/{lid}")
def admin_delete_listing(lid: int, request: Request):
    token = ensure_admin(request)
    with Session(engine) as s:
        row = s.get(Listing, lid)
        if not row:
            return {"ok": True}
        if row.admin_token and row.admin_token != token:
            raise HTTPException(403, "Forbidden")
        s.delete(row)
        s.commit()
        return {"ok": True}

@app.get("/api/admin/my-listings", response_model=list[ListingOut])
def admin_my_listings(request: Request):
    token = ensure_admin(request)
    with Session(engine) as s:
        rows = s.query(Listing).filter(Listing.admin_token == token).order_by(Listing.created_at.desc()).all()
        out = [ListingOut.model_validate(r).model_dump() for r in rows]
        for i, r in enumerate(rows):
            out[i]["photos"] = json.loads(r.photos_json or "[]")
        return out
