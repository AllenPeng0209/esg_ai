from opensearch_client import OpenSearchClient


def main():
    # Initialize the client
    client = OpenSearchClient(
        host="localhost",
        port=9200,
        use_ssl=False,  # Set to True if using SSL
        username="admin",  # Optional
        password="admin",  # Optional
        cert_path="path/to/certs",  # Optional, only needed if using SSL
    )

    # Create an index with default mapping
    index_name = "product_matches"
    client.create_index(index_name)

    # Example documents to upload
    documents = [
        {
            "Reference Product Name": "Steel, low-alloyed",
            "Activity Name": "Production",
            "Category": "Metal",
            "Unit": "kg",
            "Location": "Global",
            "Source": "Ecoinvent",
            "Year": 2020,
            "Value": 1.0,
        },
        {
            "Reference Product Name": "Steel, high-alloyed",
            "Activity Name": "Manufacturing",
            "Category": "Metal",
            "Unit": "kg",
            "Location": "Global",
            "Source": "Ecoinvent",
            "Year": 2020,
            "Value": 1.0,
        },
    ]

    # Upload documents
    success = client.bulk_upload(index_name, documents)
    if success:
        print("Documents uploaded successfully")

    # Find matches
    matches = client.find_matches(
        index_name=index_name,
        reference_product="steel",
        activity_name="production",
        min_score=0.5,
        size=5,
    )

    # Print matches
    if matches:
        print(f"\nFound {len(matches)} matches:")
        for i, match in enumerate(matches, 1):
            print(f"\nMatch {i} (Score: {match['score']:.2f}):")
            print(f"Reference Product: {match['reference_product']}")
            print(f"Activity Name: {match['activity_name']}")
            print(f"Category: {match['category']}")
            print(f"Unit: {match['unit']}")
            print(f"Location: {match['location']}")
            print(f"Source: {match['source']}")
            print(f"Year: {match['year']}")
            print(f"Value: {match['value']}")
    else:
        print("No matches found")


if __name__ == "__main__":
    main()
