import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music2,
  UploadCloud,
} from "lucide-react";
import * as tus from "tus-js-client";

import { api, ApiError, type Library } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

export function UploadPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [libraryId, setLibraryId] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .libraries()
      .then((loaded) => {
        setLibraries(loaded);
        setLibraryId(
          loaded.find((library) => library.is_import_target)?.id ?? loaded[0]?.id ?? "",
        );
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : "Не удалось загрузить библиотеки",
        ),
      );
  }, []);

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const uploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    if (!libraryId) {
      setError("Сначала выберите библиотеку");
      return;
    }

    setError(null);
    for (const file of Array.from(files)) {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      setItems((current) => [
        ...current,
        { id, name: file.name, progress: 0, status: "uploading" },
      ]);

      const upload = new tus.Upload(file, {
        endpoint: `/tus?library_id=${encodeURIComponent(libraryId)}`,
        retryDelays: [0, 1000, 3000, 5000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (uploadError) => {
          updateItem(id, { status: "error", error: uploadError.message });
        },
        onProgress: (uploaded, total) => {
          updateItem(id, {
            progress: total > 0 ? Math.round((uploaded / total) * 100) : 0,
          });
        },
        onSuccess: () => {
          updateItem(id, { status: "done", progress: 100 });
        },
      });

      upload
        .findPreviousUploads()
        .then((previous) => {
          if (previous.length > 0) {
            upload.resumeFromPreviousUpload(previous[0]);
          }
          upload.start();
        })
        .catch(() => upload.start());
    }
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    uploadFiles(event.target.files);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    uploadFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Загрузка
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
          Добавить музыку
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Файлы попадут в выбранную библиотеку и проиндексируются автоматически
        </p>
      </div>

      {error && (
        <div className="mc-surface bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mc-surface p-4 md:p-5">
        <label className="block max-w-md space-y-1.5 text-sm">
          <span className="font-medium">Библиотека</span>
          <select
            value={libraryId}
            onChange={(event) => setLibraryId(event.target.value)}
            className="mc-select"
          >
            {libraries.length === 0 && <option value="">Нет библиотек</option>}
            {libraries.map((library) => (
              <option key={library.id} value={library.id}>
                {library.name}
                {library.is_import_target ? " (цель импорта)" : ""}
              </option>
            ))}
          </select>
        </label>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
            dragging
              ? "border-primary bg-primary/10"
              : "border-border/80 bg-background/40 hover:border-primary/40 hover:bg-accent/30",
          )}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent text-primary">
            <UploadCloud className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Перетащите файлы сюда</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            MP3, FLAC, OGG, M4A и другие аудиоформаты. Можно выбрать несколько файлов
            сразу.
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="audio/*"
            className="hidden"
            onChange={onFiles}
          />
          <Button
            className="mt-5"
            onClick={() => inputRef.current?.click()}
            disabled={!libraryId}
          >
            <Music2 className="mr-2 h-4 w-4" />
            Выбрать файлы
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Загрузки</h2>
            <button
              type="button"
              onClick={() => setItems([])}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Очистить список
            </button>
          </div>
          {items.map((item) => (
            <div key={item.id} className="mc-surface rounded-xl p-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground">
                  {item.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : item.status === "error" ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.status === "done"
                    ? "готово"
                    : item.status === "error"
                      ? "ошибка"
                      : `${item.progress}%`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    item.status === "error" ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              {item.error && <p className="mt-1 text-xs text-destructive">{item.error}</p>}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            После завершения запускается скан библиотеки — трек появится через несколько
            секунд.
          </p>
        </section>
      )}
    </div>
  );
}
