# Migration reference only

The pre-rebuild frontend screens, Firestore shapes and server behavior are preserved here so they can be ported without losing product knowledge. This directory is excluded from npm workspaces, Go builds, Flutter builds and release CI. It is not a runnable fallback and must never be deployed or imported by active modules. Project-bound mobile configuration has been removed.

Use the original screens and behavior as reference; implement each complete reader/creator/staff slice through the versioned API. Do not copy cloud SDK calls into `apps/` or `backend/`. Source references in the historical codebase assessment point here. Git history retains removed rules, deployment configuration and operational scripts.
