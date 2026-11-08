export type WinId = 'hello' | 'about' | 'exp' | 'proj' | 'term' | 'site';
export interface Win {
  x: number;
  y: number;
  open: boolean;
  min: boolean;
}
export type MenuId = null | 'os' | 'win' | 'view' | 'help';
export type Theme = 'dark' | 'light';
export type Wall = 'nebula' | 'grid' | 'plain';
export type Tone = 'cmd' | 'out' | 'dim' | 'acc';
export interface Line {
  text: string;
  tone: Tone;
}
export interface State {
  wins: Record<WinId, Win>;
  order: WinId[]; // z-order, back -> front
  menu: MenuId;
  theme: Theme;
  wall: Wall;
  wobble: boolean;
  drag: WinId | null;
  tilt: number;
  verb: number;
  tab: number;
  cmd: string;
  lines: Line[];
  booting: boolean;
  bootPct: number;
}
