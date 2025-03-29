import json
import os
import sys
from opensearchpy import OpenSearch, helpers
import pandas as pd
import argparse
import time
import re


def clean_column_name(column):
    """Clean column name to be OpenSearch friendly"""
    # Replace spaces and special characters with underscores
    clean = re.sub(r"[^a-zA-Z0-9]", "_", column)
    # Remove consecutive underscores
    clean = re.sub(r"_+", "_", clean)
    # Remove leading/trailing underscores
    clean = clean.strip("_")
    return clean.lower()


def connect_to_opensearch(
    host="localhost", port=9200, use_ssl=False, username=None, password=None
):
    """Connect to OpenSearch with the given parameters"""

    # Set up authentication if credentials were provided
    http_auth = None
    if username and password:
        http_auth = (username, password)

    # Create the client
    client = OpenSearch(
        hosts=[{"host": host, "port": port}],
        http_auth=http_auth,
        use_ssl=use_ssl,
        verify_certs=False,
        ssl_show_warn=False,
    )

    return client


def create_index(client, index_name, column_mapping):
    """Create an index with proper mapping for ecoinvent data"""
    try:
        # Check if index exists
        if client.indices.exists(index=index_name):
            print(f"Index '{index_name}' already exists, deleting it...")
            client.indices.delete(index=index_name)
            time.sleep(2)  # Wait for index deletion

        # Define mappings for the index
        mappings = {
            "mappings": {
                "properties": {
                    clean_column_name(col): {
                        "type": "text",
                        "fields": {"keyword": {"type": "keyword", "ignore_above": 256}},
                    }
                    if "name" in col.lower() or "activity" in col.lower()
                    else {"type": "float"}
                    if "co2" in col.lower() or "amount" in col.lower()
                    else {"type": "keyword"}
                    for col in column_mapping.keys()
                }
            },
            "settings": {"index": {"number_of_shards": 1, "number_of_replicas": 0}},
        }

        # Create index with mappings
        client.indices.create(index=index_name, body=mappings)
        print(f"Created index '{index_name}' with proper mappings")

    except Exception as e:
        print(f"Error creating index: {e}")
        sys.exit(1)


def clean_value(value):
    """Clean and convert values to appropriate types"""
    if pd.isna(value):
        return None
    if isinstance(value, str):
        value = value.strip()
        try:
            return float(value)
        except ValueError:
            return value
    return value


def csv_to_opensearch(client, csv_file, index_name, id_field=None, batch_size=1000):
    """Upload CSV data to OpenSearch"""
    try:
        # Check if file exists
        if not os.path.exists(csv_file):
            print(f"File not found: {csv_file}")
            sys.exit(1)

        # Read CSV as DataFrame
        print(f"Reading CSV file: {csv_file}")
        df = pd.read_csv(csv_file)

        # Create column mapping
        column_mapping = {col: clean_column_name(col) for col in df.columns}
        print("Column mapping:", column_mapping)

        # Rename columns to be OpenSearch friendly
        df.columns = [column_mapping[col] for col in df.columns]

        # Create index with proper mappings
        create_index(client, index_name, column_mapping)

        # Convert DataFrame to list of dicts
        records = df.to_dict(orient="records")
        total_records = len(records)
        print(f"Total records to process: {total_records}")

        # Prepare bulk upload actions
        actions = []
        for i, record in enumerate(records):
            # Clean and convert values
            cleaned_record = {k: clean_value(v) for k, v in record.items()}

            action = {"_index": index_name, "_source": cleaned_record}

            # Add ID if specified
            if id_field and id_field in cleaned_record:
                action["_id"] = str(cleaned_record[id_field])

            actions.append(action)

            # Process in batches
            if len(actions) >= batch_size:
                try:
                    helpers.bulk(client, actions, refresh=True)
                    print(
                        f"Uploaded batch {i//batch_size + 1} ({len(actions)} documents)"
                    )
                except Exception as e:
                    print(f"Error uploading batch: {e}")
                    # Continue with next batch
                actions = []

        # Upload any remaining documents
        if actions:
            try:
                helpers.bulk(client, actions, refresh=True)
                print(f"Uploaded final batch ({len(actions)} documents)")
            except Exception as e:
                print(f"Error uploading final batch: {e}")

        # Get document count
        count = client.count(index=index_name)
        print(f"Total documents in index '{index_name}': {count['count']}")

    except Exception as e:
        print(f"Error uploading data: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Upload CSV data to OpenSearch")

    # Add arguments
    parser.add_argument("csv_file", help="Path to the CSV file")
    parser.add_argument("--index", "-i", required=True, help="OpenSearch index name")
    parser.add_argument("--host", default="localhost", help="OpenSearch host")
    parser.add_argument("--port", type=int, default=9200, help="OpenSearch port")
    parser.add_argument("--ssl", action="store_true", help="Use SSL connection")
    parser.add_argument("--username", default="admin", help="OpenSearch username")
    parser.add_argument(
        "--password", default="myStrongPassword123!", help="OpenSearch password"
    )
    parser.add_argument("--id-field", help="Field to use as document ID")
    parser.add_argument(
        "--batch-size", type=int, default=1000, help="Batch size for bulk uploads"
    )

    args = parser.parse_args()

    # Connect to OpenSearch
    client = connect_to_opensearch(
        host=args.host,
        port=args.port,
        use_ssl=args.ssl,
        username=args.username,
        password=args.password,
    )

    # Upload data
    csv_to_opensearch(
        client=client,
        csv_file=args.csv_file,
        index_name=args.index,
        id_field=args.id_field,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
