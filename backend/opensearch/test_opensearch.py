from opensearchpy import OpenSearch

host = "localhost"
port = 9200
auth = (
    "admin",
    "myStrongPassword123!",
)  # For testing only. Don't store credentials in code.

client = OpenSearch(
    hosts=[{"host": host, "port": port}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=False,
)

info = client.info()
print(f"Welcome to {info['version']['distribution']} {info['version']['number']}!")
