import { faGaugeCircleBolt } from '@awesome.me/kit-a20d532681/icons/classic/regular';
import { formatJoule } from '@brightchain/brightchain-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Typography, TypographyVariant } from '@mui/material';
import { FC } from 'react';

export interface JouleIconBalanceProps {
  balanceMicroJoules?: bigint;
  balanceJoules?: number;
  variant?: TypographyVariant;
  color?: string;
}

export const JouleIconBalance: FC<JouleIconBalanceProps> = ({
  balanceMicroJoules,
  balanceJoules,
  variant = 'h3',
  color = 'primary',
}) => {
  let microJoules: bigint | undefined;
  if (balanceMicroJoules !== undefined) {
    microJoules = balanceMicroJoules;
  } else if (balanceJoules !== undefined) {
    // joulesToMicrojoules rejects negatives, so convert manually to preserve sign
    microJoules = BigInt(Math.round(balanceJoules * 1_000_000));
  }

  if (microJoules === undefined) return undefined;

  return (
    <Typography variant={variant} color={color}>
      <FontAwesomeIcon icon={faGaugeCircleBolt} /> {formatJoule(microJoules)}
    </Typography>
  );
};
