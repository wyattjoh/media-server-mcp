# Code Mode security boundary

Code Mode is designed for a trusted, local, single-user MCP deployment. Generated JavaScript runs in a fresh Deno subprocess and receives only its JSON input and an immutable facade for the read-only tools explicitly selected for that execution.

This process boundary is defense in depth. It is **not** equivalent to a container, microVM, or sandbox suitable for hostile multi-tenant execution.

## Enforced by the parent

The parent owns the selected-tool manifest and dispatches only reviewed read-only operations. Generated code cannot add tools, invoke mutation-capable tools, or call Code Mode recursively. Tool-call counts, concurrency, request and result sizes, diagnostics, final output, child-process concurrency, and wall-clock duration use fixed server-owned limits.

The private protocol is length-prefixed and fail-closed. Malformed, forged, duplicate, or out-of-order messages terminate only that execution. Native intermediate results stay inside the parent/child channel unless generated code includes them in its explicit final JSON result.

## Enforced by Deno

The trusted runner starts with a cleared environment, prompts disabled, cached and frozen dependency resolution, and explicit denial of filesystem reads and writes, network access, environment access, subprocesses, and FFI. These denials cover direct Deno APIs and Node-compatible APIs. Remote, JSR, npm, local-file, and Node built-in imports cannot use ambient I/O to expand authority. Data URL modules may perform pure computation but inherit the same denied capabilities.

Each execution starts a new process, so generated globals, closures, input, logs, and results do not persist. Worker construction is removed from the generated-code global environment to prevent worker amplification and orphaned-worker lifecycle problems.

## Supported deployment baseline

Source checkouts, CI, and the production image use Deno 2.9.5. Install the version declared in `.tool-versions` before running the source tasks. The Docker build caches the server and trusted runner graphs, and the production entrypoint uses frozen, cached-only resolution so a Code Mode child does not need network access to start.

The trusted runner remains a fixed source sidecar beside the executor in source and Docker distributions. Standalone `deno compile` binaries are not supported in v1: a compiled server needs a separately addressable runner sidecar or a reviewed extraction design before it can preserve this boundary.

## Availability limits

The parent terminates infinite loops, promise recursion, timer floods, excessive tool calls, and output floods at the wall-clock or quota boundary. stdout is a dedicated framed protocol and corruption fails closed. console output and stderr retention are bounded; stderr is drained while excess bytes are discarded. Server shutdown kills and awaits active runner processes.

A process-only boundary cannot reliably contain every CPU or memory exhaustion pattern before it affects the host. In particular, allocation pressure is subject to the operating system and Deno/V8 behavior. The supported process boundary therefore assumes a local single user, not adversarial tenants.

### Optional Linux containment

For stronger availability isolation, Linux operators can run the production image with rootless Podman and cgroup limits. Adapt values to the media-library workload:

```bash
podman run --rm --read-only --network=none \
  --cpus=1 --memory=512m --pids-limit=128 \
  --cap-drop=all --security-opt=no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  media-server-mcp
```

Networkless operation also prevents the server from reaching Radarr, Sonarr, TMDB, or Plex, so a practical deployment must grant only the network path required for configured services while still blocking arbitrary egress. Apply equivalent cgroup v2 CPU, memory, and PID controls when running Deno directly.

Containerization alone is not a safety guarantee. Do not mount the repository, configuration, credentials, media, Docker/Podman socket, or host devices into the runner boundary; do not add capabilities, disable seccomp, run privileged, or omit resource limits. Unsafe mounts, host sockets, capabilities, broad network access, and missing cgroup limits can defeat the intended hardening.

## Public errors and diagnostics

Generated exceptions become stable public classifications without stack traces, executable arguments, host paths, credentials, environment details, or raw intermediate tool results. Bounded diagnostics are debug logs only and are never included in the MCP result.

The adversarial integration suite verifies permission denial separately from parent quotas and documents availability threats that require optional operating-system containment.
