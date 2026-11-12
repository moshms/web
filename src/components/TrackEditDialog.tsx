import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Loader2, Pencil } from "lucide-react";

import { api, ApiError, type Features, type TagChanges, type Track } from "@/api";
import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/toast";

type TrackEditDialogProps = {
  track: Track | null;
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

export function TrackEditDialog({
  track,
  open,
  features,
  onClose,
  onSaved,
}: TrackEditDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState("");
  const [trackNo, setTrackNo] = useState("");
  const [discNo, setDiscNo] = useState("");
  const [genres, setGenres] = useState("");
  const [artwork, setArtwork] = useState<{ data: string; mime: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !track) {
      return;
    }

    setTitle(track.title);
    setArtist(track.artist ?? "");
    setAlbumArtist(track.album_artist ?? "");
    setAlbum(track.album ?? "");
    setYear(track.album_year && track.album_year > 0 ? String(track.album_year) : "");
    setTrackNo(track.track_no > 0 ? String(track.track_no) : "");
    setDiscNo(track.disc_no > 0 ? String(track.disc_no) : "");
    setGenres("");
    setArtwork(null);
    setPreview(null);
    setError(null);
  }, [open, track]);

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
    if (!track) {
      return;
    }

    const changes: TagChanges = {};
    if (title.trim() && title.trim() !== track.title) changes.title = title.trim();
    if (artist.trim() && artist.trim() !== (track.artist ?? "")) {
      changes.artist = artist.trim();
    }
    if (albumArtist.trim() && albumArtist.trim() !== (track.album_artist ?? "")) {
      changes.album_artist = albumArtist.trim();
    }
    if (album.trim() && album.trim() !== (track.album ?? "")) {
      changes.album = album.trim();
    }
    if (year.trim() && Number(year) !== (track.album_year ?? 0)) {
      changes.year = Number(year);
    }
    if (trackNo.trim() && Number(trackNo) !== track.track_no) {
      changes.track_no = Number(trackNo);
    }
    if (discNo.trim() && Number(discNo) !== track.disc_no) {
      changes.disc_no = Number(discNo);
    }
    if (genres.trim()) {
      changes.genres = genres
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean);
    }

    if (Object.keys(changes).length === 0 && !artwork) {
      setError("Измените хотя бы одно поле или выберите обложку");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.admin.createTagEdit({
        track_ids: [track.id],
        changes,
        ...(artwork
          ? { artwork_base64: artwork.data, artwork_mime: artwork.mime }
          : {}),
      });
      toast("Трек отправлен воркеру. Обновление появится после обработки.");
      onSaved?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось сохранить трек");
    } finally {
      setSaving(false);
    }
  };

  const available = Boolean(features?.tag_editor);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Редактировать трек"
      description={track ? `${track.title} · ${track.artist ?? "Неизвестный исполнитель"}` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            type="submit"
            form="track-edit-form"
            disabled={!available || saving || !track}
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
      <form id="track-edit-form" onSubmit={(event) => void submit(event)} className="space-y-4">
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
                albumId={track?.album_id}
                title={track?.album ?? "Обложка"}
                className="h-full w-full"
              />
            )}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              <ImagePlus className="h-5 w-5" />
              Заменить
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void onArtwork(event)}
            />
          </label>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Название</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mc-field"
                  required
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Исполнитель</span>
                <input
                  value={artist}
                  onChange={(event) => setArtist(event.target.value)}
                  className="mc-field"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Альбом</span>
                <input
                  value={album}
                  onChange={(event) => setAlbum(event.target.value)}
                  className="mc-field"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Album artist</span>
                <input
                  value={albumArtist}
                  onChange={(event) => setAlbumArtist(event.target.value)}
                  className="mc-field"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
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
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Номер трека</span>
            <input
              value={trackNo}
              onChange={(event) => setTrackNo(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="—"
              className="mc-field"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Номер диска</span>
            <input
              value={discNo}
              onChange={(event) => setDiscNo(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="—"
              className="mc-field"
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Жанры</span>
          <input
            value={genres}
            onChange={(event) => setGenres(event.target.value)}
            placeholder="Через запятую, например: Synthwave, Electronic"
            className="mc-field"
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-xs text-muted-foreground">
          Изменения записываются в файл фоновым воркером. Пустые поля не меняются.
          Если изменить альбом или год только у одного трека, он может стать отдельным
          альбомом.
        </p>
      </form>
    </Dialog>
  );
}
