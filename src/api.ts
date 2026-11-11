export type Role = "admin" | "uploader" | "listener";

export type User = {
  id: string;
  username: string;
  role: Role;
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
};

export type SetupStatus = {
  required: boolean;
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
  setup: (username: string, password: string) =>
    post<User>("/api/v1/auth/setup", { username, password }),
  login: (username: string, password: string) =>
    post<User>("/api/v1/auth/login", { username, password }),
  logout: () => post<void>("/api/v1/auth/logout"),
  me: () => request<User>("/api/v1/auth/me"),

  features: () => request<Features>("/api/v1/features"),
  libraries: () => request<Library[]>("/api/v1/libraries"),
  artists: () => request<Artist[]>("/api/v1/artists"),
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

  streamUrl: (trackId: string) => `/api/v1/stream/${trackId}`,
  artworkUrl: (albumId: string) => `/api/v1/artwork/${albumId}`,

  admin: {
    scan: () => post<LibraryScanResult[]>("/api/v1/admin/scan"),
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
