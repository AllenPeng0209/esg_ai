import os
import time
import pandas as pd
from utils import OpenSearchClient


def wait_for_opensearch(client: OpenSearchClient, max_retries: int = 30) -> bool:
    """Wait for OpenSearch to be ready"""
    for i in range(max_retries):
        try:
            if client.client.ping():
                print("OpenSearch is ready!")
                return True
            print(f"Waiting for OpenSearch to be ready... ({i+1}/{max_retries})")
            time.sleep(2)
        except Exception as e:
            print(f"Error connecting to OpenSearch: {e}")
            time.sleep(2)
    return False


def upload_csv_data(client: OpenSearchClient, csv_path: str, index_name: str) -> bool:
    """Upload data from CSV file to OpenSearch"""
    try:
        # Read CSV file
        df = pd.read_csv(csv_path)

        # Clean column names
        df.columns = [str(col).strip() for col in df.columns]

        # Convert DataFrame to list of dicts
        documents = df.to_dict(orient="records")

        # Create index if it doesn't exist
        client.create_index(index_name)

        # Upload documents
        success = client.bulk_upload(index_name, documents)
        if success:
            print(
                f"Successfully uploaded {len(documents)} documents to index '{index_name}'"
            )
            return True
        else:
            print("Failed to upload documents")
            return False

    except Exception as e:
        print(f"Error uploading CSV data: {e}")
        return False


def main():
    # Get environment variables
    opensearch_host = os.getenv("OPENSEARCH_HOST", "localhost")
    opensearch_port = int(os.getenv("OPENSEARCH_PORT", "9200"))
    opensearch_user = os.getenv("OPENSEARCH_USER", "admin")
    opensearch_password = os.getenv("OPENSEARCH_PASSWORD", "admin")
    csv_path = os.getenv("CSV_PATH", "data/ecoinvent.csv")
    index_name = os.getenv("OPENSEARCH_INDEX", "ecoinvent")

    # Initialize OpenSearch client
    client = OpenSearchClient(
        host=opensearch_host,
        port=opensearch_port,
        username=opensearch_user,
        password=opensearch_password,
    )

    # Wait for OpenSearch to be ready
    if not wait_for_opensearch(client):
        print("Failed to connect to OpenSearch")
        return False

    # Upload CSV data
    if os.path.exists(csv_path):
        return upload_csv_data(client, csv_path, index_name)
    else:
        print(f"CSV file not found at: {csv_path}")
        return False


if __name__ == "__main__":
    main()
