# ============================================================
# LeakWatch — FastAPI Backend
# File: backend/main.py
# ============================================================

from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
import uvicorn

from routers import scans, payments, auth, reports
from middleware.rate_limit import RateLimitMiddleware
from database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown — cleanup tasks here

app = FastAPI(
    title="LeakWatch API",
    description="Credential Exposure Intelligence Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://leakwatch.io", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router,     prefix="/api/v1", tags=["Auth"])
app.include_router(scans.router,    prefix="/api/v1", tags=["Scans"])
app.include_router(payments.router, prefix="/api/v1", tags=["Payments"])
app.include_router(reports.router,  prefix="/api/v1", tags=["Reports"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


# ============================================================
# File: backend/database.py
# ============================================================
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/leakwatch")

engine = create_async_engine(DATABASE_URL, echo=False, pool_size=10, max_overflow=20)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
"""


# ============================================================
# File: backend/models/scan.py
# ============================================================
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email         = Column(String(255), unique=True, nullable=False)
    api_key_hash  = Column(String(64), unique=True)
    tier          = Column(Enum("free","developer","enterprise"), default="free")
    scans_used    = Column(Integer, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)
    scans         = relationship("Scan", back_populates="user")

class Scan(Base):
    __tablename__ = "scans"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    target        = Column(String(512), nullable=False)
    scan_type     = Column(Enum("email","domain"), nullable=False)
    status        = Column(Enum("queued","running","completed","failed"), default="queued")
    depth         = Column(Enum("preview","full"), default="preview")
    ip_address    = Column(String(45))
    created_at    = Column(DateTime, default=datetime.utcnow)
    completed_at  = Column(DateTime, nullable=True)
    result        = relationship("ScanResult", back_populates="scan", uselist=False)
    user          = relationship("User", back_populates="scans")

class ScanResult(Base):
    __tablename__ = "scan_results"
    id                       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id                  = Column(UUID(as_uuid=True), ForeignKey("scans.id"), unique=True)
    risk_score               = Column(Integer)  # 0–100
    risk_level               = Column(Enum("low","medium","high","critical"))
    total_exposures          = Column(Integer, default=0)
    password_reuse_prob      = Column(Float, default=0.0)
    first_breach_date        = Column(String(20))
    latest_breach_date       = Column(String(20))
    breaches                 = Column(JSON)   # list of breach objects
    recommendations          = Column(JSON)   # list of strings
    created_at               = Column(DateTime, default=datetime.utcnow)
    scan                     = relationship("Scan", back_populates="result")

class Payment(Base):
    __tablename__ = "payments"
    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id             = Column(UUID(as_uuid=True), ForeignKey("scans.id"))
    provider_id         = Column(String(128), unique=True)  # NOWPayments payment_id
    currency            = Column(String(10))    # BTC|ETH|USDT
    amount_crypto       = Column(String(32))
    amount_usd          = Column(Float)
    status              = Column(Enum("pending","confirmed","expired","refunded"), default="pending")
    wallet_address      = Column(String(256))
    tx_hash             = Column(String(128), nullable=True)
    access_token_hash   = Column(String(64), nullable=True)  # SHA-256 of raw token
    created_at          = Column(DateTime, default=datetime.utcnow)
    confirmed_at        = Column(DateTime, nullable=True)
    expires_at          = Column(DateTime)
"""


# ============================================================
# File: backend/routers/scans.py
# ============================================================
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
import re, uuid
from database import get_db
from services.scan_engine import ScanEngine
from services.captcha import verify_captcha
from middleware.rate_limit import scan_rate_limit

router = APIRouter()
engine = ScanEngine()

class ScanRequest(BaseModel):
    target: str
    type: str               # "email" | "domain"
    depth: str = "preview"  # "preview" | "full"
    captcha_token: str
    access_token: Optional[str] = None  # for full scan unlock

    @validator("target")
    def validate_target(cls, v, values):
        t = values.get("type", "email")
        if t == "email":
            if not re.match(r'^[\w\.\+\-]+@[\w\-]+\.[\w\.]+$', v):
                raise ValueError("Invalid email address")
        elif t == "domain":
            if not re.match(r'^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$', v):
                raise ValueError("Invalid domain name")
        return v.lower().strip()

@router.post("/scan")
async def create_scan(
    req: ScanRequest,
    background: BackgroundTasks,
    request: Request,
    db=Depends(get_db)
):
    # Verify captcha
    if not await verify_captcha(req.captcha_token):
        raise HTTPException(status_code=400, detail="Captcha verification failed")

    # Create scan record
    scan_id = str(uuid.uuid4())
    # await db.execute(INSERT scan...)

    # Queue background task
    background.add_task(engine.run_scan, scan_id, req.target, req.type, req.depth)

    return {
        "scan_id": scan_id,
        "status": "queued",
        "target": req.target,
        "estimated_seconds": 8,
        "created_at": "2024-11-20T14:32:00Z"
    }

@router.get("/scan-result/{scan_id}")
async def get_scan_result(
    scan_id: str,
    access_token: Optional[str] = None,
    db=Depends(get_db)
):
    # Fetch scan from DB
    # scan = await db.execute(SELECT scan WHERE id = scan_id)
    # if not scan: raise HTTPException(404)

    # Check if full access granted
    is_full_access = False
    if access_token:
        # Verify token against payments table
        token_hash = hashlib.sha256(access_token.encode()).hexdigest()
        # payment = await db.execute(SELECT payment WHERE access_token_hash = token_hash)
        # is_full_access = payment and payment.status == "confirmed"
        is_full_access = True  # simplified

    # Return appropriate depth
    result = {
        "scan_id": scan_id,
        "status": "completed",
        "risk_score": 82,
        "risk_level": "critical",
        "total_exposures": 4,
        "password_reuse_probability": 0.73,
        "first_breach": "2016-08-31",
        "latest_breach": "2021-06-22",
        "breaches": [
            {
                "service": "LinkedIn",
                "date": "2021-06-22",
                "severity": "critical",
                "records_affected": 700_000_000,
                "data_types": ["email", "phone", "address"],
            },
            {
                "service": "Adobe",
                "date": "2020-10-15",
                "severity": "high",
                "records_affected": 153_000_000,
                "data_types": ["email", "password_hash"],
            },
        ] + ([
            {"service": "Dropbox", "date": "2016-08-31", "severity": "high",
             "data_types": ["email", "bcrypt_hash"], "locked": False},
            {"service": "Canva",   "date": "2019-05-24", "severity": "medium",
             "data_types": ["email", "username"], "locked": False},
        ] if is_full_access else [
            {"locked": True, "count": 2}
        ]),
        "recommendations": [
            "Change all passwords on breached services immediately",
            "Enable 2FA on all accounts using this email",
            "Use a password manager to avoid credential reuse",
            "Monitor financial accounts for unauthorized access",
        ] if is_full_access else ["Change passwords immediately"],
    }
    return result
"""


# ============================================================
# File: backend/routers/payments.py
# ============================================================
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import httpx, hmac, hashlib, os, secrets
from datetime import datetime, timedelta

router = APIRouter()
NOWPAYMENTS_KEY    = os.getenv("NOWPAYMENTS_API_KEY")
NOWPAYMENTS_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET")

PRICES = {
    "single":      4.99,
    "domain_pack": 19.99,
    "api_access":  79.00,
}

class PaymentRequest(BaseModel):
    scan_id:  str
    currency: str    # BTC | ETH | USDT
    tier:     str = "single"

@router.post("/payment")
async def create_payment(req: PaymentRequest):
    usd = PRICES.get(req.tier, 4.99)
    currency_map = {"BTC":"btc","ETH":"eth","USDT":"usdterc20"}
    pay_currency = currency_map.get(req.currency, "eth")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.nowpayments.io/v1/payment",
            headers={"x-api-key": NOWPAYMENTS_KEY, "Content-Type": "application/json"},
            json={
                "price_amount":   usd,
                "price_currency": "usd",
                "pay_currency":   pay_currency,
                "order_id":       req.scan_id,
                "order_description": f"LeakWatch {req.tier} scan unlock",
                "ipn_callback_url": os.getenv("WEBHOOK_URL"),
            }
        )
    data = resp.json()
    if resp.status_code != 201:
        raise HTTPException(status_code=502, detail="Payment provider error")

    # Store payment in DB...
    return {
        "payment_id":    data["payment_id"],
        "status":        "pending",
        "currency":      req.currency,
        "amount":        str(data["pay_amount"]),
        "usd_amount":    usd,
        "wallet_address": data["pay_address"],
        "qr_code_url":   f"https://api.leakwatch.io/qr/{data['payment_id']}",
        "expires_at":    (datetime.utcnow() + timedelta(minutes=20)).isoformat() + "Z",
    }

@router.post("/payment/webhook")
async def payment_webhook(request: Request):
    ''' NOWPayments IPN webhook — fires on payment confirmation '''
    body      = await request.body()
    signature = request.headers.get("x-nowpayments-sig", "")

    # Verify HMAC-SHA512
    expected = hmac.new(
        NOWPAYMENTS_SECRET.encode(), body, hashlib.sha512
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()
    if data.get("payment_status") == "confirmed":
        # Mint one-time access token
        raw_token  = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        # Update payment in DB: status=confirmed, access_token_hash=token_hash
        # Notify frontend via webhook/SSE/email
        return {"status": "processed", "token": raw_token}  # send to user

    return {"status": "received"}

@router.get("/payment/{payment_id}")
async def get_payment_status(payment_id: str):
    # In production: query NOWPayments API + local DB
    return {
        "payment_id":   payment_id,
        "status":       "confirmed",
        "tx_hash":      "0xabc123...",
        "confirmed_at": datetime.utcnow().isoformat() + "Z",
        "access_token": "lw_at_Xk9mP2nQ7rT4",
        "expires_at":   (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z",
    }
"""


# ============================================================
# File: backend/services/scan_engine.py
# ============================================================
"""
import asyncio, httpx, os, re
from typing import Optional, List, Dict
from datetime import datetime

HIBP_API_KEY   = os.getenv("HIBP_API_KEY")
DEHASHED_KEY   = os.getenv("DEHASHED_API_KEY")
DEHASHED_EMAIL = os.getenv("DEHASHED_EMAIL")

class ScanEngine:
    
    async def run_scan(self, scan_id: str, target: str, scan_type: str, depth: str):
        ''' Main scan orchestrator — runs all sub-engines in parallel '''
        results = await asyncio.gather(
            self.check_hibp(target),
            self.check_dehashed(target, scan_type),
            self.check_email_reputation(target) if scan_type == "email" else self.check_domain_mxcheck(target),
            return_exceptions=True,
        )
        breaches   = self._merge_breaches(results)
        risk_score = self._compute_risk_score(breaches)
        reuse_prob = self._estimate_password_reuse(breaches)

        # Save to DB scan_results table
        # await db.execute(INSERT scan_result ...)
        return {
            "scan_id":   scan_id,
            "status":    "completed",
            "risk_score": risk_score,
            "breaches":   breaches,
            "password_reuse_probability": reuse_prob,
        }

    async def check_hibp(self, email: str) -> List[Dict]:
        ''' HaveIBeenPwned API v3 '''
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}",
                headers={
                    "hibp-api-key": HIBP_API_KEY,
                    "user-agent": "LeakWatch/1.0",
                },
                params={"truncateResponse": "false"},
            )
        if resp.status_code == 404:
            return []
        if resp.status_code != 200:
            raise Exception(f"HIBP error {resp.status_code}")
        
        raw = resp.json()
        return [{
            "service":          b["Name"],
            "date":             b["BreachDate"],
            "severity":         self._hibp_severity(b),
            "records_affected": b["PwnCount"],
            "data_types":       [d.lower().replace(" ","_") for d in b["DataClasses"]],
            "description":      b.get("Description",""),
            "source":           "hibp",
            "is_verified":      b.get("IsVerified", True),
        } for b in raw]

    async def check_dehashed(self, target: str, scan_type: str) -> List[Dict]:
        ''' DeHashed credential database '''
        query = f"email:{target}" if scan_type == "email" else f"domain:{target}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.dehashed.com/search",
                auth=(DEHASHED_EMAIL, DEHASHED_KEY),
                params={"query": query, "size": 10000},
                headers={"Accept": "application/json"},
            )
        if resp.status_code != 200:
            return []
        data = resp.json()
        # Process and normalize DeHashed entries
        seen = set()
        breaches = []
        for entry in data.get("entries", []):
            db_name = entry.get("database_name","Unknown")
            if db_name in seen:
                continue
            seen.add(db_name)
            breaches.append({
                "service":    db_name,
                "date":       entry.get("obtained_from","Unknown"),
                "severity":   "high" if entry.get("password") else "medium",
                "data_types": self._deduce_data_types(entry),
                "source":     "dehashed",
                "has_plaintext_pw": bool(entry.get("password")),
            })
        return breaches

    async def check_email_reputation(self, email: str) -> Dict:
        ''' Check email reputation via emailrep.io '''
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://emailrep.io/{email}",
                headers={"User-Agent": "LeakWatch/1.0"}
            )
        if resp.status_code != 200:
            return {}
        data = resp.json()
        return {
            "spam_score":    data.get("reputation", "unknown"),
            "suspicious":    data.get("suspicious", False),
            "malicious":     data.get("references", 0) > 5,
            "profiles":      data.get("details", {}).get("profiles", []),
        }

    async def check_domain_mxcheck(self, domain: str) -> Dict:
        ''' DNS / MX lookup for domain scans '''
        import dns.resolver
        try:
            mx = dns.resolver.resolve(domain, 'MX')
            return {"mx_records": [str(r.exchange) for r in mx]}
        except Exception:
            return {"mx_records": []}

    def _hibp_severity(self, breach: dict) -> str:
        count = breach.get("PwnCount", 0)
        dc    = breach.get("DataClasses", [])
        if "Passwords" in dc or count > 100_000_000:
            return "critical"
        elif count > 10_000_000 or "Email addresses" in dc:
            return "high"
        elif count > 1_000_000:
            return "medium"
        return "low"

    def _merge_breaches(self, results: list) -> list:
        all_breaches, seen = [], set()
        for r in results:
            if isinstance(r, list):
                for b in r:
                    key = b.get("service","").lower()
                    if key not in seen:
                        seen.add(key)
                        all_breaches.append(b)
        return sorted(all_breaches, key=lambda x: x.get("date",""), reverse=True)

    def _compute_risk_score(self, breaches: list) -> int:
        if not breaches: return 0
        score = 0
        weights = {"critical": 30, "high": 20, "medium": 10, "low": 5}
        for b in breaches:
            score += weights.get(b.get("severity","low"), 5)
            if b.get("has_plaintext_pw"):
                score += 15
        return min(score, 100)

    def _estimate_password_reuse(self, breaches: list) -> float:
        if len(breaches) >= 4: return 0.73
        if len(breaches) >= 2: return 0.45
        if len(breaches) == 1: return 0.25
        return 0.0

    def _deduce_data_types(self, entry: dict) -> list:
        types = []
        if entry.get("email"):    types.append("email")
        if entry.get("password"): types.append("password_plaintext")
        if entry.get("hashed_password"): types.append("password_hash")
        if entry.get("username"): types.append("username")
        if entry.get("phone"):    types.append("phone")
        if entry.get("address"):  types.append("address")
        return types or ["unknown"]
"""


# ============================================================
# File: backend/middleware/rate_limit.py
# ============================================================
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import redis.asyncio as redis
import time, os

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.rpm = requests_per_minute

    async def dispatch(self, request, call_next):
        ip  = request.client.host
        key = f"ratelimit:{ip}:{int(time.time() // 60)}"
        count = await redis_client.incr(key)
        await redis_client.expire(key, 60)
        
        if count > self.rpm:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please slow down."},
                headers={"Retry-After": "60"}
            )
        
        # Extra strict limit for /scan endpoint
        if "/scan" in request.url.path and request.method == "POST":
            scan_key = f"scanlimit:{ip}:{int(time.time() // 3600)}"
            scan_count = await redis_client.incr(scan_key)
            await redis_client.expire(scan_key, 3600)
            if scan_count > 10:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Scan rate limit: 10 scans per hour per IP"},
                    headers={"Retry-After": "3600"}
                )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"]     = str(self.rpm)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.rpm - count))
        return response
"""


# ============================================================
# File: backend/routers/reports.py — PDF generation
# ============================================================
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from services.pdf_generator import generate_pdf
import tempfile, os

router = APIRouter()

@router.get("/report/{scan_id}/pdf")
async def download_pdf_report(scan_id: str, access_token: str):
    # Verify access token
    # ...
    # Fetch full scan result
    # result = await get_full_result(scan_id)
    
    # Generate PDF
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        pdf_path = f.name
    
    await generate_pdf(scan_id=scan_id, output_path=pdf_path)
    
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"leakwatch-report-{scan_id[:8]}.pdf",
        background=lambda: os.unlink(pdf_path),
    )
"""


# ============================================================
# File: backend/services/pdf_generator.py
# ============================================================
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib import colors
from reportlab.lib.units import cm
from datetime import datetime

async def generate_pdf(scan_id: str, output_path: str, result: dict = None):
    doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    # ── Title
    title_style = ParagraphStyle("Title", fontSize=24, fontName="Helvetica-Bold",
                                  textColor=colors.HexColor("#8B5CF6"), spaceAfter=4)
    story.append(Paragraph("LeakWatch — Breach Intelligence Report", title_style))
    story.append(Paragraph(f"Scan ID: {scan_id} · Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
                            ParagraphStyle("sub", fontSize=9, textColor=colors.grey)))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#8B5CF6")))
    story.append(Spacer(1, 0.5*cm))

    # ── Risk Score
    risk = result.get("risk_score", 0) if result else 82
    risk_color = colors.HexColor("#F43F5E") if risk >= 75 else colors.HexColor("#F59E0B") if risk >= 45 else colors.HexColor("#10B981")
    story.append(Paragraph(f"Risk Score: <font color='{risk_color.hexval()}'>{risk}/100 — CRITICAL</font>",
                            ParagraphStyle("risk", fontSize=18, fontName="Helvetica-Bold")))
    story.append(Spacer(1, 0.3*cm))

    # ── Breach table
    breaches = result.get("breaches", []) if result else []
    if breaches:
        table_data = [["Service", "Date", "Severity", "Data Types", "Records"]]
        for b in breaches:
            table_data.append([
                b.get("service",""),
                b.get("date",""),
                b.get("severity","").upper(),
                ", ".join(b.get("data_types",[])),
                str(b.get("records_affected","N/A")),
            ])
        t = Table(table_data, colWidths=[3.5*cm, 2.5*cm, 2.5*cm, 6*cm, 2.5*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0B1120")),
            ("TEXTCOLOR",  (0,0), (-1,0), colors.HexColor("#8B5CF6")),
            ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",   (0,0), (-1,-1), 8),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#111827"), colors.HexColor("#0B1120")]),
            ("TEXTCOLOR",  (0,1), (-1,-1), colors.HexColor("#E2E8F0")),
            ("GRID",       (0,0), (-1,-1), 0.5, colors.HexColor("#1F2937")),
        ]))
        story.append(t)

    doc.build(story)
"""

print("LeakWatch Backend — All source files defined")
print("Run with: uvicorn main:app --reload --port 8000")
