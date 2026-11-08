---
description: Lightweight pipeline. Clarify, plan, build, test and QA a feature
argument-hint: <feature description>
---

Feature request: $ARGUMENTS

Stage 0, clarify. Run requirements-clarifier on the request. If it lists blocking open questions, ask me and wait for answers, then update docs/plans/00-requirements.md.

Stage 1, plan. Run planner. Show me docs/plans/plan.md: acceptance criteria, task list and open questions. Then STOP and wait for my approval or changes.

Stage 2, build. After approval, for each task in order run coder and test-writer in parallel. Commit after each task.

Stage 3, verify. Run lint, type check and the full test suite. Then run qa-tester. If anything fails or the report says FAIL, send the failures to coder as a fix task, commit, and repeat Stage 3. Maximum 2 rounds, then STOP and summarize what is still broken.

Stage 4, finish. Give me a short summary: what shipped, test and QA results, known gaps. Do not push.
