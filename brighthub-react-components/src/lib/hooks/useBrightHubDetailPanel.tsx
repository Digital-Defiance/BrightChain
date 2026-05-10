/**
 * Context for the BrightHub right-side detail panel.
 * Hub pages set their detail panel content; the layout renders it.
 */
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface DetailPanelContextValue {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}

const DetailPanelContext = createContext<DetailPanelContextValue>({
  content: null,
  setContent: () => {},
});

export function DetailPanelProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<ReactNode | null>(null);
  const setContent = useCallback(
    (c: ReactNode | null) => setContentState(c),
    [],
  );
  const value = useMemo(() => ({ content, setContent }), [content, setContent]);
  return (
    <DetailPanelContext.Provider value={value}>
      {children}
    </DetailPanelContext.Provider>
  );
}

export function useDetailPanel() {
  return useContext(DetailPanelContext);
}
