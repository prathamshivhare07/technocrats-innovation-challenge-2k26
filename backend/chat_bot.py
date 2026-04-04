import os
from neo4j import GraphDatabase

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "Abc@1234")

import json

try:
    from google import genai
    from google.genai import types
except ImportError:
    pass

class ChatBot:
    def __init__(self):
        self.driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key or self.api_key.strip() == "":
            self.api_key = "AIzaSyDnEdAnaj3HpMCUp-lVyfkIZFlkFSfCcQo"
            
        if self.api_key:
            self.ai_client = genai.Client(api_key=self.api_key)
        else:
            self.ai_client = None

    def process_query(self, message: str) -> dict:
        if not self.ai_client:
            return {
                "text": "The Gemini AI is not active because no API key was found. Please restart the backend with `set GEMINI_API_KEY='your_key'` to unlock full conversational AI.",
                "nodes": []
            }

        response_text = "I encountered an error."
        node_ids = []

        try:
            with self.driver.session() as session:
                # 1. Gather all vital context from the graph
                
                # A: Graph Stats
                stats_res = session.run("MATCH (n) RETURN count(n) AS node_count")
                nodes_cnt = stats_res.single()["node_count"]
                rels_cnt = session.run("MATCH ()-[r]->() RETURN count(r) AS rel_count").single()["rel_count"]
                
                # B: Highest transfers
                big_tx = session.run("MATCH (a:Account)-[r:TRANSFERRED_TO]->(b:Account) RETURN a.id AS source, b.id AS target, r.amount AS amount ORDER BY r.amount DESC LIMIT 5")
                big_tx_str = "\n".join([f"${r['amount']} from {r['source']} to {r['target']}" for r in big_tx])
                
                # C: Flagged explicitly
                flagged_tx = session.run("MATCH (a:Account)-[r:TRANSFERRED_TO {is_suspicious: true}]->(b:Account) RETURN a.id AS source, b.id AS target, r.amount AS amount LIMIT 5")
                flag_str = "\n".join([f"Suspicious: ${r['amount']} from {r['source']} to {r['target']}" for r in flagged_tx])
                
                # D: KYC Flagged nodes
                kyc_nodes = session.run("MATCH (n:Account {kyc_status: 'Flagged'}) RETURN n.id AS id LIMIT 5")
                kyc_str = "\n".join([f"Flagged KYC Account: {r['id']}" for r in kyc_nodes])

            # 2. Build the LLM Prompt
            system_prompt = f"""You are NeuralTrace's advanced Graph Investigation AI assistant.
Your job is to answer the user's questions about the AML (Anti-Money Laundering) transaction network.

Here is the current live data from the Neo4j database:
[STATISTICS]
Total Nodes (Accounts): {nodes_cnt}
Total Edges (Transactions): {rels_cnt}

[TOP 5 LARGEST TRANSACTIONS IN NETWORK]
{big_tx_str}

[FLAGGED TRANSACTIONS (CSV 'is_suspicious')]
{flag_str}

[KYC FLAGGED ACCOUNTS]
{kyc_str}

Read the data above to answer the user's question accurately. Focus only on answering what they ask.
If they ask for specific accounts that you list, you MUST include the node IDs in the JSON 'nodes' array so the 3D camera can zoom to them.

Output ONLY a raw valid JSON object with EXACTLY these two keys:
{{
  "text": "Your conversational, detailed markdown answer here. Explain the data well.",
  "nodes": ["ACC_1", "ACC_2"]
}}

No markdown backticks around the JSON!
"""
            
            # 3. Call Gemini
            response = self.ai_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=f"User Question: {message}",
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.2,
                )
            )
            
            # 4. Parse JSON
            raw_text = response.text.replace('```json', '').replace('```', '').strip()
            data = json.loads(raw_text)
            
            return {
                "text": data.get("text", "Could not format the answer."),
                "nodes": data.get("nodes", [])
            }

        except Exception as e:
            return {
                "text": f"Error running Gemini context injection: {str(e)}",
                "nodes": []
            }

    def close(self):
        self.driver.close()

bot_instance = ChatBot()

def handle_chat_message(message: str) -> dict:
    return bot_instance.process_query(message)
