import csv
import random
from datetime import datetime, timedelta

def generate_mock_csv(filename="mock_transactions.csv"):
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["source", "destination", "amount", "timestamp", "channel", "is_suspicious"])
        
        base_time = datetime.now() - timedelta(days=10)
        channels = ["Wire", "ACH", "SWIFT", "Crypto"]
        
        # 300 random transactions to simulate bulk load
        for i in range(1, 301):
            src = f"ACC_CSV_{random.randint(1, 20)}"
            dst = f"ACC_CSV_{random.randint(1, 20)}"
            if src != dst:
                amt = round(random.uniform(100, 15000), 2)
                t_time = base_time + timedelta(hours=random.randint(1, 240))
                channel = random.choice(channels)
                is_suspicious = str(random.random() > 0.9).lower()
                writer.writerow([src, dst, amt, t_time.isoformat(), channel, is_suspicious])

if __name__ == "__main__":
    filename = "mock_transactions.csv"
    generate_mock_csv(filename)
    print(f"Mock dataset generated at {filename}")
