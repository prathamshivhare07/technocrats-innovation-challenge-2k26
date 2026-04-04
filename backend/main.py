import os
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
from analytics import detect_round_tripping, detect_layering, detect_structuring
import csv
import codecs
from pydantic import BaseModel
from chat_bot import handle_chat_message

class ChatRequest(BaseModel):
    message: str

app = FastAPI(title="Fraud Detection API")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

@app.on_event("shutdown")
def shutdown_db():
    driver.close()

@app.get("/api/graph")
def get_graph_data():
    """
    Returns the node and edge data structured for a force-directed graph UI.
    """
    query = """
    MATCH (n:Account)-[r:TRANSFERRED_TO]->(m:Account)
    RETURN n, r, m
    LIMIT 2000
    """
    
    with driver.session() as session:
        result = session.run(query)
        nodes = {}
        links = []
        
        for record in result:
            n = record["n"]
            if n["id"] not in nodes:
                nodes[n["id"]] = {
                    "id": n["id"],
                    "type": n.get("type"),
                    "kyc_status": n.get("kyc_status"),
                    "group": 1 if n.get("kyc_status") == "Flagged" else 0
                }
                
            r = record["r"]
            m = record["m"]
            
            if r and m:
                if m["id"] not in nodes:
                    nodes[m["id"]] = {
                         "id": m["id"],
                         "type": m.get("type"),
                         "kyc_status": m.get("kyc_status"),
                         "group": 1 if m.get("kyc_status") == "Flagged" else 0
                    }
                links.append({
                    "source": n["id"],
                    "target": m["id"],
                    "amount": r.get("amount"),
                    "transaction_id": r.get("transaction_id"),
                    "is_suspicious": r.get("is_suspicious", False)
                })
                
        return {
            "nodes": list(nodes.values()),
            "links": links
        }

@app.get("/api/alerts")
def get_alerts():
    """
    Returns specific suspicious transactions or flagged accounts.
    """
    # Simple query to return flagged paths
    query = """
    MATCH (a:Account {kyc_status: 'Flagged'})-[r:TRANSFERRED_TO]->(b:Account)
    RETURN a.id AS source, b.id AS target, r.amount AS amount, r.transaction_id AS tx_id
    LIMIT 20
    """
    
    with driver.session() as session:
        result = session.run(query)
        alerts = []
        for row in result:
            alerts.append({
                "source": row["source"],
                "target": row["target"],
                "amount": row["amount"],
                "tx_id": row["tx_id"],
                "risk": "High"
            })
            
        return alerts

@app.get("/api/detect/circular")
def get_circular_flows():
    return detect_round_tripping()

@app.get("/api/detect/layering")
def get_layering_flows():
    return detect_layering()

@app.get("/api/detect/structuring")
def get_structuring_flows():
    return detect_structuring()

@app.get("/api/detect/flagged")
def get_flagged_flows():
    query = """
    MATCH (a:Account)-[r:TRANSFERRED_TO {is_suspicious: true}]->(b:Account)
    RETURN a.id AS source, b.id AS destination, r.amount AS amount, r.transaction_id AS tx_id
    LIMIT 50
    """
    with driver.session() as session:
        result = session.run(query)
        return [{"source": row["source"], "destination": row["destination"], "amount": row["amount"]} for row in result]

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
    
    results = []
    for row in csvReader:
        results.append({
            "src": row.get("source"),
            "dst": row.get("destination"),
            "amount": row.get("amount", 0),
            "timestamp": row.get("timestamp", ""),
            "channel": row.get("channel", "Unknown"),
            "suspicious": str(row.get("is_suspicious", "false")).lower() == 'true'
        })
        
    def batch_insert(tx, records):
        tx.run("""
        UNWIND $records AS record
        MERGE (a:Account {id: record.src})
        ON CREATE SET a.type = "Unknown", a.kyc_status = "Unknown"
        MERGE (b:Account {id: record.dst})
        ON CREATE SET b.type = "Unknown", b.kyc_status = "Unknown"
        CREATE (a)-[r:TRANSFERRED_TO {
            amount: toFloat(record.amount), 
            timestamp: record.timestamp, 
            channel: record.channel,
            is_suspicious: record.suspicious,
            transaction_id: "CSV_" + record.src + "_" + record.dst
        }]->(b)
        """, records=records)

    with driver.session() as session:
        session.execute_write(batch_insert, results)
        
    return {"message": f"Successfully ingested {len(results)} records.", "success": True}

@app.delete("/api/clear")
def clear_db():
    query = "MATCH (n) DETACH DELETE n"
    try:
        with driver.session() as session:
            session.run(query)
        return {"message": "Database wiped successfully.", "success": True}
    except Exception as e:
        return {"message": str(e), "success": False}

@app.post("/api/chat")
async def chat_interaction(req: ChatRequest):
    return handle_chat_message(req.message)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
