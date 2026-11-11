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

function AdminRoute() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminPage /> : <Navigate to="/" replace />;
}

function AdminTagsRoute() {
  const { user } = useAuth();
  return user?.role === "admin" ? <TagEditorPage /> : <Navigate to="/" replace />;
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-muted-foreground">
        Загружаем…
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
        <Route path="upload" element={<UploadPage />} />
        <Route path="admin" element={<AdminRoute />} />
        <Route path="admin/tags" element={<AdminTagsRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
