# BrightDB v2 differences and known divergences

<!-- Generated from the operation corpus. Do not edit by hand.
     Regenerate: UPDATE_DIFFERENCES=1 yarn nx test brightchain-db --testPathPatterns=v2/conformance/differences -->

## Deliberate differences from BSON/MongoDB

Behavior BrightDB chooses on purpose. Each case asserts BrightDB's behavior.

None recorded.

## Known divergences

Behavior BrightDB is meant to have but does not yet. Each case asserts the intended behavior and is reported as a known divergence until it passes. When it passes, the run fails until the tag is removed.

- `docs.read.numericRangeSkipsStrings.001`: A numeric range must not match strings. Today { n: { $gt: 0 } } also returns a document whose n is the string "z", so type bracketing works for string operands but not numeric ones.
- `docs.read.rangeSkipsMissingAndNull.001`: A range never matches a missing or null field. Today the shared compare treats null and undefined as smaller than everything, so { n: { $lt: 5 } } matches documents with no n.
- `docs.read.stringRangeIsBinary.001`: Strings compare by UTF-8 bytes, so "B" sorts before "a". Today strings compare with localeCompare, which is locale-dependent.
- `docs.read.unknownOperator.001`: An unknown operator must be rejected. Today it is silently ignored and the filter matches everything, which would make a filter-based delete wipe the collection.
- `docs.replaceById.mismatchedIdOnMissingDocument.001`: A replacement naming a different _id is invalid whether or not the target exists. Today it is refused only when the target exists; against a missing target it succeeds as a no-op.

