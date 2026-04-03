import os
from neo4j import GraphDatabase
import random
from datetime import datetime, timedelta

# Default neo4j credentials - user should update if necessary
URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

def clear_db(tx):
    tx.run("MATCH (n) DETACH DELETE n;")

def create_account(tx, acc_id, acc_type, kyc_status, volume):
    tx.run(
        "CREATE (a:Account {id: $id, type: $type, kyc_status: $kyc, declared_monthly_volume: $vol})",
        id=acc_id, type=acc_type, kyc=kyc_status, vol=volume
    )

def create_transaction(tx, src, dst, amount, timestamp, channel, tx_id, is_suspicious=False):
    tx.run(
        """
        MATCH (a:Account {id: $src}), (b:Account {id: $dst})
        CREATE (a)-[r:TRANSFERRED_TO {
            transaction_id: $tx_id, 
            amount: $amount, 
            timestamp: $timestamp, 
            channel: $channel,
            is_suspicious: $suspicious
        }]->(b)
        """,
        src=src, dst=dst, amount=amount, timestamp=timestamp.isoformat(), channel=channel, tx_id=tx_id, suspicious=is_suspicious
    )

def generate_mock_data():
    with driver.session() as session:
        print("Clearing database...")
        session.execute_write(clear_db)

        print("Generating Accounts (Nodes)...")
        # 1. Normal Accounts (Scaled to 500)
        for i in range(1, 501):
            session.execute_write(create_account, f"ACC_N_{i}", "Retail" if random.random() > 0.3 else "Corporate", "Verified", random.randint(2000, 50000))

        # 2. Suspicious Accounts (for injection)
        def add_layering_nodes(prefix):
            session.execute_write(create_account, f"{prefix}_1", "Shell", "Flagged", 500000)
            session.execute_write(create_account, f"{prefix}_2", "Corporate", "Flagged", 100000)
            session.execute_write(create_account, f"{prefix}_3", "Offshore", "Flagged", 2000000)

        add_layering_nodes("ACC_LAYER")
        add_layering_nodes("ACC_LAY_B")
        add_layering_nodes("ACC_LAY_C")

        def add_round_nodes(prefix):
            session.execute_write(create_account, f"{prefix}_A", "Corporate", "Flagged", 50000)
            session.execute_write(create_account, f"{prefix}_B", "Corporate", "Flagged", 5000)
            session.execute_write(create_account, f"{prefix}_C", "Shell", "Flagged", 0)

        add_round_nodes("ACC_ROUND")
        add_round_nodes("ACC_RND_B")
        add_round_nodes("ACC_RND_C")

        def add_struct_nodes(prefix):
            session.execute_write(create_account, f"{prefix}_SRC", "Retail", "Flagged", 5000)
            session.execute_write(create_account, f"{prefix}_DST", "Retail", "Flagged", 15000)

        add_struct_nodes("ACC_STRUCT")
        add_struct_nodes("ACC_STR_B")
        add_struct_nodes("ACC_STR_C")

        print("Generating Normal Transactions (Edges)...")
        base_time = datetime.now() - timedelta(days=30)
        tx_counter = 1
        
        # Expanded random normal background noise
        for _ in range(1500):
            src = f"ACC_N_{random.randint(1, 500)}"
            dst = f"ACC_N_{random.randint(1, 500)}"
            if src != dst:
                amt = round(random.uniform(50, 5000), 2)
                t_time = base_time + timedelta(hours=random.randint(1, 700))
                session.execute_write(create_transaction, src, dst, amt, t_time, "ACH", f"TXN_N_{tx_counter}")
                tx_counter += 1

        print("Injecting Fraud Patterns...")
        
        def inject_layering(prefix, tx_prefix, start_dt, amt):
            session.execute_write(create_transaction, f"{prefix}_1", f"{prefix}_2", amt, start_dt, "SWIFT", f"{tx_prefix}_1", True)
            session.execute_write(create_transaction, f"{prefix}_2", f"{prefix}_3", amt - 500, start_dt + timedelta(minutes=15), "SWIFT", f"{tx_prefix}_2", True)
            session.execute_write(create_transaction, f"{prefix}_3", f"ACC_N_{random.randint(1,500)}", amt - 1000, start_dt + timedelta(minutes=30), "Crypto", f"{tx_prefix}_3", True)

        print(" -> Injecting Layering...")
        inject_layering("ACC_LAYER", "TXN_L", base_time + timedelta(days=5), 450000.00)
        inject_layering("ACC_LAY_B", "TXN_LB", base_time + timedelta(days=12), 220000.00)
        inject_layering("ACC_LAY_C", "TXN_LC", base_time + timedelta(days=18), 850000.00)

        def inject_roundtripping(prefix, tx_prefix, start_dt, amt):
            session.execute_write(create_transaction, f"{prefix}_A", f"{prefix}_B", amt, start_dt, "Wire", f"{tx_prefix}_1", True)
            session.execute_write(create_transaction, f"{prefix}_B", f"{prefix}_C", amt - 100, start_dt + timedelta(hours=2), "Wire", f"{tx_prefix}_2", True)
            session.execute_write(create_transaction, f"{prefix}_C", f"{prefix}_A", amt - 200, start_dt + timedelta(hours=4), "Wire", f"{tx_prefix}_3", True)

        print(" -> Injecting Round-Tripping...")
        inject_roundtripping("ACC_ROUND", "TXN_R", base_time + timedelta(days=10), 250000.00)
        inject_roundtripping("ACC_RND_B", "TXN_RB", base_time + timedelta(days=15), 180000.00)
        inject_roundtripping("ACC_RND_C", "TXN_RC", base_time + timedelta(days=22), 55000.00)

        def inject_structuring(prefix, tx_prefix, start_dt, count=5):
            for i in range(count):
                session.execute_write(create_transaction, f"{prefix}_SRC", f"{prefix}_DST", 9900.00, start_dt + timedelta(hours=1*i), "ACH", f"{tx_prefix}_{i}", True)

        print(" -> Injecting Structuring...")
        inject_structuring("ACC_STRUCT", "TXN_S", base_time + timedelta(days=20), 5)
        inject_structuring("ACC_STR_B", "TXN_SB", base_time + timedelta(days=25), 6)
        inject_structuring("ACC_STR_C", "TXN_SC", base_time + timedelta(days=28), 4)

        print("Mock Dataset Generated Successfully!")

if __name__ == "__main__":
    generate_mock_data()
    driver.close()
