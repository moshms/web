import { useEffect, useState, type FormEvent } from "react";
import { ListMusic, Plus } from "lucide-react";

import { api, ApiError, type Playlist } from "@/api";
import { useAuth } from "@/auth";
import { PlaylistCard } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { can, P } from "@/permissions";
import { useToast } from "@/toast";

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const canCreate = can(user, P.PLAYLIST_CREATE);

  const load = () =>
    api
      .playlists()
      .then(setPlaylists)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить плейлисты"),
      );

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setBusy(true);
    try {
      await api.createPlaylist(name.trim());
      toast(`Плейлист «${name.trim()}» создан`);
      setName("");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось создать плейлист");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Плейлисты" description="Личные и публичные подборки." />

      {canCreate && (
        <form onSubmit={(event) => void create(event)} className="flex max-w-xl gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Название нового плейлиста"
          />
          <Button type="submit" disabled={busy || !name.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Button>
        </form>
      )}

      {error && (
        <div className="mc-surface border-destructive/30 p-4 text-sm text-destructive">{error}</div>
      )}

      {playlists.length === 0 ? (
        <EmptyState
          icon={<ListMusic className="h-5 w-5" />}
          title="Плейлистов пока нет"
          description="Создайте первую подборку и добавляйте треки из библиотеки."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
