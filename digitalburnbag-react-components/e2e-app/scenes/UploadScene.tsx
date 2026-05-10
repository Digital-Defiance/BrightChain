import { useCallback, useState } from 'react';
import type { IUploadProgress } from '../../src/lib/components/UploadWidget';
import { UploadWidget } from '../../src/lib/components/UploadWidget';

export function UploadScene() {
  const [progress, setProgress] = useState<IUploadProgress[]>([]);

  const handleUpload = useCallback((files: File[]) => {
    const items: IUploadProgress[] = files.map((f) => ({
      fileName: f.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    setProgress(items);

    // Simulate upload progress
    files.forEach((f, i) => {
      let pct = 0;
      const interval = setInterval(() => {
        pct += 20;
        if (pct >= 100) {
          clearInterval(interval);
          setProgress((prev) =>
            prev.map((p, j) =>
              j === i ? { ...p, progress: 100, status: 'complete' } : p,
            ),
          );
        } else {
          setProgress((prev) =>
            prev.map((p, j) => (j === i ? { ...p, progress: pct } : p)),
          );
        }
      }, 200);
    });
  }, []);

  return (
    <UploadWidget onUploadFiles={handleUpload} uploadProgress={progress} />
  );
}
