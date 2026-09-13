"""
Neo4j graph layer — replaces both NetworkX (KG) and FAISS (vector store).

Neo4j 5.11+ native vector index handles semantic search.
Cypher handles typed relationship traversal for graph reasoning.

Schema
------
(:Chunk  {id, text, source, page, type, embedding})
(:Entity {name, entity_type})
(:Chunk)-[:CONTAINS]->(:Entity)
(:Entity)-[:RELATES_TO {predicate}]->(:Entity)
"""

from __future__ import annotations

import logging
import uuid
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)

VECTOR_DIM = 1024         # BAAI/bge-m3
VECTOR_INDEX = "chunk_embeddings"


class Neo4jGraph:
    def __init__(self, uri: str, user: str, password: str) -> None:
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self._setup_schema()

    def close(self) -> None:
        self.driver.close()

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------

    def _setup_schema(self) -> None:
        with self.driver.session() as s:
            # Uniqueness constraints
            s.run(
                "CREATE CONSTRAINT chunk_id IF NOT EXISTS "
                "FOR (c:Chunk) REQUIRE c.id IS UNIQUE"
            )
            s.run(
                "CREATE CONSTRAINT entity_name IF NOT EXISTS "
                "FOR (e:Entity) REQUIRE e.name IS UNIQUE"
            )
            # Native vector index (Neo4j 5.11+)
            s.run(
                f"""
                CREATE VECTOR INDEX {VECTOR_INDEX} IF NOT EXISTS
                FOR (c:Chunk) ON (c.embedding)
                OPTIONS {{indexConfig: {{
                  `vector.dimensions`: {VECTOR_DIM},
                  `vector.similarity_function`: 'cosine'
                }}}}
                """
            )

    # ------------------------------------------------------------------
    # Writes
    # ------------------------------------------------------------------

    def store_chunk(
        self,
        text: str,
        source: str,
        page: int,
        chunk_type: str,
        embedding: list[float],
    ) -> str:
        chunk_id = str(uuid.uuid4())
        with self.driver.session() as s:
            s.run(
                """
                CREATE (c:Chunk {
                    id: $id, text: $text, source: $source,
                    page: $page, type: $type, embedding: $embedding
                })
                """,
                id=chunk_id,
                text=text,
                source=source,
                page=page,
                type=chunk_type,
                embedding=embedding,
            )
        return chunk_id

    def store_relations(self, chunk_id: str, triples: list[dict]) -> None:
        """
        Each triple: {subject, subject_type, predicate, object, object_type}
        Creates Entity nodes, typed RELATES_TO edges, and CONTAINS edges from chunk.
        """
        if not triples:
            return
        with self.driver.session() as s:
            for t in triples:
                subj = t.get("subject", "").strip().lower()
                obj  = t.get("object",  "").strip().lower()
                pred = t.get("predicate", "related_to").strip().lower()
                if not subj or not obj:
                    continue
                s.run(
                    """
                    MERGE (s:Entity {name: $subj})
                      ON CREATE SET s.entity_type = $subj_type
                    MERGE (o:Entity {name: $obj})
                      ON CREATE SET o.entity_type = $obj_type
                    MERGE (s)-[:RELATES_TO {predicate: $pred}]->(o)
                    WITH s, o
                    MATCH (c:Chunk {id: $chunk_id})
                    MERGE (c)-[:CONTAINS]->(s)
                    MERGE (c)-[:CONTAINS]->(o)
                    """,
                    subj=subj,
                    subj_type=t.get("subject_type", "OTHER"),
                    obj=obj,
                    obj_type=t.get("object_type", "OTHER"),
                    pred=pred,
                    chunk_id=chunk_id,
                )

    def delete_document(self, filename: str) -> None:
        """
        Remove all Chunk nodes for a document and any Entity nodes that
        are no longer referenced by any remaining Chunk.
        """
        with self.driver.session() as s:
            # Find entities exclusively referenced by this document's chunks
            result = s.run(
                """
                MATCH (e:Entity)<-[:CONTAINS]-(c:Chunk)
                WITH e, collect(DISTINCT c.source) AS sources
                WHERE size(sources) = 1 AND sources[0] = $src
                RETURN e.name AS name
                """,
                src=filename,
            )
            orphan_names = [r["name"] for r in result]

            # Delete all chunks (DETACH removes their relationships)
            s.run(
                "MATCH (c:Chunk {source: $src}) DETACH DELETE c",
                src=filename,
            )

            # Delete entities that are now unreferenced
            if orphan_names:
                s.run(
                    "UNWIND $names AS name MATCH (e:Entity {name: name}) DETACH DELETE e",
                    names=orphan_names,
                )
                logger.info(
                    "Deleted %d orphaned entities for document '%s'",
                    len(orphan_names),
                    filename,
                )

    # ------------------------------------------------------------------
    # Reads — retrieval
    # ------------------------------------------------------------------

    def vector_search(self, embedding: list[float], top_k: int) -> list[dict]:
        with self.driver.session() as s:
            result = s.run(
                f"""
                CALL db.index.vector.queryNodes('{VECTOR_INDEX}', $k, $embedding)
                YIELD node AS c, score
                RETURN c.id AS id, c.text AS text, c.source AS source,
                       c.page AS page, c.type AS type, score
                """,
                k=top_k,
                embedding=embedding,
            )
            return [dict(r) for r in result]

    def graph_search(self, query_terms: list[str], top_k: int) -> list[dict]:
        """
        Two-pass graph traversal:
          1. Direct — chunks whose entities match query terms  (weight 2)
          2. Expanded — chunks connected via 1-2 hop RELATES_TO (weight 1)
        """
        results: dict[str, dict] = {}

        with self.driver.session() as s:
            # Pass 1: direct entity match
            direct = s.run(
                """
                UNWIND $terms AS term
                MATCH (e:Entity) WHERE e.name CONTAINS toLower(term)
                MATCH (c:Chunk)-[:CONTAINS]->(e)
                WITH DISTINCT c, count(e) AS hits
                RETURN c.id AS id, c.text AS text, c.source AS source,
                       c.page AS page, c.type AS type,
                       toFloat(hits * 2) AS score
                ORDER BY score DESC LIMIT $k
                """,
                terms=query_terms,
                k=top_k,
            )
            for r in direct:
                d = dict(r)
                results[d["id"]] = d

            # Pass 2: 2-hop entity expansion
            seed_ids = list(results.keys())
            expanded = s.run(
                """
                UNWIND $terms AS term
                MATCH (e:Entity) WHERE e.name CONTAINS toLower(term)
                MATCH (e)-[:RELATES_TO*1..2]-(neighbor:Entity)
                MATCH (c:Chunk)-[:CONTAINS]->(neighbor)
                WHERE NOT c.id IN $seed_ids
                WITH DISTINCT c, count(neighbor) AS hits
                RETURN c.id AS id, c.text AS text, c.source AS source,
                       c.page AS page, c.type AS type,
                       toFloat(hits) AS score
                ORDER BY score DESC LIMIT $k
                """,
                terms=query_terms,
                seed_ids=seed_ids,
                k=top_k,
            )
            for r in expanded:
                d = dict(r)
                if d["id"] not in results:
                    results[d["id"]] = d

        return sorted(results.values(), key=lambda x: x["score"], reverse=True)[:top_k]

    # ------------------------------------------------------------------
    # Reads — utility
    # ------------------------------------------------------------------

    def get_all_chunks(self) -> list[dict]:
        """Return all chunks ordered consistently — used to rebuild BM25."""
        with self.driver.session() as s:
            result = s.run(
                """
                MATCH (c:Chunk)
                RETURN c.id AS id, c.text AS text, c.source AS source,
                       c.page AS page, c.type AS type
                ORDER BY c.source, c.page, c.id
                """
            )
            return [dict(r) for r in result]

    def get_documents(self) -> list[dict]:
        with self.driver.session() as s:
            result = s.run(
                """
                MATCH (c:Chunk)
                RETURN c.source AS filename,
                       count(c)  AS chunks,
                       max(c.page) AS pages
                ORDER BY filename
                """
            )
            return [dict(r) for r in result]

    def document_exists(self, filename: str) -> bool:
        with self.driver.session() as s:
            result = s.run(
                "MATCH (c:Chunk {source: $src}) RETURN count(c) AS n LIMIT 1",
                src=filename,
            )
            return result.single()["n"] > 0
