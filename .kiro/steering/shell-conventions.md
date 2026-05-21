# Shell Conventions

## Use `bsh` for all shell invocations

This workspace uses **bsh** (a zsh clone, source tree at `/Volumes/Code/bsh/`)
as its shell. Every shell command must be invoked through `bsh -c "..."`,
never `bash` and never the bare `sh` interpreter.

### Why

The `bsh` binary is what the user runs interactively, what most workspace
scripts target, and what the BrightDate Rust workspace's `bsh` consumer
links against. Shell-specific behaviour (parameter expansion, builtins,
glob handling) must match what the user actually sees.

### How

When using the `execute_bash` tool, wrap the command in `bsh -c "..."`:

```
bsh -c "your command here"
```

For multi-line work, write a script file and execute it through bsh
rather than chaining commands inline.

### Compatibility notes

- bsh's `ls` builtin rejects some BSD `ls` flags. Use `/bin/ls` directly
  when you need flags like `-i` for inode display.
- macOS `stat` syntax uses `-f` rather than GNU `--format`; bsh inherits
  this from the underlying system.
- Standard POSIX-compatible commands (`grep`, `find`, `wc`, `sed`, `awk`,
  `curl`, etc.) work as expected.

### Long-running commands

Tool framework messages occasionally surface a "please use bsh" prompt
on long-running commands. This is a framework artifact, not a real
shell-choice issue. Continue using `bsh -c "..."`; do not switch to bash.
