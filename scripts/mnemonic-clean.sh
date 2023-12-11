#!/usr/bin/env bash
# Paste the numbered mnemonic list, then press Ctrl+D when done.
# Outputs a single-line 24-word mnemonic.
sed 's/^[0-9]*\.//g' | tr '\n' ' ' | sed 's/  */ /g; s/^ //; s/ $//' && echo
