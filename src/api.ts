export type Role = "admin" | "uploader" | "listener";

export type RoleRecord = {
  id: string;
  name: string;
  color: number | null;
  position: number;
  permissions: number;
  is_everyone: boolean;
  member_count: number;
};

export type LibraryAccess = {
  id: string;
  name: string;
  permissions: number;
};

export type User = {
  id: string;
  username: string;
  role: Role;
  roles: RoleRecord[];
  permissions: number;
  libraries: LibraryAccess[];
};

export type PermissionInfo = {
  bit: number;
  key: string;
  label: string;
  group: string;
};

export type PermissionOverwrite = {
  resource_type: "library" | "playlist";
  resource_id: string;
  target_type: "role" | "user";
  target_id: string;
  allow: number;
  deny: number;
};

export type AuditRecord = {
  id: string;
  actor: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  changes: Record<string, unknown>;
  created_at: string;
};

export type Artist = {
  id: string;
  name: string;
  album_count: number;
  track_count: number;
};

export type Album = {
  id: string;
  title: string;
  year: number;
  album_artist_id: string;
  album_artist: string;
  artwork_id: string | null;
  track_count: number;
  duration_ms: number;
};

export type Track = {
  id: string;
  title: string;
  disc_no: number;
  track_no: number;
  duration_ms: number | null;
  artist: string | null;
  album_id: string | null;
  album: string | null;
  album_artist: string | null;
  album_artist_id: string | null;
  album_year: number | null;
  file_key: string;
  size: number;
  format: string | null;
  library_id: string;
  uploaded_by: string | null;
};

export type AlbumDetail = Album & {
  tracks: Track[];
};

export type SearchResults = {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
};

export type Playlist = {
  id: string;
  name: string;
  owner: string;
  is_public: boolean;
  song_count: number;
  duration_ms: number;
};

export type PlaylistDetail = {
  playlist: Playlist;
  tracks: Track[];
  hidden_count: number;
  permissions: number;
};

export type Favorites = {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
};

export type Features = {
  worker: boolean;
  transcoder: boolean;
  tag_editor: boolean;
  monitoring: boolean;
};

export type Storage = {
  id: string;
  name: string;
  kind: string;
  access: string;
  status: string;
  config: Record<string, unknown>;
};

export type Library = {
  id: string;
  name: string;
  storage_id: string;
  root_prefix: string;
  is_import_target: boolean;
};

export type AdminUser = {
  id: string;
  username: string;
  role: Role;
  is_active: boolean;
  roles: RoleRecord[];
};

export type SubsonicCredentials = {
  username: string;
  password: string;
};

export type ApiToken = {
  id: string;
  name: string;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
};

export type CreatedToken = {
  id: string;
  name: string;
  token: string;
};

export type SessionInfo = {
  id: string;
  client_name: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  current: boolean;
};

export type SetupStatus = {
  required: boolean;
  token_required: boolean;
};

export type ScanStats = {
  files_seen: number;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  tags_read: number;
  duplicates: number;
  errors: number;
};

export type JobRecord = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
};

export type TagChanges = {
  title?: string;
  artist?: string;
  album_artist?: string;
  album?: string;
  year?: number;
  track_no?: number;
  disc_no?: number;
  genres?: string[];
};

export type TagEdit = {
  id: string;
  user_id: string;
  track_ids: string[];
  changes: TagChanges;
  artwork_mime: string | null;
  status: string;
  error: string | null;
};

export type LibraryScanResult = {
  library_id: string;
  library_name: string;
  stats: ScanStats | null;
  error: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // ignore malformed error bodies
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

function put(path: string): Promise<void> {
  return request<void>(path, { method: "PUT" });
}

function remove(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" });
}

export const api = {
  setupStatus: () => request<SetupStatus>("/api/v1/auth/setup"),
  setup: (username: string, password: string, setupToken: string) =>
    post<User>("/api/v1/auth/setup", {
      username,
      password,
      setup_token: setupToken,
    }),
  login: (username: string, password: string) =>
    post<User>("/api/v1/auth/login", { username, password }),
  logout: () => post<void>("/api/v1/auth/logout"),
  me: () => request<User>("/api/v1/auth/me"),
  subsonicCredentials: () => request<SubsonicCredentials>("/api/v1/auth/subsonic"),
  rotateSubsonic: () => post<SubsonicCredentials>("/api/v1/auth/subsonic/rotate"),
  changePassword: (body: { current_password: string; new_password: string }) =>
    post<void>("/api/v1/auth/password", body),
  sessions: () => request<SessionInfo[]>("/api/v1/auth/sessions"),
  deleteOtherSessions: () => remove("/api/v1/auth/sessions"),
  deleteSession: (id: string) => remove(`/api/v1/auth/sessions/${id}`),
  tokens: () => request<ApiToken[]>("/api/v1/auth/tokens"),
  createToken: (body: { name: string; expires_in_days?: number }) =>
    post<CreatedToken>("/api/v1/auth/tokens", body),
  deleteToken: (id: string) => remove(`/api/v1/auth/tokens/${id}`),

  features: () => request<Features>("/api/v1/features"),
  libraries: () => request<Library[]>("/api/v1/libraries"),
  artists: () => request<Artist[]>("/api/v1/artists"),
  artistTracks: (artistId: string) =>
    request<Track[]>(`/api/v1/artists/${artistId}/tracks`),
  albums: (artistId?: string) =>
    request<Album[]>(
      `/api/v1/albums${artistId ? `?artist_id=${encodeURIComponent(artistId)}` : ""}`,
    ),
  album: (id: string) => request<AlbumDetail>(`/api/v1/albums/${id}`),
  search: (query: string) =>
    request<SearchResults>(`/api/v1/search?q=${encodeURIComponent(query)}`),

  playlists: () => request<Playlist[]>("/api/v1/playlists"),
  playlist: (id: string) => request<PlaylistDetail>(`/api/v1/playlists/${id}`),
  createPlaylist: (name: string) =>
    post<PlaylistDetail>("/api/v1/playlists", { name }),
  updatePlaylist: (id: string, body: { name?: string; is_public?: boolean }) =>
    patch<PlaylistDetail>(`/api/v1/playlists/${id}`, body),
  deletePlaylist: (id: string) => remove(`/api/v1/playlists/${id}`),
  addToPlaylist: (id: string, trackId: string) =>
    post<PlaylistDetail>(`/api/v1/playlists/${id}/tracks`, { track_id: trackId }),
  removeFromPlaylist: (id: string, position: number) =>
    remove(`/api/v1/playlists/${id}/tracks/${position}`),

  favorites: () => request<Favorites>("/api/v1/favorites"),
  starTrack: (id: string) => put(`/api/v1/tracks/${id}/star`),
  unstarTrack: (id: string) => remove(`/api/v1/tracks/${id}/star`),
  starAlbum: (id: string) => put(`/api/v1/albums/${id}/star`),
  unstarAlbum: (id: string) => remove(`/api/v1/albums/${id}/star`),
  starArtist: (id: string) => put(`/api/v1/artists/${id}/star`),
  unstarArtist: (id: string) => remove(`/api/v1/artists/${id}/star`),

  streamUrl: (trackId: string) => `/api/v1/stream/${trackId}`,
  downloadUrl: (trackId: string) => `/api/v1/download/${trackId}`,
  artworkUrl: (albumId: string) => `/api/v1/artwork/${albumId}`,

  roles: () => request<RoleRecord[]>("/api/v1/roles"),
  permissionCatalog: () => request<PermissionInfo[]>("/api/v1/permissions"),
  createRole: (body: { name: string; color?: number | null; permissions: number }) =>
    post<RoleRecord>("/api/v1/roles", body),
  updateRole: (
    id: string,
    body: { name?: string; color?: number | null; permissions?: number },
  ) => patch<RoleRecord>(`/api/v1/roles/${id}`, body),
  deleteRole: (id: string) => remove(`/api/v1/roles/${id}`),
  reorderRoles: (ids: string[]) => request<void>("/api/v1/roles/order", { method: "PUT", body: JSON.stringify({ ids }) }),
  assignRole: (userId: string, roleId: string) =>
    request<void>(`/api/v1/users/${userId}/roles/${roleId}`, { method: "PUT" }),
  unassignRole: (userId: string, roleId: string) =>
    remove(`/api/v1/users/${userId}/roles/${roleId}`),
  availableRoles: () =>
    request<{ id: string; name: string; color: number | null; is_everyone: boolean }[]>(
      "/api/v1/roles/available",
    ),
  availableUsers: () => request<{ id: string; username: string }[]>("/api/v1/users/available"),
  auditLog: () => request<AuditRecord[]>("/api/v1/audit-log"),
  libraryPermissions: (id: string) =>
    request<PermissionOverwrite[]>(`/api/v1/libraries/${id}/permissions`),
  setLibraryPermission: (
    id: string,
    targetType: "role" | "user",
    targetId: string,
    body: { allow: number; deny: number },
  ) =>
    request<PermissionOverwrite>(
      `/api/v1/libraries/${id}/permissions/${targetType}/${targetId}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteLibraryPermission: (id: string, targetType: "role" | "user", targetId: string) =>
    remove(`/api/v1/libraries/${id}/permissions/${targetType}/${targetId}`),
  playlistPermissions: (id: string) =>
    request<PermissionOverwrite[]>(`/api/v1/playlists/${id}/permissions`),
  setPlaylistPermission: (
    id: string,
    targetType: "role" | "user",
    targetId: string,
    body: { allow: number; deny: number },
  ) =>
    request<PermissionOverwrite>(
      `/api/v1/playlists/${id}/permissions/${targetType}/${targetId}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deletePlaylistPermission: (id: string, targetType: "role" | "user", targetId: string) =>
    remove(`/api/v1/playlists/${id}/permissions/${targetType}/${targetId}`),
  admin: {
    scan: () => post<LibraryScanResult[]>("/api/v1/admin/scan"),
    scanAsync: () => post<{ job_id: string }>("/api/v1/admin/scan/async"),
    storages: () => request<Storage[]>("/api/v1/admin/storages"),
    createStorage: (body: {
      name: string;
      kind: string;
      access: string;
      config: Record<string, unknown>;
    }) => post<Storage>("/api/v1/admin/storages", body),
    deleteStorage: (id: string) => remove(`/api/v1/admin/storages/${id}`),
    libraries: () => request<Library[]>("/api/v1/admin/libraries"),
    createLibrary: (body: {
      name: string;
      storage_id: string;
      root_prefix?: string;
      is_import_target?: boolean;
      access?: { everyone: boolean; roles: string[]; users: string[] };
    }) => post<Library>("/api/v1/admin/libraries", body),
    deleteLibrary: (id: string) => remove(`/api/v1/admin/libraries/${id}`),
    users: () => request<AdminUser[]>("/api/v1/admin/users"),
    createUser: (body: { username: string; password: string; role: Role }) =>
      post<AdminUser>("/api/v1/admin/users", body),
    updateUser: (
      id: string,
      body: { role?: Role; is_active?: boolean; password?: string },
    ) => patch<AdminUser>(`/api/v1/admin/users/${id}`, body),
    deleteUser: (id: string) => remove(`/api/v1/admin/users/${id}`),
    jobs: () => request<JobRecord[]>("/api/v1/admin/jobs"),
    retryJob: (id: string) => post<void>(`/api/v1/admin/jobs/${id}/retry`),
    tagEdits: () => request<TagEdit[]>("/api/v1/admin/tag-edits"),
    createTagEdit: (body: {
      track_ids: string[];
      changes: TagChanges;
      artwork_base64?: string;
      artwork_mime?: string;
    }) => post<TagEdit>("/api/v1/admin/tag-edits", body),
  },
};
