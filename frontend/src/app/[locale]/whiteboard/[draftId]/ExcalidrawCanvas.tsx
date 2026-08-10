"use client";

import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";

// Excalidraw's own fallback main menu (shown when no <MainMenu> child is
// passed) includes a Socials item linking out to Excalidraw's own GitHub/X/
// Discord — unrelated to this app. Listing the default items explicitly
// here, minus Socials, keeps everything else (theme, export, etc.) intact.
export default function ExcalidrawCanvas(props: ExcalidrawProps) {
  return (
    <Excalidraw {...props}>
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveToActiveFile />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.Help />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    </Excalidraw>
  );
}
