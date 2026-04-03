import os
from neo4j import GraphDatabase

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

try:
    with driver.session() as session:
        print("Fetching relationship types...")
        result = session.run("MATCH ()-[r]->() RETURN DISTINCT type(r) LIMIT 10")
        for record in result:
            print("Type:", record["type(r)"])
        print("Done fetching types.")
except Exception as e:
    print(f"Error: {e}")
driver.close()
