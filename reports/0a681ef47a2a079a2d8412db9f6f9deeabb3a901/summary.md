# Binder Auth QA Report

**Overall status: PASS**

| Metric | Value |
|---|---|
| Total tests | 511 |
| Passed | 511 |
| Failed | 0 |
| Skipped | 0 |
| Blocked | 0 |
| Not run | 0 |
| Suites executed | 26 of 26 |
| Run ID | `qa-2026-10-06T05-29-35-186Z-96a09f` |
| Started | 2026-10-06T05:29:35.186Z |
| Finished | 2026-10-06T05:30:10.261Z |
| Duration | 35075 ms |
| Commit | 0a681ef47a2a079a2d8412db9f6f9deeabb3a901 |
| Branch | main |
| Environment | ci |

## Verification coverage

| Level | Suites | Passed | Failed | Blocked |
|---|---|---|---|---|
| unit | 14 | 14 | 0 | 0 |
| fixture | 10 | 10 | 0 | 0 |
| redis | 1 | 1 | 0 | 0 |
| reporting | 1 | 1 | 0 | 0 |

Mock/fixture coverage is **not** proof of real backend tenant isolation.

## Suites

| Suite | Category | Verification | Status | Tests | Passed | Failed | Blocked |
|---|---|---|---|---|---|---|---|
| Adapter Contract | adapter | unit | passed | 7 | 7 | 0 | 0 |
| Auth / Login | auth | fixture | passed | 7 | 7 | 0 | 0 |
| Auth Core (sessions) | session | unit | passed | 11 | 11 | 0 | 0 |
| Concurrency Engine | concurrency | unit | passed | 8 | 8 | 0 | 0 |
| Concurrency Specs | concurrency | fixture | passed | 6 | 6 | 0 | 0 |
| Credential Auth Adapter | auth | unit | passed | 47 | 47 | 0 | 0 |
| Dynamic Multi-Tenant Auth | multi-tenant | fixture | passed | 47 | 47 | 0 | 0 |
| Example Target (application-agnostic proof) | auth | unit | passed | 21 | 21 | 0 | 0 |
| Framework Self-Test | regression | fixture | passed | 11 | 11 | 0 | 0 |
| HTTP Transport | adapter | unit | passed | 34 | 34 | 0 | 0 |
| Integration | integration | fixture | passed | 3 | 3 | 0 | 0 |
| Isolation Engine | isolation | unit | passed | 5 | 5 | 0 | 0 |
| Lifecycle Engine | lifecycle | unit | passed | 7 | 7 | 0 | 0 |
| Real Redis Integration | redis | redis | passed | 16 | 16 | 0 | 0 |
| Redis (mock adapter) | redis | fixture | passed | 18 | 18 | 0 | 0 |
| Redis Observer | redis | unit | passed | 127 | 127 | 0 | 0 |
| Reporting | reporting | reporting | passed | 25 | 25 | 0 | 0 |
| Security | security | fixture | passed | 9 | 9 | 0 | 0 |
| Session Lifecycle | session | fixture | passed | 12 | 12 | 0 | 0 |
| State Diff | redis | unit | passed | 11 | 11 | 0 | 0 |
| Target Descriptors | adapter | unit | passed | 41 | 41 | 0 | 0 |
| Tenant Core | multi-tenant | unit | passed | 12 | 12 | 0 | 0 |
| Tenant Isolation | isolation | fixture | passed | 5 | 5 | 0 | 0 |
| Test Fixtures | fixtures | unit | passed | 4 | 4 | 0 | 0 |
| Token Refresh | session | fixture | passed | 7 | 7 | 0 | 0 |
| Token Security | security | unit | passed | 10 | 10 | 0 | 0 |

## Comparison with previous run

No comparison available.

## Prerequisites for real verification

- redis-integration: configured
- binder-http-integration: not requested for this run
