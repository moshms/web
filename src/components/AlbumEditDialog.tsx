import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Loader2, Pencil } from "lucide-react";

import { api, ApiError, type AlbumDetail, type Features } from "@/api";
import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/toast";

type AlbumEditDialogProps = {
  albumId: string | null;
  open: boolean;
  features: Features | null;
  onClose: () => void;
  onSaved?: () => void;
};

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

export function AlbumEditDialog({
  albumId,
  open,
  features,
  onClose,
  onSaved,
}: AlbumEditDialogProps) {
  const { toast } = useToast();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [trackArtist, setTrackArtist] = useState("");
  const [year, setYear] = useState("");
  const [genres, setGenres] = useState("");
  const [artwork, setArtwork] = useState<{ data: string; mime: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !albumId) {
      return;
    }

    setLoading(true);
    setError(null);
    setArtwork(null);
    setPreview(null);
    setTrackArtist("");
    setGenres("");
    api
      .album(albumId)
      .then((loaded) => {
        setAlbum(loaded);
        setTitle(loaded.title);
        setArtist(loaded.album_artist);
        setYear(loaded.year > 0 ? String(loaded.year) : "");
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить альбом"),
      )
      .finally(() => setLoading(false));
  }, [open, albumId]);

  const onArtwork = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Обложка больше 12 МБ");
      return;
    }

    try {
      const dataUrl = await readFile(file);
      setPreview(dataUrl);
      setArtwork({ data: dataUrl.split(",")[1] ?? "", mime: file.type || "image/jpeg" });
    } catch {
      setError("Не удалось прочитать обложку");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!album || !title.trim() || !artist.trim()) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.admin.createTagEdit({
        track_ids: album.tracks.map((track) => track.id),
        changes: {
          album: title.trim(),
          album_artist: artist.trim(),
          ...(trackArtist.trim() ? { artist: trackArtist.trim() } : {}),
          ...(year.trim() ? { year: Number(year) } : {}),
          ...(genres.trim()
            ? {
                genres: genres
                  .split(",")
                  .map((genre) => genre.trim())
                  .filter(Boolean),
              }
            : {}),
        },
        ...(artwork
          ? { artwork_base64: artwork.data, artwork_mime: artwork.mime }
          : {}),
      });
      toast(
        `Альбом «${title.trim()}» отправлен воркеру. Обновление появится после обработки.`,
      );
      onSaved?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось сохранить альбом");
    } finally {
      setSaving(false);
    }
  };

  const available = Boolean(features?.tag_editor);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Редактировать альбом"
      description={
        album
          ? `${album.track_count} треков · изменения применятся ко всему альбому`
          : "Загружаем данные альбома…"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            type="submit"
            form="album-edit-form"
            disabled={!available || saving || loading || !album}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="mr-2 h-4 w-4" />
            )}
            Сохранить
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Загружаем…
        </div>
      ) : (
        <form id="album-edit-form" onSubmit={(event) => void submit(event)} className="space-y-4">
          {!available && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Редактор недоступен: воркер не запущен. Изменения можно будет сохранить после
              включения профиля worker.
            </p>
          )}

          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="group relative block h-32 w-32 shrink-0 cursor-pointer overflow-hidden rounded-xl">
              {preview ? (
                <img src={preview} alt="Новая обложка" className="h-full w-full object-cover" />
              ) : (
                <Artwork
                  albumId={album?.id}
                  title={album?.title ?? "Обложка"}
                  className="h-full w-full"
                />
              )}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                <ImagePlus className="h-5 w-5" />
                Заменить
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => void onArtwork(event)} />
            </label>

            <div className="min-w-0 flex-1 space-y-3">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Название альбома</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mc-field"
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Album artist</span>
                  <input
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    className="mc-field"
                    required
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Год</span>
                  <input
                    value={year}
                    onChange={(event) => setYear(event.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="—"
                    className="mc-field"
                  />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Исполнитель треков</span>
                <input
                  value={trackArtist}
                  onChange={(event) => setTrackArtist(event.target.value)}
                  placeholder="Не менять"
                  className="mc-field"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Жанры</span>
                <input
                  value={genres}
                  onChange={(event) => setGenres(event.target.value)}
                  placeholder="Через запятую, необязательно"
                  className="mc-field"
                />
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-xs text-muted-foreground">
            Название, album artist, год, жанры и обложка будут записаны во все треки
            альбома. «Исполнитель треков» заполняйте, только если нужно заменить
            исполнителя у всех треков.
          </p>
        </form>
      )}
    </Dialog>
  );
}
