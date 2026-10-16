# SOP - Standard Operating Procedures

Operational runbooks and troubleshooting guides for HyperShell (OpenShell-as-a-service).

Each SOP follows a scannable **Symptom → Diagnose → Root cause → Fix → Prevention** format
so on-call and onboarding engineers can move quickly.

## Index

| SOP | Covers |
|-----|--------|
| [openshell-connect-troubleshooting.md](openshell-connect-troubleshooting.md) | Diagnosing `openshell sandbox connect` failures (client/gateway version skew, SSH subsystem issues) |

## Contributing a new SOP

1. Copy the entry template at the bottom of an existing SOP.
2. Keep it in the Symptom → Diagnose → Root cause → Fix → Prevention format.
3. Cite the source (Slack thread, incident, issue) so the context is traceable.
