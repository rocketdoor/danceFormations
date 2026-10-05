import type {Frame, SaveFile} from './types'


export function saveToLocal(frames: Frame[]) {
  const save: SaveFile = { version: 1, frames };
  localStorage.setItem('choreography', JSON.stringify(save));
}

export function loadFromLocal(): Frame[] | null {
  const raw = localStorage.getItem('choreography');
  if (!raw) return null;
  const save: SaveFile = JSON.parse(raw);
  return save.frames;
}

export function exportToFile(frames: Frame[]) {
  const save: SaveFile = { version: 1, frames };
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'choreography.json';
  link.click();
  URL.revokeObjectURL(url);
}

export function importFromFile(file: File, onLoaded: (frames: Frame[]) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    const save: SaveFile = JSON.parse(reader.result as string);
    onLoaded(save.frames);
  };
  reader.readAsText(file);
}