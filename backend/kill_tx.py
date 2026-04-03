import os
from neo4j import GraphDatabase

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234")

try:
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    with driver.session() as session:
        # For Neo4j 4.x
        try:
            res = session.run("CALL dbms.listTransactions() YIELD transactionId, currentQuery WHERE currentQuery STARTS WITH 'MATCH' CALL dbms.killTransaction(transactionId) YIELD transactionId AS killed Return killed")
            print([r["killed"] for r in res])
        except Exception as e:
            # For Neo4j 5.x
            res = session.run("SHOW TRANSACTIONS YIELD transactionId, currentQuery WHERE currentQuery STARTS WITH 'MATCH' OR currentQuery STARTS WITH 'CALL' RETURN transactionId, currentQuery")
            for record in res:
                tid = record["transactionId"]
                print(f"Killing {tid}")
                session.run(f"TERMINATE TRANSACTION '{tid}'")
        print("Transactions checked/killed.")
except Exception as e:
    print(f"Error: {e}")
