import uuid
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, Complaint, ChatLog, generate_ticket_id
import ai_service

app = FastAPI(title="Smart Bharat - AI Civic Companion")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CATEGORY_DEPARTMENTS = {
    "roads": "BBMP - Roads & Infrastructure",
    "water": "BWSSB",
    "electricity": "BESCOM",
    "garbage": "BBMP - Solid Waste Management",
    "streetlight": "BBMP - Electrical Wing",
    "drainage": "BBMP - Storm Water Drains",
    "other": "BBMP - General Grievances",
}


# ---------- Schemas ----------
class ChatRequest(BaseModel):
    message: str
    language: str = "English"


class ReportRequest(BaseModel):
    name: str
    category: str
    description: str
    location: str


class RecommendRequest(BaseModel):
    query: str


class DocumentRequest(BaseModel):
    service_name: str


# ---------- Routes ----------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(400, "Message cannot be empty")
    reply = ai_service.get_ai_response(req.message, req.language)
    log = ChatLog(id=str(uuid.uuid4()), message=req.message, response=reply, language=req.language)
    db.add(log)
    db.commit()
    return {"reply": reply}


@app.post("/api/report")
def report_issue(req: ReportRequest, db: Session = Depends(get_db)):
    ticket_id = generate_ticket_id()
    dept = CATEGORY_DEPARTMENTS.get(req.category.lower(), "BBMP - General Grievances")
    complaint = Complaint(
        ticket_id=ticket_id,
        name=req.name,
        category=req.category,
        description=req.description,
        location=req.location,
        department=dept,
        status="Submitted",
    )
    db.add(complaint)
    db.commit()
    return {
        "ticket_id": ticket_id,
        "status": complaint.status,
        "department": dept,
        "message": f"Your complaint has been registered and routed to {dept}.",
    }


@app.get("/api/complaints/{ticket_id}")
def track_complaint(ticket_id: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.ticket_id == ticket_id.upper()).first()
    if not complaint:
        raise HTTPException(404, "No complaint found with this ticket ID")
    return {
        "ticket_id": complaint.ticket_id,
        "name": complaint.name,
        "category": complaint.category,
        "description": complaint.description,
        "location": complaint.location,
        "status": complaint.status,
        "department": complaint.department,
        "created_at": complaint.created_at.isoformat(),
    }


@app.get("/api/complaints")
def list_complaints(db: Session = Depends(get_db)):
    complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).limit(50).all()
    return [
        {
            "ticket_id": c.ticket_id,
            "category": c.category,
            "status": c.status,
            "location": c.location,
            "department": c.department,
            "created_at": c.created_at.isoformat(),
        }
        for c in complaints
    ]


@app.post("/api/recommend")
def recommend(req: RecommendRequest):
    results = ai_service.recommend_services(req.query)
    return {"results": results}


@app.post("/api/documents")
def documents(req: DocumentRequest):
    result = ai_service.document_checklist(req.service_name)
    if not result:
        raise HTTPException(404, "Service not recognised - try a scheme or certificate name")
    return result


@app.get("/api/schemes")
def all_schemes():
    return ai_service.SCHEMES


# ---------- Serve frontend ----------
app.mount("/static", StaticFiles(directory="../frontend"), name="static")


@app.get("/")
def serve_index():
    return FileResponse("../frontend/index.html")
