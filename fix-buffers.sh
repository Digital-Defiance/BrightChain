#!/bin/bash

# Script to replace all Buffer usage with Uint8Array equivalents

cd brightchain-lib

# Replace Buffer.from() with appropriate Uint8Array conversions
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/Buffer\.from(\([^,)]*\), '\''hex'\'')/hexToUint8Array(\1)/g' {} \;
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/Buffer\.from(\([^,)]*\), '\''base64'\'')/base64ToUint8Array(\1)/g' {} \;
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/Buffer\.from(\([^)]*\))/new Uint8Array(\1)/g' {} \;

# Replace Buffer.alloc() with new Uint8Array()
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/Buffer\.alloc(\([^)]*\))/new Uint8Array(\1)/g' {} \;

# Replace Buffer.concat() with concatenateUint8Arrays()
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/Buffer\.concat(\([^)]*\))/concatenateUint8Arrays(\1)/g' {} \;

# Replace Buffer.isBuffer() with instanceof Uint8Array
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/Buffer\.isBuffer(\([^)]*\))/(\1 instanceof Uint8Array)/g' {} \;

# Replace .toString('hex') with uint8ArrayToHex()
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/\.toString('\''hex'\'')/)/g' {} \;
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/\([a-zA-Z_][a-zA-Z0-9_]*\))/uint8ArrayToHex(\1)/g' {} \;

# Replace .toString('base64') with uint8ArrayToBase64()
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/\.toString('\''base64'\'')/)/g' {} \;
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' 's/\([a-zA-Z_][a-zA-Z0-9_]*\))/uint8ArrayToBase64(\1)/g' {} \;

echo "Buffer replacements completed. Manual review and fixes may be needed."