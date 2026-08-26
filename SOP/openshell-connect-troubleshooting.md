# SOP: Troubleshooting `openshell sandbox connect`

A living runbook for diagnosing OpenShell sandbox connectivity and client issues.
Add new entries using the **Symptom → Diagnose → Root cause → Fix → Prevention** format at the bottom.

---

## Quick triage checklist

Run these first for any connection issue - they narrow the problem fast:

```bash
# 1. Client version
openshell --version

# 2. Does exec work while connect fails? (isolates SSH subsystem vs. general connectivity)
openshell sandbox exec -n <sandbox> -- ls -la

# 3. Inspect the resolved SSH config for the sandbox host alias
ssh -G <sandbox> | grep -i sessiontype
ssh -G <sandbox> | grep -iE 'remotecommand|proxycommand|identityfile'

# 4. Gateway version (confirm client/gateway compatibility)
#    Ask the gateway admin, or check the release the gateway was deployed from.
```

**Key diagnostic signal:** if `exec` succeeds but `connect` fails, the base transport
(auth, network, proxy) is healthy - the problem is specific to the **interactive/subsystem SSH channel**.

---

## Known issues

### 1. `subsystem request failed on channel 0` on `sandbox connect`

**Symptom**
```
% openshell sandbox connect mysand
subsystem request failed on channel 0
```
- `openshell sandbox exec -n mysand -- ls -la` works fine.
- `ssh -G sandbox | grep -i sessiontype` → `sessiontype default` (i.e. NOT forced to a subsystem session; that's expected/correct).

**Diagnose**
- `exec` works, so auth + transport are healthy. The failure is isolated to the SSH **subsystem** channel that `connect` opens.
- Compare **client version** vs **gateway version**.

**Root cause**
- **Client/gateway version skew.** The SSH subsystem contract changed between releases.
  Observed: gateway on **v0.0.109**, client on **v0.0.113** → `connect` broke while `exec` kept working.

**Fix**
- Downgrade the client to match the gateway version:
```bash
curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh \
     | OPENSHELL_VERSION=v0.0.109 sh
```
- Release reference: https://github.com/NVIDIA/OpenShell/releases/tag/v0.0.109
- Verify after downgrade:
```bash
openshell --version                       # expect v0.0.109
openshell sandbox connect mysand          # should attach
```

**Prevention / follow-up**
- Keep client and gateway on the same minor/patch line until compatibility is restored upstream.
- Track the upstream fix so clients can move back to the latest release.
- Document the supported client range per gateway version in onboarding instructions.

> Source: OpenShell users Slack thread (lberk / jjaggars), reported ~10:26 PM, resolved next morning.

---

## Entry template (copy for new issues)

### N. <short symptom title>

**Symptom**
```
<exact command + error output>
```

**Diagnose**
- <commands run and what to look for>

**Root cause**
- <what was actually wrong>

**Fix**
- <steps to resolve, with commands>

**Prevention / follow-up**
- <how to avoid it or what to track upstream>

> Source: <where this came from>
