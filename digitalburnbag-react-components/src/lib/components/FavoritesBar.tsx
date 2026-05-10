import StarIcon from '@mui/icons-material/Star';
import { Box, Chip, Typography } from '@mui/material';

export interface IFavoriteItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
}

export interface IFavoritesBarProps {
  favorites: IFavoriteItem[];
  recentFiles: IFavoriteItem[];
  onNavigate: (id: string, type: 'file' | 'folder') => void;
}

/**
 * Quick access bar showing favorites and recent files.
 */
export function FavoritesBar({
  favorites,
  recentFiles,
  onNavigate,
}: IFavoritesBarProps) {
  return (
    <Box sx={{ px: 2, py: 1 }}>
      {favorites.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Favorites
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {favorites.map((f) => (
              <Chip
                key={f.id}
                icon={<StarIcon fontSize="small" />}
                label={f.name}
                size="small"
                onClick={() => onNavigate(f.id, f.type)}
                clickable
              />
            ))}
          </Box>
        </Box>
      )}
      {recentFiles.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Recent
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {recentFiles.map((f) => (
              <Chip
                key={f.id}
                label={f.name}
                size="small"
                variant="outlined"
                onClick={() => onNavigate(f.id, f.type)}
                clickable
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
