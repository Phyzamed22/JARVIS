# Conceptual Testing Plan for Agent Task Persistence

This document outlines the testing strategy for verifying the recent changes that moved agent task management from in-memory storage to a persistent NeonDB database.

## 1. Manual Testing Steps

These steps assume the application has a way to be started (e.g., `npm run dev` or similar) and an interface (UI or API endpoint) to interact with the `AgentService`.

**Assumptions:**
*   The NeonDB database is set up and accessible.
*   There's a way to inspect the database (e.g., NeonDB SQL Editor, `psql` client, or a database GUI tool).
*   The application has an endpoint or UI mechanism to trigger `AgentService.executeTask(query)` and `AgentService.getTaskStatus(taskId)`.

**Steps:**

1.  **Start the Application:**
    *   Execute the command to start the application server (e.g., `npm run dev`, `yarn dev`, or similar, depending on the project setup).
    *   Ensure there are no startup errors and the application is running.

2.  **Create a New Agent Task:**
    *   **Method:** Use the application's UI or API endpoint to submit a new task. For example, if there's an API endpoint like `POST /api/agent/execute`, send a request with a query:
        ```json
        { "query": "What is the capital of France?" }
        ```
    *   **Observation:** Note the `taskId` returned in the response. The response should indicate the task has started (e.g., status 'pending').

3.  **Verify Initial Task Creation in Database:**
    *   **Access Database:** Connect to the NeonDB database instance.
    *   **Query:** Execute a SQL query to check the `agent_tasks` table:
        ```sql
        SELECT * FROM agent_tasks WHERE id = 'your_task_id';
        ```
        (Replace `your_task_id` with the actual ID from step 2).
    *   **Verification:**
        *   Confirm a new row exists with the correct `id`.
        *   Verify the `query` column matches the input query.
        *   Verify the `status` column is `'pending'`.
        *   Verify `result` and `error` columns are `NULL`.
        *   Note the `created_at` and `updated_at` timestamps.

4.  **Simulate or Wait for Task Processing:**
    *   **Wait:** Depending on the task's nature (e.g., simple AI query vs. complex web automation), wait an appropriate amount of time for it to be processed.
    *   **Simulate (if applicable):** If the task involves external services that can be mocked or if the processing logic can be manually triggered for testing, do so. The goal is to have the task reach a terminal state (`completed` or `failed`).
    *   **Observation:** Monitor application logs or UI (if available) for indications of task progress.

5.  **Verify Task Update in Database:**
    *   **Access Database:** As in step 3.
    *   **Query:** Re-execute the SQL query:
        ```sql
        SELECT * FROM agent_tasks WHERE id = 'your_task_id';
        ```
    *   **Verification:**
        *   Confirm the `status` column has changed to `'completed'` or `'failed'`.
        *   If `completed`, verify the `result` column contains the expected output.
        *   If `failed`, verify the `error` column contains an error message.
        *   Confirm the `updated_at` timestamp has been updated and is later than `created_at`.

6.  **Restart the Application Server:**
    *   Stop the application server (e.g., `Ctrl+C` in the terminal where it's running).
    *   Restart the application server using the same command as in Step 1. This clears any in-memory state.

7.  **Retrieve Task Status After Restart:**
    *   **Method:** Using the `taskId` from Step 2, attempt to retrieve the task's status via the application's UI or API endpoint (e.g., `GET /api/agent/status?taskId=your_task_id`).

8.  **Verify Persisted Task Details:**
    *   **Observation:** Examine the response from the status retrieval.
    *   **Verification:**
        *   Confirm the task details (ID, status, query, result/error, createdAt, updatedAt) match the data verified in the database in Step 5.
        *   This proves that the task information was successfully persisted and retrieved from the database, not from an in-memory cache that would have been lost on restart.

## 2. Automated Testing Suggestions

To ensure long-term stability and catch regressions, automated integration tests are highly recommended.

**Recommendations:**

1.  **Test Environment:**
    *   Set up a dedicated test database instance or use a schema within the development database specifically for automated tests.
    *   Ensure tests clean up after themselves (e.g., delete created tasks) to maintain a consistent state.
    *   Use environment variables to configure the database connection for tests.

2.  **Integration Tests for `AgentService` and `lib/db.ts`:**
    *   These tests should directly call the exported functions from `lib/db.ts` and methods of `AgentService`.

    *   **Test Suite: `agent_tasks` CRUD operations (via `lib/db.ts` functions)**
        *   `createAgentTask`: Test that a task can be created with correct initial values (`id`, `query`, `status='pending'`). Verify the returned object and database record.
        *   `getAgentTask`: Test retrieving an existing task by ID. Test retrieving a non-existent task (should return `null` or `undefined`).
        *   `updateAgentTask`:
            *   Test updating `status` from `pending` to `running`.
            *   Test updating `status` to `completed` and setting a `result`.
            *   Test updating `status` to `failed` and setting an `error`.
            *   Verify `updated_at` is modified upon update.
        *   `getAllAgentTasks`: Test retrieving a list of tasks (consider scenarios with 0, 1, and multiple tasks).

    *   **Test Suite: `AgentService` logic (interacting with the DB)**
        *   **Task Creation (`AgentService.executeTask`):**
            *   Verify that calling `executeTask` results in a new task record in the database with `status: 'pending'`.
            *   Mock or stub the actual task processing logic (`this.processTask`) for this specific test to focus on the DB interaction part of `executeTask`.
        *   **Task Status Retrieval (`AgentService.getTaskStatus`):**
            *   Create a task directly in the DB (or via `createAgentTask`).
            *   Call `AgentService.getTaskStatus` with the task ID.
            *   Verify the returned `AgentTask` object correctly maps the fields from `AgentTaskDB` (e.g., `created_at` to `createdAt`).
        *   **Task Processing Flow (simulated `AgentService.processTask`):**
            *   This is more complex and might require careful mocking of dependencies like AI services.
            *   **Scenario 1: Successful Completion:**
                1.  Call `executeTask` to create a task.
                2.  Manually invoke or simulate the internal `processTask` flow.
                3.  Verify the task in the DB is updated to `status: 'running'` and then to `status: 'completed'` with a `result`.
            *   **Scenario 2: Failure:**
                1.  Call `executeTask`.
                2.  Simulate an error during `processTask`.
                3.  Verify the task in the DB is updated to `status: 'failed'` with an `error` message.
        *   **Persistence Check (Simulated):**
            *   Create a task.
            *   Clear any in-memory caches or re-instantiate `AgentService` (if feasible in the test framework) to simulate a state reset.
            *   Call `getTaskStatus` and verify the task is retrieved correctly from the database.

**Tooling:**
*   Consider using a testing framework like Jest, Mocha, or Vitest.
*   Use libraries for database interaction within tests if needed, or rely on the existing `executeSql` after ensuring the test DB connection is configured.

By implementing these manual and automated tests, we can gain high confidence in the correctness and robustness of the agent task persistence feature.
