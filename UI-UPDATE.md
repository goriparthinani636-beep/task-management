# Workspace design update

The application now uses a shared emerald, deep green and warm grey design,
with consistent icons, headings, search fields, cards and button variants.
Login, dashboard, employees, tasks, attendance, documents, profile, personal
details and login account management use the same design language.

## Dashboard

- Employee totals, active employees, today's distinct check-ins and open tasks.
- Task completion ring, pending/in-progress/completed counts and open urgent work.
- Department distribution, recent tasks and shortcuts to the main screens.
- Create a task opens the actual manager task form.
- Each section uses existing authenticated APIs. Unavailable data shows a dash
  or error, rather than pretending the count is zero. Check-ins use Indian work dates.
- Refreshes on screen focus and pull-to-refresh. Old responses after blur are ignored.

## Tasks and employees

- Search tasks by title, description, full assignee name or task ID.
- Combine task status with the high-priority filter.
- Add task has a searchable employee list, explicit employee selection, priority
  and status controls, a scrollable body and fixed save/cancel footer.
- Android back closes the form unless a save is running. Keyboard avoidance is enabled.
- The dashboard and task notification links open only tasks already present in
  the authenticated, scoped task list.
- The employee directory includes search and All / Active / Inactive filters.

## Notes

Redux session state, SecureStore tokens and backend permission rules are preserved.
No SQL migration is needed. Preview data was synthetic and kept outside the repository
in C:\task\app-ui-review; it is not bundled into the application.

Checks: TypeScript, lint, Android bundle export, and the auth/scope/files/notifications/
Redux/workspace helper tests. Physical-device camera, keyboard and push delivery remain
separate device checks.
