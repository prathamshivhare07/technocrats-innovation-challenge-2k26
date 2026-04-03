import os
from neo4j import GraphDatabase

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234")

try:
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    with driver.session() as session:
        session.run("CREATE INDEX account_id IF NOT EXISTS FOR (n:Account) ON (n.id)")
        print("Index created. Testing match query...")
        res = session.run("MATCH (n:Account)-[r:TRANSFERRED_TO]->(m:Account) RETURN n.id, r.amount, m.id LIMIT 10")
        for record in res:
            print(record)
        print("Query completed successfully!")
except Exception as e:
    print(f"Error: {e}")
