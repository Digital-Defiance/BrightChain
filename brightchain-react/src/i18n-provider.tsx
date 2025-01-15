// src/app/components/i18n-provider.tsx
import {
  replaceVariables,
  StringNames,
  stringNameToI18nKey,
  TranslatableEnum,
  translateEnum,
} from '@BrightChain/brightchain-lib';
import { createContext, FC, ReactNode, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';

interface TranslationProviderProps {
  children: ReactNode;
}

interface TranslationContextType {
  t: (key: StringNames, variables?: Record<string, string>) => string;
  tEnum: (translatableEnum: TranslatableEnum) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

export const TranslationProvider: FC<TranslationProviderProps> = ({
  children,
}) => {
  const { t } = useTranslation();
  const typedT: (key: string) => string = t;

  const value = {
    t: useCallback(
      (key: StringNames, variables?: Record<string, string>) =>
        replaceVariables(typedT(stringNameToI18nKey(key)), variables),
      [typedT],
    ),
    tEnum: (translatableEnum: TranslatableEnum) => {
      return translateEnum(translatableEnum);
    },
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useAppTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error(
      'useAppTranslation must be used within a TranslationProvider',
    );
  }
  return context;
};
