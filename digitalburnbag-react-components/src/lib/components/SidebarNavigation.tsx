import { faBird } from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BarChartIcon from '@mui/icons-material/BarChart';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import PeopleIcon from '@mui/icons-material/People';
import StarIcon from '@mui/icons-material/Star';
import TimelineIcon from '@mui/icons-material/Timeline';
import {
  Badge,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import React from 'react';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ISidebarNavigationProps {
  /** Currently active section ID */
  activeSection: string;
  /** Called when the user clicks a section */
  onSectionChange: (section: string) => void;
  /** Badge count for favorites section */
  favoritesCount?: number;
  /** Badge count for trash section */
  trashCount?: number;
  /** Badge count for shared section */
  sharedCount?: number;
  /** Provider overall status for badge display */
  providerStatus?: 'healthy' | 'degraded' | 'critical' | 'none';
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

interface SectionDef {
  id: string;
  labelKey: string;
  icon: React.ReactElement;
  badgeKey?: keyof Pick<
    ISidebarNavigationProps,
    'favoritesCount' | 'trashCount' | 'sharedCount'
  >;
}

const SECTIONS: SectionDef[] = [
  {
    id: 'my-files',
    labelKey: DigitalBurnbagStrings.Nav_MyFiles,
    icon: <FolderIcon />,
  },
  {
    id: 'shared',
    labelKey: DigitalBurnbagStrings.Nav_SharedWithMe,
    icon: <PeopleIcon />,
    badgeKey: 'sharedCount',
  },
  {
    id: 'favorites',
    labelKey: DigitalBurnbagStrings.Nav_Favorites,
    icon: <StarIcon />,
    badgeKey: 'favoritesCount',
  },
  {
    id: 'recent',
    labelKey: DigitalBurnbagStrings.Nav_Recent,
    icon: <AccessTimeIcon />,
  },
];

const MANAGEMENT_SECTIONS: SectionDef[] = [
  {
    id: 'activity',
    labelKey: DigitalBurnbagStrings.Nav_Activity,
    icon: <TimelineIcon />,
  },
  {
    id: 'analytics',
    labelKey: DigitalBurnbagStrings.Nav_Analytics,
    icon: <BarChartIcon />,
  },
  {
    id: 'providers',
    labelKey: DigitalBurnbagStrings.Nav_Providers,
    icon: <MonitorHeartIcon />,
  },
  {
    id: 'canary',
    labelKey: DigitalBurnbagStrings.Nav_Canary,
    icon: <FontAwesomeIcon icon={faBird} />,
  },
];

const TRASH_SECTION: SectionDef = {
  id: 'trash',
  labelKey: DigitalBurnbagStrings.Nav_Trash,
  icon: <DeleteIcon />,
  badgeKey: 'trashCount',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SidebarNavigation({
  activeSection,
  onSectionChange,
  favoritesCount,
  trashCount,
  sharedCount,
  providerStatus,
}: ISidebarNavigationProps) {
  const { tBranded: t } = useI18n();
  const badgeCounts: Record<string, number | undefined> = {
    favoritesCount,
    trashCount,
    sharedCount,
  };

  const renderSection = (section: SectionDef) => {
    const count = section.badgeKey ? badgeCounts[section.badgeKey] : undefined;
    const isProviderDegraded =
      section.id === 'providers' &&
      (providerStatus === 'degraded' || providerStatus === 'critical');
    return (
      <ListItem key={section.id} disablePadding>
        <ListItemButton
          selected={activeSection === section.id}
          onClick={() => onSectionChange(section.id)}
          aria-current={activeSection === section.id ? 'page' : undefined}
        >
          <ListItemIcon>
            {isProviderDegraded ? (
              <Badge
                variant="dot"
                color={providerStatus === 'critical' ? 'error' : 'warning'}
              >
                {section.icon}
              </Badge>
            ) : count != null && count > 0 ? (
              <Badge badgeContent={count} color="primary">
                {section.icon}
              </Badge>
            ) : (
              section.icon
            )}
          </ListItemIcon>
          <ListItemText primary={t(section.labelKey)} />
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <nav aria-label={t(DigitalBurnbagStrings.Nav_FileSections)}>
      <List disablePadding>
        {SECTIONS.map(renderSection)}
        <Divider sx={{ my: 1 }} />
        {MANAGEMENT_SECTIONS.map(renderSection)}
        <Divider sx={{ my: 1 }} />
        {renderSection(TRASH_SECTION)}
      </List>
    </nav>
  );
}

export default SidebarNavigation;
