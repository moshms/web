import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { api } from "@/api";
import { useAuth } from "@/auth";
import { Layout } from "@/components/Layout";
import { AlbumPage } from "@/pages/AlbumPage";
import { AdminPage } from "@/pages/Admin";
import { ArtistPage } from "@/pages/ArtistPage";
import { FavoritesPage } from "@/pages/Favorites";
import { LibraryPage } from "@/pages/Library";
import { Login } from "@/pages/Login";
import { PlaylistPage } from "@/pages/PlaylistPage";
import { PlaylistsPage } from "@/pages/Playlists";
import { SearchPage } from "@/pages/Search";
import { Setup } from "@/pages/Setup";
import { TagEditorPage } from "@/pages/TagEditor";
import { UploadPage } from "@/pages/Upload";
import { RolesPage } from "@/pages/RolesPage";
import { can, canAnyLibrary, canManageServer, P } from "@/permissions";

function AdminRoute() {
  const { user } = useAuth();
  return canManageServer(user) ? <AdminPage /> : <Navigate to="/" replace />;
}

function AdminRolesRoute() {
  const { user } = useAuth();
  return can(user, P.MANAGE_ROLES) ? <RolesPage /> : <Navigate to="/" replace />;
}

function AdminTagsRoute() {
  const { user } = useAuth();
  return canAnyLibrary(user, P.LIBRARY_EDIT_TAGS) ||
    canAnyLibrary(user, P.LIBRARY_UPLOAD) ? (
    <TagEditorPage />
  ) : (
    <Navigate to="/" replace />
  );
}

function UploadRoute() {
  const { user } = useAuth();
  return canAnyLibrary(user, P.LIBRARY_UPLOAD) ? <UploadPage /> : <Navigate to="/" replace />;
}

export default function App() {
  const { user, loading, refresh } = useAuth();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    api
      .setupStatus()
      .then((status) => setSetupRequired(status.required))
      .catch(() => setSetupRequired(false));
  }, [loading, user]);

  if (loading || setupRequired === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
          Загружаем…
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <Setup
        onComplete={() => {
          setSetupRequired(false);
          void refresh();
        }}
      />
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LibraryPage />} />
        <Route path="artists/:artistId" element={<ArtistPage />} />
        <Route path="albums/:albumId" element={<AlbumPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="playlists/:playlistId" element={<PlaylistPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="upload" element={<UploadRoute />} />
        <Route path="admin" element={<AdminRoute />} />
        <Route path="admin/tags" element={<AdminTagsRoute />} />
        <Route path="admin/roles" element={<AdminRolesRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
