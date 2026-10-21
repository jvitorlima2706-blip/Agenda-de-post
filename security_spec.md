# Security Specification - Vulpis Core

## 1. Data Invariants
- Posts belong to a client.
- Only Admins and assigned Creators can create or edit post content (when not in terminal/approved state).
- Only Managers (Gestor) and Admins can approve or request adjustments.
- Creators can NEVER set status to 'Aprovado'.
- Once status is 'Aprovado', only an Administrator can reopen it (change status back).
- Users can only read their notifications.
- Timestamp comments must belong to an existing post.

## 2. The Dirty Dozen Payloads (Targeting PERMISSION_DENIED)
1. Creator attempting to approve a post directly (`status: 'Aprovado'`).
2. Creator attempting to edit caption or media while status is 'Aguardando aprovação'.
3. Unassigned manager attempting to approve another client's post.
4. Non-admin attempting to reopen an already approved post.
5. Non-admin modifying another user's role in `/users/{userId}`.
6. Non-owner attempting to read another user's notifications.
7. Injecting oversized string (e.g. >100KB) into `titulo` or `legenda`.
8. Injecting invalid document ID with malicious characters.
9. Attempting to tamper with audit logs (`/logs/{logId}`).
10. Unauthenticated client creating posts.
11. Deleting posts without admin permissions.
12. Attempting to modify `createdAt` or `criadorId` immutable fields.
