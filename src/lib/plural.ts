export function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  return many;
}

export function albumsLabel(count: number) {
  return `${count} ${plural(count, "альбом", "альбома", "альбомов")}`;
}

export function tracksLabel(count: number) {
  return `${count} ${plural(count, "трек", "трека", "треков")}`;
}

export function artistsLabel(count: number) {
  return `${count} ${plural(count, "исполнитель", "исполнителя", "исполнителей")}`;
}
