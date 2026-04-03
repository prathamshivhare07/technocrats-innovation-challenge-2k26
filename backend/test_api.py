import urllib.request
import json
try:
    response = urllib.request.urlopen("http://127.0.0.1:8000/api/graph", timeout=30)
    data = json.loads(response.read())
    print(f"Nodes: {len(data.get('nodes', []))}, Links: {len(data.get('links', []))}")
except Exception as e:
    print(f"Error: {e}")
