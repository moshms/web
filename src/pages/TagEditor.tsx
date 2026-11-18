import { useEffect, useState, type FormEvent } from "react";
import { Check, Loader2, Music2, Search } from "lucide-react";

import {
  api,
  ApiError,
  type Features,
  type TagChanges,
  type TagEdit,
  type Track,
} from "@/api";
import { Button } from "@/components/ui/button";

type Artwork = {
  name: string;
  mime: string;
  base64: string;
};

const inputClass = "mc-field";

export function TagEditorPage() {
  const [features, setFeatures] = useState<Features | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState("");
  const [trackNo, setTrackNo] = useState("");
  const [discNo, setDiscNo] = useState("");
  const [genres, setGenres] = useState("");
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [edits, setEdits] = useState<TagEdit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
    missingArtwork: false,
    missingYear: false,
    mine: false,
  });
  const [candidates, setCandidates] = useState<Track[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(true);
  const [inline, setInline] = useState<
    Record<string, { title: string; artist: string; album: string; year: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadEdits = () =>
    api.admin
      .tagEdits()
      .then(setEdits)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить правки"),
      );

  useEffect(() => {
    api.features().then(setFeatures).catch(() => setFeatures(null));
    void loadEdits();
  }, []);

  useEffect(() => {
    setCandidateLoading(true);
    api
      .tracksPage({
        limit: 100,
        offset: 0,
        missingArtwork: filters.missingArtwork,
        missingYear: filters.missingYear,
        mine: filters.mine,
      })
      .then((page) => {
        setCandidates(page.items);
        setInline(
          Object.fromEntries(
            page.items.map((track) => [
              track.id,
              {
                title: track.title,
                artist: track.artist ?? "",
                album: track.album ?? "",
                year: track.album_year ? String(track.album_year) : "",
              },
            ]),
          ),
        );
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить треки"),
      )
      .finally(() => setCandidateLoading(false));
  }, [filters]);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }

    try {
      const found = await api.search(query.trim());
      setResults(found.tracks);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Поиск не удался");
    }
  };

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const updateInline = (track: Track, field: "title" | "artist" | "album" | "year", value: string) => {
    setInline((current) => ({
      ...current,
      [track.id]: { ...current[track.id], [field]: value },
    }));
  };

  const saveInline = async (
    track: Track,
    field: "title" | "artist" | "album" | "year",
    value: string,
  ) => {
    const original =
      field === "title"
        ? track.title
        : field === "artist"
          ? (track.artist ?? "")
          : field === "album"
            ? (track.album ?? "")
            : track.album_year
              ? String(track.album_year)
              : "";
    if (value === original) {
      return;
    }

    const changes: TagChanges = {};
    if (field === "year") {
      const parsed = value.trim() === "" ? 0 : Number(value);
      if (!Number.isInteger(parsed) || (parsed !== 0 && (parsed < 1000 || parsed > 2100))) {
        setError("Год должен быть 1000–2100 или пустым");
        return;
      }
      changes.year = parsed;
    } else {
      changes[field] = value.trim();
    }

    setSavingId(track.id);
    setError(null);
    try {
      await api.admin.createTagEdit({ track_ids: [track.id], changes });
      setMessage("Правка поставлена в очередь воркера");
      setCandidates((current) =>
        current.map((item) =>
          item.id === track.id
            ? {
                ...item,
                title: field === "title" ? value.trim() : item.title,
                artist: field === "artist" ? value.trim() || null : item.artist,
                album: field === "album" ? value.trim() || null : item.album,
                album_year:
                  field === "year" ? (value.trim() === "" ? null : Number(value)) : item.album_year,
              }
            : item,
        ),
      );
      await loadEdits();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось сохранить тег");
    } finally {
      setSavingId(null);
    }
  };

  const selectArtwork = (file: File | null) => {
    if (!file) {
      setArtwork(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.split(",")[1] ?? "";
      setArtwork({ name: file.name, mime: file.type, base64 });
    };
    reader.readAsDataURL(file);
  };

  const buildChanges = (): TagChanges => {
    const changes: TagChanges = {};

    if (title.trim()) changes.title = title.trim();
    if (artist.trim()) changes.artist = artist.trim();
    if (albumArtist.trim()) changes.album_artist = albumArtist.trim();
    if (album.trim()) changes.album = album.trim();
    if (year.trim()) changes.year = Number(year);
    if (trackNo.trim()) changes.track_no = Number(trackNo);
    if (discNo.trim()) changes.disc_no = Number(discNo);
    if (genres.trim()) {
      changes.genres = genres
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean);
    }

    return changes;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (selected.size === 0) {
      setError("Выберите хотя бы один трек");
      return;
    }

    const changes = buildChanges();
    if (Object.keys(changes).length === 0 && !artwork) {
      setError("Заполните хотя бы одно поле или выберите обложку");
      return;
    }

    setBusy(true);
    try {
      await api.admin.createTagEdit({
        track_ids: [...selected],
        changes,
        artwork_base64: artwork?.base64,
        artwork_mime: artwork?.mime,
      });
      setMessage("Правка поставлена в очередь воркера");
      setSelected(new Set());
      setTitle("");
      setArtist("");
      setAlbumArtist("");
      setAlbum("");
      setYear("");
      setTrackNo("");
      setDiscNo("");
      setGenres("");
      setArtwork(null);
      await loadEdits();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось создать правку");
    } finally {
      setBusy(false);
    }
  };

  if (features && !features.worker) {
    return (
      <div className="mc-surface p-6 text-sm text-muted-foreground">
        Редактор тегов требует запущенный `mc-worker` (профиль `worker`).
      </div>
    );
  }

  const changes = buildChanges();
  const selectedTracks = results.filter((track) => selected.has(track.id));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Метаданные</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Редактор тегов</h1>
        <p className="text-sm text-muted-foreground">
          Массовая правка тегов и замена обложки через фоновую запись в файлы
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-foreground">{message}</p>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">Треки для правки</span>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              checked={filters.missingArtwork}
              onChange={(event) =>
                setFilters((current) => ({ ...current, missingArtwork: event.target.checked }))
              }
            />
            Без обложки
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              checked={filters.missingYear}
              onChange={(event) =>
                setFilters((current) => ({ ...current, missingYear: event.target.checked }))
              }
            />
            Без года
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              checked={filters.mine}
              onChange={(event) =>
                setFilters((current) => ({ ...current, mine: event.target.checked }))
              }
            />
            Загружено мной
          </label>
        </div>

        {candidateLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Загружаем треки…
          </p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Под выбранные фильтры треков нет.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-card">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2" />
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Исполнитель</th>
                  <th className="px-3 py-2 font-medium">Альбом</th>
                  <th className="w-24 px-3 py-2 font-medium">Год</th>
                  <th className="w-16 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {candidates.map((track) => {
                  const values = inline[track.id] ?? {
                    title: track.title,
                    artist: track.artist ?? "",
                    album: track.album ?? "",
                    year: track.album_year ? String(track.album_year) : "",
                  };
                  return (
                    <tr key={track.id} className="hover:bg-muted/30">
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={selected.has(track.id)}
                          onChange={() => toggle(track.id)}
                        />
                      </td>
                      {(["title", "artist", "album", "year"] as const).map((field) => (
                        <td key={field} className="px-1.5 py-1.5">
                          <input
                            value={values[field]}
                            onChange={(event) => updateInline(track, field, event.target.value)}
                            onBlur={(event) => void saveInline(track, field, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                            inputMode={field === "year" ? "numeric" : undefined}
                            className="mc-field h-8 w-full border-transparent bg-transparent px-1.5"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {savingId === track.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form onSubmit={(event) => void search(event)} className="flex max-w-xl gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти треки"
          className={inputClass}
        />
        <Button type="submit">
          <Search className="mr-2 h-4 w-4" />
          Найти
        </Button>
      </form>

      {results.length > 0 && (
        <div className="divide-y divide-border/40 rounded-lg bg-card">
          {results.map((track) => (
            <label
              key={track.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent/50"
            >
              <input
                type="checkbox"
                checked={selected.has(track.id)}
                onChange={() => toggle(track.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{track.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist ?? "—"}
                  {track.album ? ` · ${track.album}` : ""}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      <form onSubmit={(event) => void submit(event)} className="space-y-4 mc-surface p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1 text-foreground">
            Выбрано: {selected.size}
          </span>
          <span className="text-xs text-muted-foreground">
            Пустые поля не меняются
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название" className={inputClass} />
          <input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="Исполнитель" className={inputClass} />
          <input value={albumArtist} onChange={(event) => setAlbumArtist(event.target.value)} placeholder="Album artist" className={inputClass} />
          <input value={album} onChange={(event) => setAlbum(event.target.value)} placeholder="Альбом" className={inputClass} />
          <input value={year} onChange={(event) => setYear(event.target.value)} placeholder="Год" inputMode="numeric" className={inputClass} />
          <input value={trackNo} onChange={(event) => setTrackNo(event.target.value)} placeholder="Номер трека" inputMode="numeric" className={inputClass} />
          <input value={discNo} onChange={(event) => setDiscNo(event.target.value)} placeholder="Номер диска" inputMode="numeric" className={inputClass} />
          <input value={genres} onChange={(event) => setGenres(event.target.value)} placeholder="Жанры через запятую" className={inputClass} />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => selectArtwork(event.target.files?.[0] ?? null)}
            className="mc-field h-auto py-1.5 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-muted-foreground"
          />
        </div>

        {artwork && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Music2 className="h-4 w-4" />
            Обложка: {artwork.name}
          </p>
        )}

        <div className="rounded-md bg-muted/60 p-3 text-xs">
          <p className="font-medium">Предпросмотр изменений</p>
          <p className="mt-1 text-muted-foreground">
            {Object.keys(changes).length === 0
              ? "Только обложка"
              : Object.entries(changes)
                  .map(([key, value]) => `${key} → ${Array.isArray(value) ? value.join(", ") : value}`)
                  .join("; ")}
          </p>
          {selectedTracks.length > 0 && (
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {selectedTracks.map((track) => (
                <li key={track.id} className="truncate">
                  {track.title} — {track.artist ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" disabled={busy || selected.size === 0}>
          <Check className="mr-2 h-4 w-4" />
          Применить к {selected.size} трекам
        </Button>
      </form>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Последние правки
        </h2>
        <div className="divide-y divide-border/40 rounded-lg bg-card text-sm">
          {edits.map((edit) => (
            <div key={edit.id} className="px-3 py-2">
              <p className="font-medium">
                {edit.track_ids.length} треков ·{" "}
                <span className="text-xs text-muted-foreground">{edit.status}</span>
              </p>
              {edit.error && <p className="text-xs text-destructive">{edit.error}</p>}
            </div>
          ))}
          {edits.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Правок пока нет.</p>
          )}
        </div>
      </section>
    </div>
  );
}
