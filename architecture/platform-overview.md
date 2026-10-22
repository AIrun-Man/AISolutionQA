# Platform Architecture Overview

```text
Requirements and application evidence
                 |
                 v
     Platform Core domain contracts
       |         |          |
       v         v          v
   Test cases  Traceability Coverage
       |
       +-------------------+
       |                   |
       v                   v
Playwright framework   API framework
       |                   |
       +---------+---------+
                 v
        Execution and reports
                 |
                 v
       Pull Request governance
```

`platform-core` is deterministic and agent-independent. Automation frameworks consume validated inputs but do not interpret requirements. CI/CD executes the same repository commands used locally. Reports and trace links preserve the source revision and execution attempt.

## Dependency rules

- Domain models do not depend on test runners.
- Page objects and API clients do not depend on tests.
- Tests consume fixtures, clients, schemas, and validated data.
- Reporting consumes execution results and never changes their outcomes.
- Agent prompts produce contract-compliant artifacts; they do not define runtime behavior.
