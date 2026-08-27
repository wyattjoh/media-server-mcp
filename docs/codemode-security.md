# Code Mode security boundary

Code Mode is designed for a trusted, local, single-user MCP deployment. Generated JavaScript runs in a fresh Deno subprocess and receives only its JSON input and an immutable facade for the read-only tools explicitly selected for that execution.

This process boundary is defense in depth. It is **not** equivalent to a container, microVM, or sandbox suitable for hostile multi-tenant execution.

## Enforced by the parent

The parent owns the selected-tool manifest and dispatches only reviewed read-only operations. Generated code cannot add tools, invoke mutation-capable tools, or call Code Mode recursively. Tool-call counts, concurrency, request and result sizes, diagnostics, final output, child-process concurrency, and wall-clock duration use fixed server-owned limits.

The private protocol is length-prefixed and fail-closed. Malformed, forged, duplicate, or out-of-order messages terminate only that execution. Native intermediate results stay inside the parent/child channel unless generated code includes them in its explicit final JSON result.

## Enforced by Deno

The trusted runner starts with a cleared environment, prompts disabled, cached and frozen dependency resolution, and explicit denial of filesystem reads and writes, network access, environment access, subprocesses, and FFI. These denials cover direct Deno APIs and Node-compatible APIs. Remote, JSR, npm, local-file, and Node built-in imports cannot use ambient I/O to expand authority. Data URL modules may perform pure computation but inherit the same denied capabilities.

Each execution starts a new process, so generated globals, closures, input, logs, and results do not persist. Worker construction is removed from the generated-code global environment to prevent worker amplification and orphaned-worker lifecycle problems.

## Availability limits

The parent terminates infinite loops, promise recursion, timer floods, excessive tool calls, and output floods at the wall-clock or quota boundary. stdout is a dedicated framed protocol and corruption fails closed. console output and stderr retention are bounded; stderr is drained while excess bytes are discarded.

A process-only boundary cannot reliably contain every CPU or memory exhaustion pattern before it affects the host. In particular, allocation pressure is subject to the operating system and Deno/V8 behavior. The default boundary therefore assumes a local single user, not adversarial tenants.

For stronger availability isolation on Linux, run the server or runner in a rootless, networkless container with explicit cgroup limits for memory, CPU, PIDs, and wall time. Use a read-only filesystem and an empty temporary filesystem. Do not mount the repository, configuration, credentials, media, Docker/Podman socket, or host devices; do not add capabilities or disable seccomp. Containerization without those controls is not a security guarantee.

## Public errors and diagnostics

Generated exceptions become stable public classifications without stack traces, executable arguments, host paths, credentials, environment details, or raw intermediate tool results. Bounded diagnostics are debug logs only and are never included in the MCP result.

The adversarial integration suite verifies permission denial separately from parent quotas and documents availability threats that require optional operating-system containment.
