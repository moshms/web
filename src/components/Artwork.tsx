import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";

import { api } from "@/api";
import { cn } from "@/lib/utils";

type ArtworkProps = {
  albumId?: string | null;
  title: string;
  className?: string;
  iconClassName?: string;
};

export function Artwork({ albumId, title, className, iconClassName }: ArtworkProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [albumId]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        className,
      )}
    >
      {albumId && !failed ? (
        <img
          src={api.artworkUrl(albumId)}
          alt={title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Music2 className={cn("h-8 w-8", iconClassName)} />
      )}
    </div>
  );
}
