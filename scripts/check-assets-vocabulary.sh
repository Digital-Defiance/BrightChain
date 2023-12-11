#!/usr/bin/env bash
# check-assets-vocabulary.sh
#
# Enforces brand vocabulary discipline for brightledger-assets-* packages.
# Forbidden terms: coin, holder, tokenomics, airdrop, staking, marketCap
# Requirements: 8.3, 8.4
#
# Exit 0 = clean. Exit 1 = violations found.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

FORBIDDEN_PATTERN='\b(coin|holder|tokenomics|airdrop|staking|marketCap)\b'

ASSET_DIRS=(
  "$REPO_ROOT/brightledger-assets-lib"
  "$REPO_ROOT/brightledger-assets-api-lib"
  "$REPO_ROOT/brightledger-assets-react-components"
)

# Collect all *.md files in asset packages
MD_FILES=()
for dir in "${ASSET_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    while IFS= read -r -d '' f; do
      MD_FILES+=("$f")
    done < <(find "$dir" -name '*.md' -not -path '*/node_modules/*' -not -path '*/dist/*' -print0)
  fi
done

if [[ ${#MD_FILES[@]} -eq 0 ]]; then
  echo "No *.md files found in brightledger-assets-* packages."
  exit 0
fi

VIOLATIONS=0

for f in "${MD_FILES[@]}"; do
  if grep -Eiq "$FORBIDDEN_PATTERN" "$f"; then
    echo "FAIL: Forbidden vocabulary found in $f:"
    grep -Ein "$FORBIDDEN_PATTERN" "$f" | head -20
    VIOLATIONS=$(( VIOLATIONS + 1 ))
  fi
done

if [[ $VIOLATIONS -gt 0 ]]; then
  echo ""
  echo "ERROR: $VIOLATIONS file(s) contain forbidden vocabulary."
  echo "Forbidden terms: coin, holder, tokenomics, airdrop, staking, marketCap"
  echo "Use instead: issue, transfer, burn, freeze, attest, asset, account, balance, entry, receipt"
  exit 1
fi

echo "OK: No forbidden vocabulary found in brightledger-assets-* markdown files."
exit 0
