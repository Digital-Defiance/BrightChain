/**
 * BrightHub Routes
 *
 * Route wrappers for BrightHub social features.
 * Each page fetches real data from the API via the authenticated
 * Axios instance and renders the corresponding component.
 *
 * @requirements 38.15-38.19, 45.1-45.28
 */
import type {
  IBaseHub,
  IBaseNotification,
  IBaseNotificationPreferences,
  IBasePostData,
  IBasePrivacySettings,
  IBaseThread,
  IBaseUserProfile,
} from '@brightchain/brighthub-lib';
import {
  ApproveFollowersMode,
  BrightHubStrings,
  HubTrustTier,
  NotificationCategory,
  NotificationChannel,
  PostType,
} from '@brightchain/brighthub-lib';
import {
  ConnectionListManager,
  ConnectionPrivacySettings,
  ConnectionSuggestions,
  ConversationView,
  EditPostDialog,
  FollowRequestList,
  HUB_POST_MAX_CHAR_COUNT,
  HubManager,
  type InboxConversation,
  MessageRequestsList,
  MessagingInbox,
  NewConversationDialog,
  NotificationList,
  NotificationPreferences,
  BrightHubLayout as OuterLayout,
  PostComposer,
  type PostComposerSubmitData,
  ThreadView,
  Timeline,
  UserProfileCard,
  useDetailPanel,
} from '@brightchain/brighthub-react-components';
import {
  useAuth,
  useAuthenticatedApi,
  useI18n,
} from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';

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
  const { userData } = useAuth();
  const userId = userData?.id;
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { userId: string; displayName: string; username: string }[]
  >([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get(`/brighthub/messages/conversations?userId=${userId}`)
      .then((res) => {
        if (!cancelled && res.data?.data) {
          // API returns { conversations: [...] } or a raw array
          const raw = Array.isArray(res.data.data)
            ? res.data.data
            : (res.data.data.conversations ?? []);
          const convs = (raw as unknown[]).map((c: unknown) => {
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
  }, [api, userId]);

  const handleNewConversation = useCallback(() => setDialogOpen(true), []);

  const handleSearchChange = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      api
        .get(
          `/brighthub/search?q=${encodeURIComponent(query)}&type=users&userId=${userId}`,
        )
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
    [api, userId],
  );

  const handleStartConversation = useCallback(
    (userIds: string[], groupName?: string) => {
      const body: Record<string, unknown> = { participantIds: userIds, userId };
      if (groupName) {
        body['type'] = 'group';
        body['name'] = groupName;
      }
      api
        .post('/brighthub/messages/conversations', body)
        .then((res) => {
          const convId = res.data?.data?._id;
          if (convId) navigate(`/brighthub/messages/${convId}`);
        })
        .catch(() => {});
      setDialogOpen(false);
    },
    [api, navigate, userId],
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
  const { userData } = useAuth();
  const userId = userData?.id;
  const [requests, setRequests] = useState<never[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    api
      .get(`/brighthub/messages/requests?userId=${userId}`)
      .then((res) => {
        if (res.data?.data) {
          // API returns { requests: [...] } or a raw array
          const raw = res.data.data;
          const items = Array.isArray(raw) ? raw : (raw.requests ?? []);
          setRequests(items as never[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api, userId]);

  return <MessageRequestsList requests={requests} loading={loading} />;
};

const ConversationPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const [messages, setMessages] = useState<never[]>([]);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/brighthub/messages/conversations/${id}?userId=${userData?.id}`)
      .then((res) => {
        if (res.data?.data?.messages) setMessages(res.data.data.messages);
      })
      .catch(() => {});
  }, [api, id, userData?.id]);

  return (
    <ConversationView
      messages={messages}
      currentUserId={userData?.id ?? ''}
      onSend={(content) => {
        if (!id) return;
        api
          .post(`/brighthub/messages/conversations/${id}/messages`, {
            userId: userData?.id,
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
  const { userData } = useAuth();
  const userId = userData?.id;
  const [notifications, setNotifications] = useState<
    IBaseNotification<string>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get(`/brighthub/notifications?userId=${userId}`)
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
  }, [api, userId]);

  return (
    <NotificationList
      notifications={notifications}
      loading={loading}
      hasMore={hasMore}
      onMarkRead={(id) => {
        api
          .post(`/brighthub/notifications/${id}/read`, { userId })
          .catch(() => {});
      }}
      onDelete={(id) => {
        api
          .delete(`/brighthub/notifications/${id}?userId=${userId}`)
          .catch(() => {});
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }}
    />
  );
};

const NotificationPrefsPage: FC = () => {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const userId = userData?.id;
  const [prefs, setPrefs] =
    useState<IBaseNotificationPreferences<string>>(emptyNotifPrefs);

  useEffect(() => {
    if (!userId) return;
    api
      .get(`/brighthub/notifications/preferences?userId=${userId}`)
      .then((res) => {
        if (res.data?.data) setPrefs(res.data.data);
      })
      .catch(() => {});
  }, [api, userId]);

  return (
    <NotificationPreferences
      preferences={prefs}
      onSave={(updated) => {
        api
          .put('/brighthub/notifications/preferences', { ...updated, userId })
          .catch(() => {});
      }}
    />
  );
};

/* ── Timeline / Home page ───────────────────────────────────── */

const TimelinePage: FC = () => {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const { tBranded: t } = useI18n();
  const userId = userData?.id;
  const navigate = useNavigate();
  const [posts, setPosts] = useState<IBasePostData<string>[]>([]);
  const [authors, setAuthors] = useState<
    Record<string, IBaseUserProfile<string>>
  >({});
  const [trendingHubs, setTrendingHubs] = useState<IBaseHub<string>[]>([]);
  const [suggestedHubs, setSuggestedHubs] = useState<IBaseHub<string>[]>([]);
  const [myHubs, setMyHubs] = useState<IBaseHub<string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [repostedPostIds, setRepostedPostIds] = useState<Set<string>>(
    new Set(),
  );
  const [editingPost, setEditingPost] = useState<IBasePostData<string> | null>(
    null,
  );

  const currentUser: IBaseUserProfile<string> | undefined = useMemo(() => {
    if (!userData) return undefined;
    return {
      ...emptyUserProfile,
      _id: userData.id ?? '',
      username: userData.username ?? '',
      displayName: userData.displayName ?? userData.username ?? '',
    };
  }, [userData]);

  // Fetch home feed + hub data in parallel
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const feedReq = api
      .get(`/brighthub/timeline/home?userId=${userId}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data?.posts) {
          setPosts(data.posts);
          if (data.authors) setAuthors(data.authors);
          if (data.likedPostIds) setLikedPostIds(new Set(data.likedPostIds));
          if (data.repostedPostIds)
            setRepostedPostIds(new Set(data.repostedPostIds));
        } else if (Array.isArray(data)) {
          setPosts(data);
        }
      })
      .catch(() => {});

    const trendingReq = api
      .get(`/brighthub/hubs/explore?sort=trending&limit=5&userId=${userId}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (Array.isArray(data)) setTrendingHubs(data);
        else if (data?.hubs) setTrendingHubs(data.hubs);
      })
      .catch(() => {});

    const myHubsReq = api
      .get(`/brighthub/hubs?userId=${userId}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (Array.isArray(data)) setMyHubs(data);
        else if (data?.hubs) setMyHubs(data.hubs);
      })
      .catch(() => {});

    const suggestedReq = api
      .get(`/brighthub/hubs/explore?sort=suggested&limit=4&userId=${userId}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (Array.isArray(data)) setSuggestedHubs(data);
        else if (data?.hubs) setSuggestedHubs(data.hubs);
      })
      .catch(() => {});

    Promise.all([feedReq, trendingReq, myHubsReq, suggestedReq]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [api, userId]);

  const handleSubmitPost = useCallback(
    async (data: PostComposerSubmitData) => {
      if (!userId) return;
      setIsSubmitting(true);
      try {
        const body: Record<string, unknown> = {
          authorId: userId,
          content: data.content,
        };
        if (data.hubIds.length > 0) body['hubIds'] = data.hubIds;
        if (data.replyToId) body['parentPostId'] = data.replyToId;
        if (data.quotedPostId) body['quotedPostId'] = data.quotedPostId;
        const res = await api.post('/brighthub/posts', body);
        const newPost = res.data?.data;
        if (newPost) {
          setPosts((prev) => [newPost, ...prev]);
          if (currentUser && userId) {
            setAuthors((prev) =>
              prev[userId] ? prev : { ...prev, [userId]: currentUser },
            );
          }
        }
      } catch {
        /* TODO: snackbar */
      } finally {
        setIsSubmitting(false);
      }
    },
    [api, userId],
  );

  const handleLike = useCallback(
    (postId: string) => {
      if (!userId) return;
      const alreadyLiked = likedPostIds.has(postId);
      if (alreadyLiked) {
        api
          .delete(`/brighthub/posts/${postId}/like`, { data: { userId } })
          .catch(() => {});
        setLikedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId
              ? { ...p, likeCount: Math.max(0, p.likeCount - 1) }
              : p,
          ),
        );
      } else {
        api.post(`/brighthub/posts/${postId}/like`, { userId }).catch(() => {});
        setLikedPostIds((prev) => new Set(prev).add(postId));
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId ? { ...p, likeCount: p.likeCount + 1 } : p,
          ),
        );
      }
    },
    [api, userId, likedPostIds],
  );

  const handleRepost = useCallback(
    (postId: string) => {
      if (!userId) return;
      api.post(`/brighthub/posts/${postId}/repost`, { userId }).catch(() => {});
      setRepostedPostIds((prev) => new Set(prev).add(postId));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId ? { ...p, repostCount: p.repostCount + 1 } : p,
        ),
      );
    },
    [api, userId],
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  /** Reusable hub chip row */
  const HubChipRow = ({
    hubs,
    max = 5,
  }: {
    hubs: IBaseHub<string>[];
    max?: number;
  }) => (
    <Box display="flex" gap={1} flexWrap="wrap">
      {hubs.slice(0, max).map((hub) => (
        <Chip
          key={hub._id}
          label={hub.name}
          onClick={() => navigate(`/brighthub/h/${hub.slug ?? hub._id}`)}
          clickable
          variant="outlined"
          size="small"
        />
      ))}
    </Box>
  );

  const hasContent = posts.length > 0 || myHubs.length > 0;

  return (
    <Box>
      {/* Welcome banner for new users */}
      {!hasContent && (
        <Card variant="outlined" sx={{ mb: 2, p: 3, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {t(BrightHubStrings.Home_Welcome)}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {t(BrightHubStrings.Home_WelcomeSubtitle)}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/brighthub/explore')}
          >
            {t(BrightHubStrings.Nav_Explore)}
          </Button>
        </Card>
      )}

      {/* Trending Hubs strip */}
      {trendingHubs.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {t(BrightHubStrings.Home_TrendingHubs)}
            </Typography>
            <Button size="small" onClick={() => navigate('/brighthub/explore')}>
              {t(BrightHubStrings.Home_ViewAll)}
            </Button>
          </Box>
          <HubChipRow hubs={trendingHubs} />
        </Box>
      )}

      {/* Your Hubs quick-access */}
      {myHubs.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            {t(BrightHubStrings.Home_YourHubs)} ({myHubs.length})
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {myHubs.map((hub) => (
              <Chip
                key={hub._id}
                label={hub.name}
                onClick={() => navigate(`/brighthub/h/${hub.slug ?? hub._id}`)}
                clickable
                color="primary"
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Suggested Hubs for users with no hubs */}
      {myHubs.length === 0 && suggestedHubs.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            {t(BrightHubStrings.Home_SuggestedHubs)}
          </Typography>
          <Box display="flex" gap={1} flexDirection="column">
            {suggestedHubs.map((hub) => (
              <Card
                key={hub._id}
                variant="outlined"
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/brighthub/h/${hub.slug ?? hub._id}`)}
              >
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {hub.name}
                      </Typography>
                      {hub.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {hub.description}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      size="small"
                      label={t(BrightHubStrings.HubDetail_MembersTemplate, {
                        COUNT: String(hub.memberCount),
                      })}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Post composer */}
      <Box sx={{ mb: 2 }}>
        <PostComposer
          currentUser={currentUser}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitPost}
          hubOptions={myHubs}
        />
      </Box>

      {/* Aggregated feed */}
      {posts.length > 0 ? (
        <>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            {t(BrightHubStrings.Home_RecentActivity)}
          </Typography>
          <Timeline
            posts={posts}
            authors={authors}
            likedPostIds={likedPostIds}
            repostedPostIds={repostedPostIds}
            onLike={handleLike}
            onRepost={handleRepost}
            onReply={(postId) => navigate(`/brighthub/thread/${postId}`)}
            onPostClick={(postId) => navigate(`/brighthub/thread/${postId}`)}
            onAuthorClick={(authorId) =>
              navigate(`/brighthub/profile/${authorId}`)
            }
            onDelete={(postId) => {
              if (!userId) return;
              if (!window.confirm('Delete this post?')) return;
              api
                .delete(`/brighthub/posts/${postId}`, { data: { userId } })
                .then(() =>
                  setPosts((prev) => prev.filter((p) => p._id !== postId)),
                )
                .catch(() => {});
            }}
            onReport={(postId) => {
              if (!userId) return;
              api
                .post(`/brighthub/posts/${postId}/report`, {
                  userId,
                  reason: 'Reported from home feed',
                })
                .catch(() => {});
            }}
            currentUserId={userId}
            onEdit={(postId) => {
              const post = posts.find((p) => p._id === postId);
              if (post) setEditingPost(post);
            }}
          />

          {editingPost && (
            <EditPostDialog
              open={!!editingPost}
              postId={editingPost._id}
              currentContent={editingPost.content}
              createdAt={editingPost.createdAt as string}
              onClose={() => setEditingPost(null)}
              onSave={async (pid, newContent) => {
                if (!userId) return;
                const res = await api.put(`/brighthub/posts/${pid}`, {
                  userId,
                  content: newContent,
                });
                const updated = res.data?.data;
                if (updated) {
                  setPosts((prev) =>
                    prev.map((p) => (p._id === pid ? { ...p, ...updated } : p)),
                  );
                }
              }}
            />
          )}
        </>
      ) : (
        hasContent && (
          <Box py={3} textAlign="center">
            <Typography color="text.secondary">
              {t(BrightHubStrings.Home_NoHubsHint)}
            </Typography>
          </Box>
        )
      )}
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
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get(`/brighthub/posts/${id}/thread`)
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
  const navigate = useNavigate();
  const [user, setUser] = useState<IBaseUserProfile<string>>(emptyUserProfile);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const isSelf = userData?.id === id;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get(
        userData?.id
          ? `/brighthub/users/${id}?requesterId=${userData.id}`
          : `/brighthub/users/${id}`,
      )
      .then((res) => {
        if (!cancelled && res.data?.data) {
          setUser(res.data.data);
          if (res.data.data.isFollowing !== undefined) {
            setIsFollowing(res.data.data.isFollowing);
          }
        }
      })
      .catch(() => {
        // Populate fallback from auth context only when viewing own profile
        if (!cancelled && userData && isSelf) {
          setUser((prev) => ({
            ...prev,
            _id: id ?? prev._id,
            username: userData.username ?? prev.username,
            displayName:
              userData.displayName ?? userData.username ?? prev.displayName,
          }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, id, userData?.id]);

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
        .delete(`/brighthub/users/${id}/follow`, {
          data: { followerId: userData?.id },
        })
        .then(() => setIsFollowing(false))
        .catch(() => {});
    } else {
      api
        .post(`/brighthub/users/${id}/follow`, { followerId: userData?.id })
        .then(() => setIsFollowing(true))
        .catch(() => {});
    }
  };

  const followButton = !isSelf ? (
    <Box display="flex" gap={1}>
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
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          // Create or navigate to a conversation with this user
          api
            .post('/brighthub/messages/conversations', {
              userId: userData?.id,
              otherUserId: id,
            })
            .then((res) => {
              const convId = res.data?.data?._id;
              if (convId) navigate(`/brighthub/messages/${convId}`);
              else navigate('/brighthub/messages');
            })
            .catch(() => navigate('/brighthub/messages'));
        }}
      >
        {t(BrightHubStrings.Nav_Messages)}
      </Button>
    </Box>
  ) : undefined;

  return (
    <Box>
      <UserProfileCard
        user={user}
        isSelf={isSelf}
        isFollowing={isFollowing}
        actionElement={followButton}
      />
      {/* Hub reputation summary */}
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Hub Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.postCount} posts · {user.followerCount} followers ·{' '}
            {user.followingCount} following
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

/* ── Hub Detail page ───────────────────────────────────────── */

const HubDetailPage: FC = () => {
  const { slug, subSlug } = useParams<{ slug: string; subSlug?: string }>();
  const effectiveSlug = subSlug ? `${slug}/${subSlug}` : slug;
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();
  const { setContent: setDetailPanel } = useDetailPanel();
  const userId = userData?.id;

  const [hub, setHub] = useState<IBaseHub<string> | null>(null);
  const [posts, setPosts] = useState<IBasePostData<string>[]>([]);
  const [authors, setAuthors] = useState<
    Record<string, IBaseUserProfile<string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortTab, setSortTab] = useState(0);
  const [editingPost, setEditingPost] = useState<IBasePostData<string> | null>(
    null,
  );

  const currentUser: IBaseUserProfile<string> | undefined = useMemo(() => {
    if (!userData) return undefined;
    return {
      ...emptyUserProfile,
      _id: userData.id ?? '',
      username: userData.username ?? '',
      displayName: userData.displayName ?? userData.username ?? '',
    };
  }, [userData]);

  const sortParam =
    sortTab === 0
      ? 'hot'
      : sortTab === 1
        ? 'new'
        : sortTab === 2
          ? 'top'
          : 'controversial';

  // Fetch hub metadata
  useEffect(() => {
    if (!effectiveSlug) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(
        `/brighthub/hubs/${effectiveSlug}${userId ? `?userId=${userId}` : ''}`,
      )
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data?.hub) setHub(data.hub);
        else if (data?._id) setHub(data);
        if (data?.isMember !== undefined) setIsMember(data.isMember);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, effectiveSlug, userId]);

  // Fetch hub posts via the dedicated hub feed endpoint
  useEffect(() => {
    if (!hub) return;
    let cancelled = false;
    api
      .get(
        `/brighthub/hubs/${hub._id}/posts?sort=${sortParam}${userId ? `&userId=${userId}` : ''}`,
      )
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data?.posts) {
          setPosts(data.posts);
          if (data.authors) setAuthors(data.authors);
        } else if (Array.isArray(data)) setPosts(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, hub, userId, sortParam]);

  // Populate right sidebar with hub info card
  useEffect(() => {
    if (!hub) {
      setDetailPanel(null);
      return;
    }
    const trustLabel =
      hub.trustTier === HubTrustTier.Verified
        ? t(BrightHubStrings.HubDetail_TrustVerified)
        : hub.trustTier === HubTrustTier.Encrypted
          ? t(BrightHubStrings.HubDetail_TrustEncrypted)
          : t(BrightHubStrings.HubDetail_TrustOpen);

    setDetailPanel(
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {hub.name}
        </Typography>
        {hub.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {hub.description}
          </Typography>
        )}
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <Chip
            size="small"
            label={t(BrightHubStrings.HubDetail_MembersTemplate, {
              COUNT: String(hub.memberCount),
            })}
          />
          {hub.postCount !== undefined && (
            <Chip
              size="small"
              label={t(BrightHubStrings.HubDetail_PostsTemplate, {
                COUNT: String(hub.postCount),
              })}
            />
          )}
          <Chip size="small" variant="outlined" label={trustLabel} />
        </Box>
        {hub.rules && (
          <>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              {t(BrightHubStrings.HubDetail_Rules)}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, whiteSpace: 'pre-wrap' }}
            >
              {hub.rules}
            </Typography>
          </>
        )}
        {hub.moderatorIds && hub.moderatorIds.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Moderators
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hub.moderatorIds.length} moderator
              {hub.moderatorIds.length !== 1 ? 's' : ''}
            </Typography>
          </>
        )}
      </Box>,
    );
    return () => setDetailPanel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub, t]);

  const handleJoinLeave = useCallback(() => {
    if (!effectiveSlug || !userId) return;
    if (isMember) {
      api
        .delete(`/brighthub/hubs/${effectiveSlug}/members`, {
          data: { userId },
        })
        .then(() => setIsMember(false))
        .catch(() => {});
    } else {
      api
        .post(`/brighthub/hubs/${effectiveSlug}/members`, { userId })
        .then(() => setIsMember(true))
        .catch(() => {});
    }
  }, [api, effectiveSlug, userId, isMember]);

  const handleSubmitPost = useCallback(
    async (data: PostComposerSubmitData) => {
      if (!userId || !hub) return;
      setIsSubmitting(true);
      try {
        const body: Record<string, unknown> = {
          authorId: userId,
          content: data.content,
          hubIds: [hub._id],
        };
        if (data.replyToId) body['parentPostId'] = data.replyToId;
        const res = await api.post('/brighthub/posts', body);
        const newPost = res.data?.data;
        if (newPost) {
          setPosts((prev) => [newPost, ...prev]);
          if (currentUser && userId) {
            setAuthors((prev) =>
              prev[userId] ? prev : { ...prev, [userId]: currentUser },
            );
          }
        }
      } catch {
        // TODO: surface error
      } finally {
        setIsSubmitting(false);
      }
    },
    [api, userId, hub],
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hub) {
    return (
      <Box py={4} textAlign="center">
        <Typography color="text.secondary">Hub not found</Typography>
      </Box>
    );
  }

  const trustLabel =
    hub.trustTier === HubTrustTier.Verified
      ? t(BrightHubStrings.HubDetail_TrustVerified)
      : hub.trustTier === HubTrustTier.Encrypted
        ? t(BrightHubStrings.HubDetail_TrustEncrypted)
        : t(BrightHubStrings.HubDetail_TrustOpen);

  return (
    <Box>
      {/* Hub header card */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {hub.name}
              </Typography>
              {hub.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {hub.description}
                </Typography>
              )}
              <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={t(BrightHubStrings.HubDetail_MembersTemplate, {
                    COUNT: String(hub.memberCount),
                  })}
                  onClick={() =>
                    navigate(`/brighthub/h/${effectiveSlug}/members`)
                  }
                  clickable
                />
                {hub.postCount !== undefined && (
                  <Chip
                    size="small"
                    label={t(BrightHubStrings.HubDetail_PostsTemplate, {
                      COUNT: String(hub.postCount),
                    })}
                  />
                )}
                <Chip size="small" variant="outlined" label={trustLabel} />
                <Chip
                  size="small"
                  variant="outlined"
                  label="Leaderboard"
                  onClick={() =>
                    navigate(`/brighthub/h/${effectiveSlug}/leaderboard`)
                  }
                  clickable
                />
              </Box>
            </Box>
            <Box display="flex" gap={1} alignItems="center">
              {(hub.ownerId === userId ||
                (hub.moderatorIds ?? []).includes(userId ?? '')) && (
                <>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() =>
                      navigate(`/brighthub/h/${effectiveSlug}/settings`)
                    }
                  >
                    {t(BrightHubStrings.Nav_Settings)}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() =>
                      navigate(`/brighthub/h/${effectiveSlug}/moderation`)
                    }
                  >
                    Moderation
                  </Button>
                </>
              )}
              <Button
                variant={isMember ? 'outlined' : 'contained'}
                size="small"
                onClick={handleJoinLeave}
              >
                {isMember
                  ? t(BrightHubStrings.HubDetail_Leave)
                  : t(BrightHubStrings.HubDetail_Join)}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Sort tabs */}
      <Tabs value={sortTab} onChange={(_, v) => setSortTab(v)} sx={{ mb: 2 }}>
        <Tab label={t(BrightHubStrings.HubDetail_SortHot)} />
        <Tab label={t(BrightHubStrings.HubDetail_SortNew)} />
        <Tab label={t(BrightHubStrings.HubDetail_SortTop)} />
        <Tab label="Controversial" />
      </Tabs>

      {/* Post composer */}
      <Box sx={{ mb: 2 }}>
        <PostComposer
          currentUser={currentUser}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitPost}
          maxCharCount={HUB_POST_MAX_CHAR_COUNT}
        />
      </Box>

      {/* Posts feed */}
      {posts.length === 0 ? (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">
            {t(BrightHubStrings.HubDetail_EmptyState)}
          </Typography>
        </Box>
      ) : (
        <Timeline
          posts={posts}
          authors={authors}
          onPostClick={(postId) =>
            navigate(`/brighthub/h/${effectiveSlug}/post/${postId}`)
          }
          onReply={(postId) =>
            navigate(`/brighthub/h/${effectiveSlug}/post/${postId}`)
          }
          onUpvote={(postId) => {
            if (!userId) return;
            api
              .post(`/brighthub/posts/${postId}/upvote`, { userId })
              .catch(() => {});
            setPosts((prev) =>
              prev.map((p) =>
                p._id === postId
                  ? {
                      ...p,
                      upvoteCount: (p.upvoteCount ?? 0) + 1,
                      score: (p.score ?? 0) + 1,
                    }
                  : p,
              ),
            );
          }}
          onDownvote={(postId) => {
            if (!userId) return;
            api
              .post(`/brighthub/posts/${postId}/downvote`, { userId })
              .catch(() => {});
            setPosts((prev) =>
              prev.map((p) =>
                p._id === postId
                  ? {
                      ...p,
                      downvoteCount: (p.downvoteCount ?? 0) + 1,
                      score: (p.score ?? 0) - 1,
                    }
                  : p,
              ),
            );
          }}
          onReport={(postId) => {
            if (!userId || !hub) return;
            api
              .post(`/brighthub/posts/${postId}/report`, {
                userId,
                reason: 'Reported from hub feed',
                hubId: hub._id,
              })
              .catch(() => {});
          }}
          onDelete={(postId) => {
            if (!userId) return;
            if (!window.confirm('Delete this post?')) return;
            api
              .delete(`/brighthub/posts/${postId}`, { data: { userId } })
              .then(() =>
                setPosts((prev) => prev.filter((p) => p._id !== postId)),
              )
              .catch(() => {});
          }}
          currentUserId={userId}
          onAuthorClick={(authorId) =>
            navigate(`/brighthub/profile/${authorId}`)
          }
          onEdit={(postId) => {
            const post = posts.find((p) => p._id === postId);
            if (post) setEditingPost(post);
          }}
        />
      )}

      {/* Edit post dialog */}
      {editingPost && (
        <EditPostDialog
          open={!!editingPost}
          postId={editingPost._id}
          currentContent={editingPost.content}
          createdAt={editingPost.createdAt as string}
          onClose={() => setEditingPost(null)}
          onSave={async (pid, newContent) => {
            if (!userId) return;
            const res = await api.put(`/brighthub/posts/${pid}`, {
              userId,
              content: newContent,
            });
            const updated = res.data?.data;
            if (updated) {
              setPosts((prev) =>
                prev.map((p) => (p._id === pid ? { ...p, ...updated } : p)),
              );
            }
          }}
        />
      )}
    </Box>
  );
};

/* ── Explore Hubs page ─────────────────────────────────────── */

const ExploreHubsPage: FC = () => {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();
  const userId = userData?.id;

  const [hubs, setHubs] = useState<IBaseHub<string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const sort = activeTab === 0 ? 'trending' : 'new';
    const q = searchQuery.trim();
    const url = q
      ? `/brighthub/hubs/explore?sort=${sort}&q=${encodeURIComponent(q)}${userId ? `&userId=${userId}` : ''}`
      : `/brighthub/hubs/explore?sort=${sort}${userId ? `&userId=${userId}` : ''}`;
    api
      .get(url)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (Array.isArray(data)) setHubs(data);
        else if (data?.hubs) setHubs(data.hubs);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, userId, searchQuery, activeTab]);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        {t(BrightHubStrings.Explore_Title)}
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder={t(BrightHubStrings.Explore_SearchPlaceholder)}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab label={t(BrightHubStrings.Explore_Trending)} />
        <Tab label={t(BrightHubStrings.Explore_New)} />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : hubs.length === 0 ? (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">
            {searchQuery.trim()
              ? t(BrightHubStrings.Explore_NoResults)
              : t(BrightHubStrings.Explore_EmptyState)}
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {hubs.map((hub) => (
            <Card
              key={hub._id}
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/brighthub/h/${hub.slug ?? hub._id}`)}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {hub.name}
                    </Typography>
                    {hub.description && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {hub.description}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    size="small"
                    label={t(BrightHubStrings.HubDetail_MembersTemplate, {
                      COUNT: String(hub.memberCount),
                    })}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

/* ── Create Hub page ────────────────────────────────────────── */

const CreateHubPage: FC = () => {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();
  const userId = userData?.id;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [trustTier, setTrustTier] = useState<string>(HubTrustTier.Open);
  const [parentHubId, setParentHubId] = useState('');
  const [existingHubs, setExistingHubs] = useState<IBaseHub<string>[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate slug from name
  useEffect(() => {
    setSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  }, [name]);

  // Fetch existing hubs for parent selection
  useEffect(() => {
    api
      .get(
        `/brighthub/hubs/explore?sort=trending&limit=50${userId ? `&userId=${userId}` : ''}`,
      )
      .then((res) => {
        const data = res.data?.data;
        if (Array.isArray(data)) setExistingHubs(data);
        else if (data?.hubs) setExistingHubs(data.hubs);
      })
      .catch(() => {});
  }, [api, userId]);

  const handleSubmit = async () => {
    if (!userId || !name.trim() || !slug.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        ownerId: userId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        trustTier,
      };
      if (parentHubId) body['parentHubId'] = parentHubId;
      const res = await api.post('/brighthub/hubs', body);
      const created = res.data?.data;
      if (created?.slug) navigate(`/brighthub/h/${created.slug}`);
      else if (created?._id) navigate(`/brighthub/h/${created._id}`);
      else navigate('/brighthub/explore');
    } catch {
      /* TODO: error handling */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        {t(BrightHubStrings.CreateHub_Title)}
      </Typography>

      <TextField
        fullWidth
        label={t(BrightHubStrings.CreateHub_NameLabel)}
        placeholder={t(BrightHubStrings.CreateHub_NamePlaceholder)}
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label={t(BrightHubStrings.CreateHub_SlugLabel)}
        placeholder={t(BrightHubStrings.CreateHub_SlugPlaceholder)}
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        sx={{ mb: 2 }}
        helperText={slug ? `/brighthub/h/${slug}` : ''}
      />

      <TextField
        fullWidth
        multiline
        minRows={3}
        label={t(BrightHubStrings.CreateHub_DescriptionLabel)}
        placeholder={t(BrightHubStrings.CreateHub_DescriptionPlaceholder)}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        select
        label={t(BrightHubStrings.CreateHub_TrustTierLabel)}
        value={trustTier}
        onChange={(e) => setTrustTier(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{ select: { native: true } }}
      >
        <option value={HubTrustTier.Open}>
          {t(BrightHubStrings.HubDetail_TrustOpen)}
        </option>
        <option value={HubTrustTier.Verified}>
          {t(BrightHubStrings.HubDetail_TrustVerified)}
        </option>
        <option value={HubTrustTier.Encrypted}>
          {t(BrightHubStrings.HubDetail_TrustEncrypted)}
        </option>
      </TextField>

      <TextField
        fullWidth
        select
        label={t(BrightHubStrings.CreateHub_ParentHubLabel)}
        value={parentHubId}
        onChange={(e) => setParentHubId(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{ select: { native: true } }}
      >
        <option value="">{t(BrightHubStrings.CreateHub_ParentHubNone)}</option>
        {existingHubs
          .filter((h) => !h.parentHubId)
          .map((h) => (
            <option key={h._id} value={h._id}>
              {h.name}
            </option>
          ))}
      </TextField>

      <Box display="flex" gap={1}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim() || !slug.trim() || submitting}
        >
          {submitting ? (
            <CircularProgress size={20} />
          ) : (
            t(BrightHubStrings.CreateHub_Submit)
          )}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/brighthub')}>
          {t(BrightHubStrings.CreateHub_Cancel)}
        </Button>
      </Box>
    </Box>
  );
};

/* ── Hub Settings page ─────────────────────────────────────── */

const HubSettingsPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const { tBranded: t } = useI18n();
  const navigate = useNavigate();
  const userId = userData?.id;

  const [hub, setHub] = useState<IBaseHub<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [trustTier, setTrustTier] = useState('open');

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/brighthub/hubs/${slug}${userId ? `?userId=${userId}` : ''}`)
      .then((res) => {
        const data = res.data?.data;
        const h = data?.hub ?? data;
        if (h) {
          setHub(h);
          setName(h.name ?? '');
          setDescription(h.description ?? '');
          setRules(h.rules ?? '');
          setTrustTier(h.trustTier ?? 'open');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api, slug, userId]);

  const handleSave = async () => {
    if (!hub || !userId) return;
    setSaving(true);
    try {
      await api.put(`/brighthub/hubs/${hub._id}`, {
        userId,
        name: name.trim(),
        description: description.trim(),
        rules: rules.trim(),
        trustTier,
      });
      navigate(`/brighthub/h/${hub.slug ?? hub._id}`);
    } catch {
      /* TODO: error toast */
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hub) {
    return (
      <Box py={4} textAlign="center">
        <Typography color="text.secondary">Hub not found</Typography>
      </Box>
    );
  }

  const isOwnerOrMod =
    hub.ownerId === userId || (hub.moderatorIds ?? []).includes(userId ?? '');

  if (!isOwnerOrMod) {
    return (
      <Box py={4} textAlign="center">
        <Typography color="text.secondary">
          You don't have permission to edit this hub.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        {t(BrightHubStrings.HubDetail_About)} — {hub.name}
      </Typography>

      <TextField
        fullWidth
        label={t(BrightHubStrings.CreateHub_NameLabel)}
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        multiline
        minRows={2}
        label={t(BrightHubStrings.CreateHub_DescriptionLabel)}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        multiline
        minRows={4}
        label={t(BrightHubStrings.HubDetail_Rules)}
        value={rules}
        onChange={(e) => setRules(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        select
        label={t(BrightHubStrings.CreateHub_TrustTierLabel)}
        value={trustTier}
        onChange={(e) => setTrustTier(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{ select: { native: true } }}
      >
        <option value="open">{t(BrightHubStrings.HubDetail_TrustOpen)}</option>
        <option value="verified">
          {t(BrightHubStrings.HubDetail_TrustVerified)}
        </option>
        <option value="encrypted">
          {t(BrightHubStrings.HubDetail_TrustEncrypted)}
        </option>
      </TextField>

      <Box display="flex" gap={1}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          {saving ? (
            <CircularProgress size={20} />
          ) : (
            t(BrightHubStrings.HubManager_Save)
          )}
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(`/brighthub/h/${hub.slug ?? hub._id}`)}
        >
          {t(BrightHubStrings.CreateHub_Cancel)}
        </Button>
        {hub.ownerId === userId && (
          <Button
            variant="outlined"
            color="error"
            onClick={async () => {
              if (
                !window.confirm(
                  'Are you sure you want to delete this hub? This cannot be undone.',
                )
              )
                return;
              try {
                await api.delete(`/brighthub/hubs/${hub._id}`, {
                  data: { ownerId: userId },
                });
                navigate('/brighthub');
              } catch {
                /* TODO: error toast */
              }
            }}
          >
            {t(BrightHubStrings.HubManager_DeleteHub)}
          </Button>
        )}
      </Box>
    </Box>
  );
};

/* ── Hub Moderation page ───────────────────────────────────── */

interface PostReport {
  _id: string;
  postId: string;
  reporterId: string;
  reason: string;
  hubId?: string;
  status: string;
  createdAt: string;
}

const HubModerationPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const userId = userData?.id;

  const [hub, setHub] = useState<IBaseHub<string> | null>(null);
  const [reports, setReports] = useState<PostReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/brighthub/hubs/${slug}${userId ? `?userId=${userId}` : ''}`)
      .then((res) => {
        const data = res.data?.data;
        const h = data?.hub ?? data;
        if (h) setHub(h);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api, slug, userId]);

  useEffect(() => {
    if (!hub) return;
    api
      .get(`/brighthub/posts/reports?status=${statusFilter}&hubId=${hub._id}`)
      .then((res) => {
        const data = res.data?.data;
        if (data?.reports) setReports(data.reports);
      })
      .catch(() => {});
  }, [api, hub, statusFilter]);

  const handleReview = async (
    reportId: string,
    action: 'dismiss' | 'action',
  ) => {
    if (!userId) return;
    await api
      .post(`/brighthub/posts/reports/${reportId}/review`, {
        reviewerId: userId,
        action,
      })
      .catch(() => {});
    setReports((prev) => prev.filter((r) => r._id !== reportId));
  };

  const handleRemovePost = async (postId: string) => {
    if (!hub || !userId) return;
    await api
      .post(`/brighthub/hubs/${hub._id}/remove-post`, {
        moderatorId: userId,
        postId,
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hub) {
    return (
      <Box py={4} textAlign="center">
        <Typography color="text.secondary">Hub not found</Typography>
      </Box>
    );
  }

  const isOwnerOrMod =
    hub.ownerId === userId || (hub.moderatorIds ?? []).includes(userId ?? '');

  if (!isOwnerOrMod) {
    return (
      <Box py={4} textAlign="center">
        <Typography color="text.secondary">
          You don't have permission to moderate this hub.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Moderation — {hub.name}
      </Typography>

      <Tabs
        value={statusFilter}
        onChange={(_, v) => setStatusFilter(v)}
        sx={{ mb: 2 }}
      >
        <Tab value="pending" label="Pending" />
        <Tab value="dismissed" label="Dismissed" />
        <Tab value="actioned" label="Actioned" />
      </Tabs>

      {reports.length === 0 ? (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">
            No {statusFilter} reports.
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {reports.map((report) => (
            <Card key={report._id} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" fontWeight="bold">
                  Post: {report.postId.slice(0, 12)}…
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reason: {report.reason}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Reported {new Date(report.createdAt).toLocaleDateString()}
                </Typography>
                {statusFilter === 'pending' && (
                  <Box display="flex" gap={1} mt={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleReview(report._id, 'dismiss')}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={async () => {
                        await handleRemovePost(report.postId);
                        await handleReview(report._id, 'action');
                      }}
                    >
                      Remove Post
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        navigate(`/brighthub/thread/${report.postId}`)
                      }
                    >
                      View Post
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

/* ── Search page ───────────────────────────────────────────── */

const SearchPage: FC = () => {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const userId = userData?.id;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IBasePostData<string>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get(
          `/brighthub/search?q=${encodeURIComponent(query.trim())}${userId ? `&userId=${userId}` : ''}`,
        )
        .then((res) => {
          const data = res.data?.data;
          if (data?.posts) setResults(data.posts);
          else if (Array.isArray(data)) setResults(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300); // debounce
    return () => clearTimeout(timeout);
  }, [api, query, userId]);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Search
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder="Search posts and users…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
      />
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : results.length > 0 ? (
        <Timeline
          posts={results}
          onPostClick={(postId) => navigate(`/brighthub/thread/${postId}`)}
          onAuthorClick={(authorId) =>
            navigate(`/brighthub/profile/${authorId}`)
          }
          currentUserId={userId}
        />
      ) : query.trim() ? (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">
            No results for "{query}"
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};

/* ── Hub Members page ──────────────────────────────────────── */

interface HubLeaderboardEntry {
  userId: string;
  score: number;
  postCount: number;
  upvotesReceived: number;
}

const HubLeaderboardPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const userId = userData?.id;

  const [hub, setHub] = useState<IBaseHub<string> | null>(null);
  const [entries, setEntries] = useState<HubLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/brighthub/hubs/${slug}${userId ? `?userId=${userId}` : ''}`)
      .then((res) => {
        const data = res.data?.data;
        const h = data?.hub ?? data;
        if (h) setHub(h);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api, slug, userId]);

  useEffect(() => {
    if (!hub) return;
    api
      .get(`/brighthub/hubs/${hub._id}/leaderboard`)
      .then((res) => {
        const data = res.data?.data;
        if (data?.leaderboard) setEntries(data.leaderboard);
      })
      .catch(() => {});
  }, [api, hub]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hub) {
    return (
      <Box py={4} textAlign="center">
        <Typography color="text.secondary">Hub not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" fontWeight="bold">
          {hub.name} — Leaderboard
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={() => navigate(`/brighthub/h/${hub.slug ?? hub._id}`)}
        >
          Back to Hub
        </Button>
      </Box>

      {entries.length === 0 ? (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">
            No reputation data yet. Start posting and voting!
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {entries.map((entry, idx) => (
            <Card
              key={entry.userId}
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/brighthub/profile/${entry.userId}`)}
            >
              <CardContent
                sx={{
                  py: 1,
                  '&:last-child': { pb: 1 },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Typography
                  variant="h6"
                  color={idx < 3 ? 'primary.main' : 'text.secondary'}
                  sx={{ minWidth: 32, textAlign: 'center' }}
                >
                  #{idx + 1}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {entry.userId.slice(0, 12)}…
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entry.postCount} posts · {entry.upvotesReceived} upvotes
                    received
                  </Typography>
                </Box>
                <Chip
                  label={`${entry.score} rep`}
                  size="small"
                  color={entry.score > 100 ? 'primary' : 'default'}
                />
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

/* ── Hub Members page (original) ───────────────────────────── */

interface HubMemberItem {
  _id: string;
  username: string;
  displayName: string;
  profilePictureUrl?: string;
}

const HubMembersPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const userId = userData?.id;

  const [hub, setHub] = useState<IBaseHub<string> | null>(null);
  const [members, setMembers] = useState<HubMemberItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/brighthub/hubs/${slug}${userId ? `?userId=${userId}` : ''}`)
      .then((res) => {
        const data = res.data?.data;
        const h = data?.hub ?? data;
        if (h) setHub(h);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api, slug, userId]);

  useEffect(() => {
    if (!hub) return;
    api
      .get(`/brighthub/hubs/${hub._id}/members-list`)
      .then((res) => {
        const data = res.data?.data;
        if (data?.items) setMembers(data.items);
        else if (Array.isArray(data)) setMembers(data);
      })
      .catch(() => {});
  }, [api, hub]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hub) {
    return (
      <Box py={4} textAlign="center">
        <Typography color="text.secondary">Hub not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" fontWeight="bold">
          {hub.name} — Members ({hub.memberCount})
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={() => navigate(`/brighthub/h/${hub.slug ?? hub._id}`)}
        >
          Back to Hub
        </Button>
      </Box>

      {members.length === 0 ? (
        <Box py={4} textAlign="center">
          <Typography color="text.secondary">No members found.</Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {members.map((member) => (
            <Card
              key={member._id}
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/brighthub/profile/${member._id}`)}
            >
              <CardContent
                sx={{
                  py: 1,
                  '&:last-child': { pb: 1 },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 'bold',
                  }}
                >
                  {(member.displayName || member.username || '?')
                    .charAt(0)
                    .toUpperCase()}
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {member.displayName || member.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{member.username}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

/* ── Route tree ────────────────────────────────────────────── */

/** Internal layout with notification bell in header */
const BrightHubRoutesLayout: FC = () => {
  return (
    <Box>
      <Outlet />
    </Box>
  );
};

export const BrightHubRoutes: FC = () => (
  <Routes>
    <Route element={<OuterLayout />}>
      <Route element={<BrightHubRoutesLayout />}>
        <Route index element={<TimelinePage />} />
        <Route path="explore" element={<ExploreHubsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="h/create" element={<CreateHubPage />} />
        <Route path="h/:slug/post/:id" element={<ThreadPage />} />
        <Route path="h/:slug/settings" element={<HubSettingsPage />} />
        <Route path="h/:slug/moderation" element={<HubModerationPage />} />
        <Route path="h/:slug/members" element={<HubMembersPage />} />
        <Route path="h/:slug/leaderboard" element={<HubLeaderboardPage />} />
        <Route path="h/:slug/:subSlug" element={<HubDetailPage />} />
        <Route path="h/:slug" element={<HubDetailPage />} />
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
