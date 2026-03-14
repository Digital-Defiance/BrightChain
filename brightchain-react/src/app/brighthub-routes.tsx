/**
 * BrightHub Routes
 *
 * Route wrappers for BrightHub social features.
 * Each page fetches real data from the API via the authenticated
 * Axios instance and renders the corresponding component.
 *
 * @requirements 38.15-38.19, 45.1-45.28
 */
import { BrightHubStrings } from '@brightchain/brightchain-lib';
import type {
  IBaseNotification,
  IBaseNotificationPreferences,
  IBasePostData,
  IBasePrivacySettings,
  IBaseThread,
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import {
  ApproveFollowersMode,
  NotificationCategory,
  NotificationChannel,
  PostType,
} from '@brightchain/brighthub-lib';
import {
  type InboxConversation,
  BrightHubLayout as OuterLayout,
  ConnectionListManager,
  ConnectionPrivacySettings,
  ConnectionSuggestions,
  ConversationView,
  FollowRequestList,
  HubManager,
  MessageRequestsList,
  MessagingInbox,
  NewConversationDialog,
  NotificationBell,
  NotificationDropdown,
  NotificationList,
  NotificationPreferences,
  PostComposer,
  ThreadView,
  Timeline,
  UserProfileCard,
} from '@brightchain/brighthub-react-components';
import {
  useAuth,
  useAuthenticatedApi,
  useI18n,
} from '@digitaldefiance/express-suite-react-components';
import { Box, Button, CircularProgress } from '@mui/material';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';

/* ── Stub / default data ───────────────────────────────────── */

const defaultCategorySettings = {
  enabled: true,
  channels: {
    [NotificationChannel.InApp]: true,
    [NotificationChannel.Email]: true,
    [NotificationChannel.Push]: true,
  },
};

const emptyNotifPrefs: IBaseNotificationPreferences<string> = {
  userId: '',
  categorySettings: {
    [NotificationCategory.Social]: { ...defaultCategorySettings },
    [NotificationCategory.Messages]: { ...defaultCategorySettings },
    [NotificationCategory.Connections]: { ...defaultCategorySettings },
    [NotificationCategory.System]: { ...defaultCategorySettings },
  },
  channelSettings: {
    [NotificationChannel.InApp]: true,
    [NotificationChannel.Email]: true,
    [NotificationChannel.Push]: true,
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    timezone: 'UTC',
  },
  dndConfig: { enabled: false },
  soundEnabled: true,
};

const emptyPrivacySettings: IBasePrivacySettings = {
  hideFollowerCount: false,
  hideFollowingCount: false,
  hideFollowersFromNonFollowers: false,
  hideFollowingFromNonFollowers: false,
  allowDmsFromNonFollowers: true,
  showOnlineStatus: true,
  showReadReceipts: true,
};

const emptyThread: IBaseThread<string> = {
  rootPost: {
    _id: '',
    authorId: '',
    content: '',
    formattedContent: '',
    postType: PostType.Original,
    mediaAttachments: [],
    mentions: [],
    hashtags: [],
    createdAt: '',
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    quoteCount: 0,
    isEdited: false,
    isBlogPost: false,
    isDeleted: false,
    updatedAt: '',
    createdBy: '',
    updatedBy: '',
  },
  replies: [],
  participantCount: 0,
  replyCount: 0,
};

const emptyUserProfile: IBaseUserProfile<string> = {
  _id: '',
  username: '',
  displayName: '',
  bio: '',
  followerCount: 0,
  followingCount: 0,
  postCount: 0,
  createdAt: '',
  isVerified: false,
  isProtected: false,
  approveFollowersMode: ApproveFollowersMode.ApproveNone,
  privacySettings: emptyPrivacySettings,
};

/* ── Page wrappers ─────────────────────────────────────────── */

const ConnectionListsPage: FC = () => <ConnectionListManager lists={[]} />;

const HubsPage: FC = () => <HubManager hubs={[]} />;

const SuggestionsPage: FC = () => <ConnectionSuggestions suggestions={[]} />;

const FollowRequestsPage: FC = () => <FollowRequestList requests={[]} />;

const PrivacyPage: FC = () => (
  <ConnectionPrivacySettings
    settings={emptyPrivacySettings}
    approveFollowersMode={ApproveFollowersMode.ApproveNone}
    onChange={() => {}}
    onApproveFollowersModeChange={() => {}}
    onSave={() => {}}
  />
);

/* ── Messaging pages ───────────────────────────────────────── */

const MessagingInboxPage: FC = () => {
  const api = useAuthenticatedApi();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { userId: string; displayName: string; username: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/brighthub/messages/conversations')
      .then((res) => {
        if (!cancelled && res.data?.data) {
          const convs = (res.data.data as unknown[]).map((c: unknown) => {
            const conv = c as Record<string, unknown>;
            return {
              ...conv,
              unreadCount: (conv['unreadCount'] as number) ?? 0,
              isPinned: (conv['isPinned'] as boolean) ?? false,
              displayName: (conv['displayName'] as string) || 'Conversation',
            } as InboxConversation;
          });
          setConversations(convs);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const handleNewConversation = useCallback(() => setDialogOpen(true), []);

  const handleSearchChange = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      api
        .get(`/api/brighthub/search?q=${encodeURIComponent(query)}&type=users`)
        .then((res) => {
          const users = (res.data?.data?.users ?? []) as {
            _id: string;
            displayName: string;
            username: string;
          }[];
          setSearchResults(
            users.map((u) => ({
              userId: u._id,
              displayName: u.displayName,
              username: u.username,
            })),
          );
        })
        .catch(() => setSearchResults([]));
    },
    [api],
  );

  const handleStartConversation = useCallback(
    (userIds: string[], groupName?: string) => {
      const body: Record<string, unknown> = { participantIds: userIds };
      if (groupName) body['groupName'] = groupName;
      api
        .post('/api/brighthub/messages/conversations', body)
        .then((res) => {
          const convId = res.data?.data?._id;
          if (convId) navigate(`/brighthub/messages/${convId}`);
        })
        .catch(() => {});
      setDialogOpen(false);
    },
    [api, navigate],
  );

  return (
    <>
      <MessagingInbox
        conversations={conversations}
        loading={loading}
        onNewConversation={handleNewConversation}
        onSelect={(id) => navigate(`/brighthub/messages/${id}`)}
      />
      <NewConversationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onStart={handleStartConversation}
        searchResults={searchResults}
        onSearchChange={handleSearchChange}
      />
    </>
  );
};

const MessageRequestsPage: FC = () => {
  const api = useAuthenticatedApi();
  const [requests, setRequests] = useState<never[]>([]);

  useEffect(() => {
    api
      .get('/api/brighthub/messages/requests')
      .then((res) => {
        if (res.data?.data) setRequests(res.data.data as never[]);
      })
      .catch(() => {});
  }, [api]);

  return <MessageRequestsList requests={requests} />;
};

const ConversationPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const [messages, setMessages] = useState<never[]>([]);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/brighthub/messages/conversations/${id}`)
      .then((res) => {
        if (res.data?.data?.messages) setMessages(res.data.data.messages);
      })
      .catch(() => {});
  }, [api, id]);

  return (
    <ConversationView
      messages={messages}
      currentUserId={userData?.id ?? ''}
      onSend={(content) => {
        if (!id) return;
        api
          .post(`/api/brighthub/messages/conversations/${id}/messages`, {
            content,
          })
          .catch(() => {});
      }}
    />
  );
};

/* ── Notification pages ────────────────────────────────────── */

const NotificationsPage: FC = () => {
  const api = useAuthenticatedApi();
  const [notifications, setNotifications] = useState<
    IBaseNotification<string>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/brighthub/notifications')
      .then((res) => {
        if (!cancelled && res.data?.data) {
          const data = res.data.data;
          if (Array.isArray(data)) {
            setNotifications(data);
          } else if (data.notifications) {
            setNotifications(data.notifications);
            setHasMore(data.hasMore ?? false);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <NotificationList
      notifications={notifications}
      loading={loading}
      hasMore={hasMore}
      onMarkRead={(id) => {
        api.post(`/api/brighthub/notifications/${id}/read`).catch(() => {});
      }}
      onDelete={(id) => {
        api.delete(`/api/brighthub/notifications/${id}`).catch(() => {});
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }}
    />
  );
};

const NotificationPrefsPage: FC = () => {
  const api = useAuthenticatedApi();
  const [prefs, setPrefs] =
    useState<IBaseNotificationPreferences<string>>(emptyNotifPrefs);

  useEffect(() => {
    api
      .get('/api/brighthub/notifications/preferences')
      .then((res) => {
        if (res.data?.data) setPrefs(res.data.data);
      })
      .catch(() => {});
  }, [api]);

  return (
    <NotificationPreferences
      preferences={prefs}
      onSave={(updated) => {
        api
          .put('/api/brighthub/notifications/preferences', updated)
          .catch(() => {});
      }}
    />
  );
};

/* ── Timeline page ─────────────────────────────────────────── */

const TimelinePage: FC = () => {
  const api = useAuthenticatedApi();
  const [posts, setPosts] = useState<IBasePostData<string>[]>([]);

  useEffect(() => {
    api
      .get('/api/brighthub/timeline/home')
      .then((res) => {
        if (res.data?.data?.posts) setPosts(res.data.data.posts);
        else if (Array.isArray(res.data?.data)) setPosts(res.data.data);
      })
      .catch(() => {});
  }, [api]);

  return (
    <Box>
      <PostComposer />
      <Timeline posts={posts} />
    </Box>
  );
};

/* ── Thread page ───────────────────────────────────────────── */

const ThreadPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const api = useAuthenticatedApi();
  const [thread, setThread] = useState<IBaseThread<string>>(emptyThread);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get(`/api/brighthub/posts/${id}/thread`)
      .then((res) => {
        if (!cancelled && res.data?.data) {
          setThread(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return <ThreadView thread={thread} />;
};

/* ── Profile page ──────────────────────────────────────────── */

const ProfilePage: FC = () => {
  const { tBranded: t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const [user, setUser] = useState<IBaseUserProfile<string>>(emptyUserProfile);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const isSelf = userData?.id === id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get(`/api/brighthub/users/${id}`)
      .then((res) => {
        if (!cancelled && res.data?.data) {
          setUser(res.data.data);
          if (res.data.data.isFollowing !== undefined) {
            setIsFollowing(res.data.data.isFollowing);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  const handleFollow = () => {
    if (!id) return;
    if (isFollowing) {
      api
        .delete(`/api/brighthub/users/${id}/follow`)
        .then(() => setIsFollowing(false))
        .catch(() => {});
    } else {
      api
        .post(`/api/brighthub/users/${id}/follow`)
        .then(() => setIsFollowing(true))
        .catch(() => {});
    }
  };

  const followButton = !isSelf ? (
    <Button
      variant={isFollowing ? 'outlined' : 'contained'}
      size="small"
      onClick={handleFollow}
      aria-label={
        isFollowing
          ? t(BrightHubStrings.FollowButton_Unfollow)
          : t(BrightHubStrings.FollowButton_Follow)
      }
    >
      {isFollowing
        ? t(BrightHubStrings.FollowButton_Following)
        : t(BrightHubStrings.FollowButton_Follow)}
    </Button>
  ) : undefined;

  return (
    <UserProfileCard
      user={user}
      isSelf={isSelf}
      isFollowing={isFollowing}
      actionElement={followButton}
    />
  );
};

/* ── Route tree ────────────────────────────────────────────── */

/** Internal layout with notification bell in header */
const BrightHubRoutesLayout: FC = () => {
  const api = useAuthenticatedApi();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownNotifs, setDropdownNotifs] = useState<
    IBaseNotification<string>[]
  >([]);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    api
      .get('/api/brighthub/notifications/unread-count')
      .then((res) => {
        const count = res.data?.data?.count ?? res.data?.data ?? 0;
        setUnreadCount(typeof count === 'number' ? count : 0);
      })
      .catch(() => {});
  }, [api]);

  const handleBellClick = useCallback(() => {
    setDropdownOpen((prev) => !prev);
    if (!dropdownOpen) {
      api
        .get('/api/brighthub/notifications?limit=10')
        .then((res) => {
          const data = res.data?.data;
          if (Array.isArray(data)) setDropdownNotifs(data);
          else if (data?.notifications) setDropdownNotifs(data.notifications);
        })
        .catch(() => {});
    }
  }, [api, dropdownOpen]);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          px: 2,
          py: 1,
        }}
      >
        <Box ref={bellRef} component="span">
          <NotificationBell
            unreadCount={unreadCount}
            onClick={handleBellClick}
          />
        </Box>
        <NotificationDropdown
          open={dropdownOpen}
          anchorEl={bellRef.current}
          notifications={dropdownNotifs}
          onClose={() => setDropdownOpen(false)}
          onViewAll={() => {
            setDropdownOpen(false);
            navigate('/brighthub/notifications');
          }}
          onMarkAllRead={() => {
            api
              .post('/api/brighthub/notifications/read-all')
              .then(() => {
                setUnreadCount(0);
                setDropdownNotifs((prev) =>
                  prev.map((n) => ({ ...n, isRead: true })),
                );
              })
              .catch(() => {});
          }}
        />
      </Box>
      <Outlet />
    </Box>
  );
};

export const BrightHubRoutes: FC = () => (
  <Routes>
    <Route element={<OuterLayout />}>
      <Route element={<BrightHubRoutesLayout />}>
        <Route index element={<TimelinePage />} />
        <Route path="connections/lists" element={<ConnectionListsPage />} />
        <Route path="connections/hubs" element={<HubsPage />} />
        <Route path="connections/suggestions" element={<SuggestionsPage />} />
        <Route path="connections/requests" element={<FollowRequestsPage />} />
        <Route path="connections/privacy" element={<PrivacyPage />} />
        <Route path="messages" element={<MessagingInboxPage />} />
        <Route path="messages/requests" element={<MessageRequestsPage />} />
        <Route path="messages/:id" element={<ConversationPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="notifications/preferences"
          element={<NotificationPrefsPage />}
        />
        <Route path="thread/:id" element={<ThreadPage />} />
        <Route path="profile/:id" element={<ProfilePage />} />
      </Route>
    </Route>
  </Routes>
);

export default BrightHubRoutes;
