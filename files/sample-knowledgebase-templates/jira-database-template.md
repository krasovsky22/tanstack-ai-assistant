# Database Change Ticket Template

Use this ticket type for **db requests, database queries, schema changes, data updates, or maintenance operations**.  
Database changes can be risky, so queries must be clearly documented and reviewed before execution.

An LLM should analyze the query and **estimate the potential danger level based on the query string**.
Provide risk level (Danger/Average/No Risk) based on query. Display it as colors.

Red - Danger
Average - Orange
No Risk - Green.

Ask confirmation that query is correct when query estimated as danger lever.

---

# Required Information

```md
## Summary

Short description of the database operation.

## Server

Server where the query will be executed.

Server: [SERVER_NAME]!Required! (Must be provided)

## Database

Target database.

Database: [DATABASE_NAME]!Required! (Must be provided)

## Query

SQL query that will be executed.

Query:
```
