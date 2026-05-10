import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';
import { IApiProviderDisplayInfoDTO } from '../services/burnbag-api-client';

export interface IProviderCardProps {
  provider: IApiProviderDisplayInfoDTO;
  onClick?: () => void;
  selected?: boolean;
  showAuthMethods?: boolean;
}

/**
 * Card component displaying a single provider for selection.
 */
export function ProviderCard({
  provider,
  onClick,
  selected = false,
  showAuthMethods = true,
}: IProviderCardProps) {
  const { tBranded: _t } = useI18n();

  return (
    <Card
      variant={selected ? 'elevation' : 'outlined'}
      sx={{
        height: '100%',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: 1,
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{ height: '100%', alignItems: 'flex-start' }}
        disabled={!provider.isAvailable}
      >
        <CardContent
          sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header with icon and name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: provider.brandColor
                  ? `${provider.brandColor}15`
                  : 'action.hover',
                color: provider.brandColor || 'text.primary',
                fontSize: '1.25rem',
              }}
            >
              <i className={provider.icon} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {provider.name}
              </Typography>
            </Box>
          </Box>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              flex: 1,
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {provider.description}
          </Typography>

          {/* Auth method chips */}
          {showAuthMethods && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {provider.requiresOAuth && (
                <Chip label="OAuth" size="small" variant="outlined" />
              )}
              {provider.supportsApiKey && (
                <Chip label="API Key" size="small" variant="outlined" />
              )}
              {provider.supportsWebhook && (
                <Chip label="Webhook" size="small" variant="outlined" />
              )}
            </Box>
          )}

          {/* Unavailable message */}
          {!provider.isAvailable && provider.unavailableReason && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {provider.unavailableReason}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
