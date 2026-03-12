# Database Change Ticket Template

Use this ticket type for **database queries, schema changes, data updates, or maintenance operations**.  
Database changes can be risky, so queries must be clearly documented and reviewed before execution.

An LLM should analyze the query and **estimate the potential danger level based on the query string**.

---

# Required Information

```md
## Summary

Short description of the database operation.

## Server

Server where the query will be executed.

Server: [SERVER_NAME]

## Database

Target database.

Database: [DATABASE_NAME]

## Query

SQL query that will be executed.

Query:
```
