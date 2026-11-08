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
  order: readonly WinId[]; // z-order, back -> front
  vw: number;
  vh: number;
}
