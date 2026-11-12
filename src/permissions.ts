import type { User } from "@/api";

export const P = {
  ADMINISTRATOR: 1 << 0,
  MANAGE_ROLES: 1 << 1,
  MANAGE_USERS: 1 << 2,
  MANAGE_STORAGES: 1 << 3,
  MANAGE_LIBRARIES: 1 << 4,
  RUN_SCANS: 1 << 5,
  VIEW_AUDIT_LOG: 1 << 6,
  LIBRARY_VIEW: 1 << 10,
  LIBRARY_DOWNLOAD: 1 << 11,
  LIBRARY_UPLOAD: 1 << 12,
  LIBRARY_EDIT_TAGS: 1 << 13,
  LIBRARY_DELETE_FILES: 1 << 14,
  TRANSCODE: 1 << 15,
  PLAYLIST_VIEW: 1 << 20,
  PLAYLIST_EDIT: 1 << 21,
  PLAYLIST_MANAGE: 1 << 22,
  PLAYLIST_CREATE: 1 << 23,
  PLAYLIST_SHARE: 1 << 24,
  PLAYLIST_VIEW_ALL: 1 << 25,
} as const;

export function can(user: User | null | undefined, permission: number) {
  if (!user) {
    return false;
  }
  return (user.permissions & P.ADMINISTRATOR) !== 0 || (user.permissions & permission) === permission;
}

export function canLibrary(
  user: User | null | undefined,
  libraryId: string | null | undefined,
  permission: number,
) {
  if (!user || !libraryId) {
    return false;
  }
  if ((user.permissions & P.ADMINISTRATOR) !== 0) {
    return true;
  }
  const library = user.libraries.find((item) => item.id === libraryId);
  return Boolean(library && (library.permissions & permission) === permission);
}

export function canAnyLibrary(user: User | null | undefined, permission: number) {
  if (!user) {
    return false;
  }
  if ((user.permissions & P.ADMINISTRATOR) !== 0) {
    return true;
  }
  return user.libraries.some((library) => (library.permissions & permission) === permission);
}

export function canManageServer(user: User | null | undefined) {
  return (
    can(user, P.ADMINISTRATOR) ||
    can(user, P.MANAGE_ROLES) ||
    can(user, P.MANAGE_USERS) ||
    can(user, P.MANAGE_STORAGES) ||
    can(user, P.MANAGE_LIBRARIES) ||
    can(user, P.RUN_SCANS) ||
    can(user, P.VIEW_AUDIT_LOG)
  );
}

export function canEditTrack(
  user: User | null | undefined,
  track: { library_id: string; uploaded_by: string | null },
) {
  return (
    canLibrary(user, track.library_id, P.LIBRARY_EDIT_TAGS) ||
    (canLibrary(user, track.library_id, P.LIBRARY_UPLOAD) &&
      Boolean(user && track.uploaded_by === user.id))
  );
}
