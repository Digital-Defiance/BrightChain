import { FC } from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
}) => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>{message}</p>
  </div>
);
