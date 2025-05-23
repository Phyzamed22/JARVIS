# Suggestion for Follow-up Improvement: SunaService Task Persistence

**Issue:**
The `SunaService` in `lib/suna-service.ts` currently uses an in-memory `Map` ( `this.tasks = new Map<string, SunaTask>()`) for storing Suna-specific task data. This implementation means that any active or completed Suna tasks will be lost if the server restarts or the service instance is re-created.

**Recommendation:**
To enhance data integrity and application robustness, it is recommended to refactor `SunaService` to persist its tasks in the database. This can be achieved by following a similar pattern to the recent improvements made to `AgentService`:

1.  **Define a `suna_tasks` Table:**
    *   Add a new table schema (e.g., `suna_tasks`) in `lib/db.ts`. This table should store relevant details for Suna tasks, analogous to the `agent_tasks` table.
    *   Include fields such as `id`, `status`, `query_details` (or specific Suna parameters), `result`, `error`, `created_at`, and `updated_at`.

2.  **Implement CRUD Functions:**
    *   Add new CRUD (Create, Read, Update, Delete) functions for the `suna_tasks` table within `lib/db.ts`.

3.  **Modify `SunaService`:**
    *   Update `SunaService` to remove the in-memory `this.tasks` Map.
    *   Replace all interactions with `this.tasks` with calls to the newly created database CRUD functions for `suna_tasks`.

**Benefits:**
*   **Data Persistence:** Suna-specific task data will be preserved across server restarts and deployments.
*   **Improved Robustness:** Reduces data loss and improves the reliability of operations involving Suna tasks.
*   **Consistency:** Aligns `SunaService` with `AgentService` in terms of data handling, making the overall system architecture more consistent.

This improvement will ensure that all types of background tasks managed by the application are handled with the same level of persistence and reliability.
