from neo4j import GraphDatabase
import os

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j") # Correct username
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234") # Correct password

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

def get_db_driver():
    return driver

def detect_round_tripping():
    """
    Finds circular flows where A -> B -> C -> A.
    """
    query = """
    MATCH path = (a:Account)-[r:TRANSFERRED_TO*3..5]->(a)
    WHERE ALL(rel IN r WHERE rel.amount > 1000)
    RETURN 
        [n IN nodes(path) | n.id] AS account_path,
        REDUCE(total = 0, rel IN relationships(path) | total + rel.amount) AS total_volume,
        SIZE(relationships(path)) as hop_count
    LIMIT 10
    """
    with driver.session() as session:
        result = session.run(query)
        return [{"path": record["account_path"], "volume": record["total_volume"], "hops": record["hop_count"]} for record in result]

def detect_layering():
    """
    Finds rapid chain transfers A -> B -> C -> D.
    """
    query = """
    MATCH path = (a:Account)-[r:TRANSFERRED_TO*3..6]->(d:Account)
    WHERE a <> d
    AND ALL(rel IN r WHERE rel.amount > 10000)
    WITH path, nodes(path) as path_nodes, relationships(path) as rels
    // Check if relationships happen in chronological sequence
    WHERE rels[0].timestamp < rels[1].timestamp 
      AND rels[1].timestamp < rels[2].timestamp
    RETURN 
        [n IN path_nodes | n.id] AS account_path,
        rels[0].amount as initial_amount,
        rels[-1].amount as final_amount
    LIMIT 10
    """
    with driver.session() as session:
        result = session.run(query)
        return [{"path": record["account_path"], "initial": record["initial_amount"], "final": record["final_amount"]} for record in result]

def detect_structuring():
    """
    Finds repeated transfers between same parties just under the strict $10k reporting limit.
    """
    query = """
    MATCH (a:Account)-[r:TRANSFERRED_TO]->(b:Account)
    WHERE r.amount >= 9000 AND r.amount < 10000
    WITH a, b, COUNT(r) as num_transfers, SUM(r.amount) as total_structured
    WHERE num_transfers >= 3
    RETURN a.id AS source, b.id AS destination, num_transfers, total_structured
    LIMIT 10
    """
    with driver.session() as session:
        result = session.run(query)
        return [{"source": record["source"], "destination": record["destination"], "count": record["num_transfers"], "total": record["total_structured"]} for record in result]
