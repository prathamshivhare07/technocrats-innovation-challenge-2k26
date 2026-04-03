import os
from neo4j import GraphDatabase
import traceback

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

query = """
MATCH (n:Account)-[r:TRANSFERRED_TO]->(m:Account)
RETURN n, r, m
LIMIT 10
"""

try:
    print("Executing query...")
    with driver.session() as session:
        result = session.run(query)
        print("Query executed. Iterating records...")
        nodes = {}
        links = []
        for record in result:
            n = record["n"]
            if n["id"] not in nodes:
                nodes[n["id"]] = { "id": n["id"] }
            r = record["r"]
            m = record["m"]
            if r and m:
                links.append({ "source": n["id"], "target": m["id"] })
        print(f"Nodes: {len(nodes)}, Links: {len(links)}")
except Exception as e:
    print(f"Error occurred: {e}")
    traceback.print_exc()

driver.close()
