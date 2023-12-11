---
title: "Component Library Architecture"
parent: "Architecture & Design"
nav_order: 6
permalink: /docs/architecture/component-library-architecture/
---
# Component Library Architecture

## Principles

### Component Libraries
- Export reusable UI components
- Export custom hooks for data fetching
- Export services/utilities
- Do NOT contain routing logic

### Main Application
- Defines all routes in `brightchain-react/src/app/`
- Composes components from libraries
- Handles navigation and URL structure

### Self-Sufficient Components

Components fetch their own data using custom hooks:

```tsx
// Good: Component fetches its own data
const InboxView: FC = () => {
  const emailApi = useEmailApi();
  const [emails, setEmails] = useState([]);
  
  useEffect(() => {
    emailApi.queryInbox().then(setEmails);
  }, []);
  
  return <EmailList emails={emails} />;
};
```

## Structure

```
brightchain-react/
├── src/app/
│   ├── app.tsx                      # Main routing
│   ├── brightpass-routes.tsx        # BrightPass routes
│   └── brighthub-routes.tsx         # BrightHub routes

brightpass-react-components/
├── src/
│   ├── index.ts                     # Exports components, hooks, services
│   └── lib/
│       ├── components/              # Reusable UI components
│       ├── hooks/                   # Custom hooks
│       └── views/                   # Self-sufficient view components

brightmail-react-components/
├── src/
│   └── lib/
│       ├── InboxView.tsx           # Self-sufficient (uses useEmailApi)
│       └── hooks/
│           └── useEmailApi.ts      # Data fetching hook

brighthub-react-components/
├── src/
│   └── lib/
│       ├── messaging/
│       ├── timeline/
│       └── hooks/                  # Data fetching hooks
```

## Benefits

- **Reusability**: Components work in any app without routing dependencies
- **Testability**: Components can be tested in isolation
- **Maintainability**: Clear separation of concerns
- **Modern**: Uses hooks instead of outdated container patterns
