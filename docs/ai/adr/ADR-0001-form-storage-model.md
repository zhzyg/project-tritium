# ADR-0001: Form Storage Model for MVP-2

Date: 2026-01-29
Status: Accepted

## Context
Project Tritium needs a runtime data engine (MVP-2) to store submitted form data for schemas created by VForm. We must ship quickly, keep changes minimal, and preserve a path to more structured storage later. The system currently persists form schemas as JSON (form_schema). We need to store submitted form records with a schema version reference and support pagination queries.

## Decision
For MVP-2, store submitted form data as JSON blobs in a single table (`form_record.data_json`) with a foreign key by form key and schema version. We will not immediately implement JSON-to-DDL or EAV mappings.

## Rationale
- **Speed to value**: JSON blob storage requires minimal migration effort and supports any schema shape without DDL churn.
- **Schema evolution**: Storing `schema_version` allows deterministic replay/inspection even if the schema changes later.
- **Operational simplicity**: One table and a small set of APIs reduce risk and test surface for MVP-2.

## Trade-offs
- **Queryability**: JSON blobs are not directly indexable for field-level queries (unless using JSON indexes later).
- **Performance**: Large JSON payloads may increase IO; pagination requires careful limits.
- **Consistency**: Validation is limited to client/runtime checks; the DB does not enforce field constraints.
- **Audit**: Full auditing (field diffs, change history) is not addressed in MVP-2.

## Alternatives Considered
1) **JSON -> DDL (physical columns)**
   - Pros: strong query performance, column indexes, SQL analytics.
   - Cons: high migration cost, complex schema evolution, high operational overhead.

2) **EAV model**
   - Pros: flexible schema without DDL, field-level queries possible.
   - Cons: complex joins, poor performance at scale, harder to enforce constraints.

## Upgrade Path
- **Phase 1**: Keep JSON blobs; add basic indexes on (form_key, created_time) and (form_key, schema_version).
- **Phase 2**: Add JSON path indexes for common fields (MySQL JSON indexes or generated columns).
- **Phase 3**: For high-value forms, materialize selected fields into typed columns or dedicated tables.
- **Phase 4**: Optional EAV or event-sourcing for advanced auditing and analytics.

## Constraints
- Must work with existing VForm schema JSON and current JeecgBoot stack.
- Must be minimal change, backward compatible, and safe to deploy.
- Must preserve a forward path to stronger query performance and auditing.
