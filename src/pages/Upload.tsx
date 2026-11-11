import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { UploadCloud } from "lucide-react";
import * as tus from "tus-js-client";

import { api, ApiError, type Library } from "@/api";
import { Button } from "@/components/ui/button";

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
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить библиотеки"),
      );
  }, []);

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const uploadFiles = (files: FileList | null) => {
    if (!files || !libraryId) {
      return;
    }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Загрузка</h1>
        <p className="text-sm text-muted-foreground">
          Файлы кладутся в выбранную библиотеку и индексируются без воркера
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-[1fr_auto]">
        <select
          value={libraryId}
          onChange={(event) => setLibraryId(event.target.value)}
          className="h-10 rounded-md border bg-white px-3 text-sm"
        >
          {libraries.length === 0 && <option value="">Нет библиотек</option>}
          {libraries.map((library) => (
            <option key={library.id} value={library.id}>
              {library.name}
              {library.is_import_target ? " (цель импорта)" : ""}
            </option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="audio/*"
          className="hidden"
          onChange={onFiles}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={!libraryId}
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          Выбрать файлы
        </Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.status === "done"
                    ? "готово"
                    : item.status === "error"
                      ? "ошибка"
                      : `${item.progress}%`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full transition-all ${
                    item.status === "error" ? "bg-red-500" : "bg-zinc-900"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              {item.error && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            После завершения запускается скан библиотеки — трек появится через несколько секунд.
          </p>
        </div>
      )}
    </div>
  );
}
