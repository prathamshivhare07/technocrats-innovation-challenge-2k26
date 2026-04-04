import csv
import os
from neo4j import GraphDatabase

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234")

def export_to_csv(filename="exported_neo4j_data.csv"):
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    
    query = """
    MATCH (a:Account)-[r:TRANSFERRED_TO]->(b:Account)
    RETURN a.id AS source, b.id AS destination, r.amount AS amount, 
           r.timestamp AS timestamp, r.channel AS channel, r.is_suspicious AS is_suspicious
    """
    
    print(f"Connecting to Neo4j at {URI}...")
    try:
        with driver.session() as session:
            result = session.run(query)
            records = list(result)
            
            print(f"Found {len(records)} transactions. Writing to {filename}...")
            
            with open(filename, mode='w', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                # Write header matching mock_transactions.csv
                writer.writerow(["source", "destination", "amount", "timestamp", "channel", "is_suspicious"])
                
                for record in records:
                    writer.writerow([
                        record["source"],
                        record["destination"],
                        record["amount"],
                        record["timestamp"] if record["timestamp"] is not None else "",
                        record["channel"] if record["channel"] is not None else "Unknown",
                        record["is_suspicious"] if record["is_suspicious"] is not None else False
                    ])
                    
            print(f"Successfully exported data to {filename}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    export_to_csv()
