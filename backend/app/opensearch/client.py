from opensearchpy import OpenSearch, helpers
import urllib3
from typing import Dict, List, Optional, Union, Any

# Disable SSL warnings
urllib3.disable_warnings()


class OpenSearchClient:
    def __init__(
        self,
        host: str = "localhost",
        port: int = 9200,
        username: str = None,
        password: str = None,
        use_ssl: bool = False,
        verify_certs: bool = False,
        ca_certs: str = None,
        client_cert: str = None,
        client_key: str = None,
    ):
        """Initialize OpenSearch client with connection parameters."""
        config = {
            "hosts": [{"host": host, "port": port}],
            "use_ssl": use_ssl,
            "verify_certs": verify_certs,
            "ssl_show_warn": False,
        }

        if username and password:
            config["http_auth"] = (username, password)

        if use_ssl:
            if ca_certs:
                config["ca_certs"] = ca_certs
            if client_cert:
                config["client_cert"] = client_cert
            if client_key:
                config["client_key"] = client_key

        self.client = OpenSearch(**config)

    def find_matches(
        self, index_name: str, search_term: str, min_score: float = 0.5, size: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for matches in the specified index using multi_match query.

        Args:
            index_name: Name of the index to search in
            search_term: Term to search for
            min_score: Minimum score threshold for matches
            size: Maximum number of results to return

        Returns:
            List of matching documents
        """
        query = {
            "size": size,
            "query": {
                "multi_match": {
                    "query": search_term,
                    "fields": ["reference_product_name", "activity_name"],
                    "type": "best_fields",
                    "tie_breaker": 0.3,
                }
            },
            "min_score": min_score,
        }

        try:
            response = self.client.search(body=query, index=index_name)

            hits = response.get("hits", {}).get("hits", [])
            return [
                {"id": hit["_id"], "score": hit["_score"], "source": hit["_source"]}
                for hit in hits
            ]

        except Exception as e:
            raise Exception(f"Error searching OpenSearch: {str(e)}")

    def create_index(
        self, index_name: str, mappings: Dict = None, settings: Dict = None
    ) -> bool:
        """
        Create an index with optional mappings and settings.

        Args:
            index_name: Name of the index to create
            mappings: Optional mappings for the index
            settings: Optional settings for the index

        Returns:
            True if index was created successfully
        """
        try:
            body = {}
            if mappings:
                body["mappings"] = mappings
            if settings:
                body["settings"] = settings

            response = self.client.indices.create(
                index=index_name, body=body if body else None
            )
            return response.get("acknowledged", False)

        except Exception as e:
            raise Exception(f"Error creating index: {str(e)}")

    def index_document(
        self, index_name: str, document: Dict, doc_id: str = None
    ) -> Dict:
        """
        Index a document in OpenSearch.

        Args:
            index_name: Name of the index
            document: Document to index
            doc_id: Optional document ID

        Returns:
            Response from OpenSearch
        """
        try:
            return self.client.index(index=index_name, body=document, id=doc_id)
        except Exception as e:
            raise Exception(f"Error indexing document: {str(e)}")

    def bulk_index(
        self, index_name: str, documents: List[Dict], chunk_size: int = 500
    ) -> Dict:
        """
        Bulk index documents in OpenSearch.

        Args:
            index_name: Name of the index
            documents: List of documents to index
            chunk_size: Number of documents per bulk request

        Returns:
            Summary of bulk operation
        """
        try:
            actions = []
            for doc in documents:
                action = {"_index": index_name, "_source": doc}
                if "_id" in doc:
                    action["_id"] = doc.pop("_id")
                actions.append(action)

            from opensearchpy.helpers import bulk

            success, failed = bulk(
                self.client, actions, chunk_size=chunk_size, raise_on_error=False
            )

            return {"success": success, "failed": failed}

        except Exception as e:
            raise Exception(f"Error bulk indexing documents: {str(e)}")

    def bulk_upload(self, index_name: str, documents: List[Dict]) -> bool:
        """
        Upload multiple documents to OpenSearch using bulk API

        Args:
            index_name: Name of the index to upload to
            documents: List of documents to upload

        Returns:
            bool: True if upload was successful, False otherwise
        """
        try:
            actions = [{"_index": index_name, "_source": doc} for doc in documents]

            success, failed = helpers.bulk(self.client, actions)
            return len(failed) == 0
        except Exception as e:
            print(f"Error in bulk upload: {e}")
            return False

    def get_document(self, index_name: str, doc_id: str) -> Optional[Dict]:
        """
        Retrieve a document by its ID

        Args:
            index_name: Name of the index
            doc_id: ID of the document to retrieve

        Returns:
            Optional[Dict]: Document if found, None otherwise
        """
        try:
            response = self.client.get(index=index_name, id=doc_id)
            return response["_source"]
        except Exception as e:
            print(f"Error retrieving document: {e}")
            return None

    def update_document(self, index_name: str, doc_id: str, document: Dict) -> bool:
        """
        Update a document by its ID

        Args:
            index_name: Name of the index
            doc_id: ID of the document to update
            document: Updated document content

        Returns:
            bool: True if update was successful, False otherwise
        """
        try:
            self.client.update(index=index_name, id=doc_id, body={"doc": document})
            return True
        except Exception as e:
            print(f"Error updating document: {e}")
            return False

    def delete_document(self, index_name: str, doc_id: str) -> bool:
        """
        Delete a document by its ID

        Args:
            index_name: Name of the index
            doc_id: ID of the document to delete

        Returns:
            bool: True if deletion was successful, False otherwise
        """
        try:
            self.client.delete(index=index_name, id=doc_id)
            return True
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
