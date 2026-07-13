import type { SuggestionOptions } from "@tiptap/suggestion";

export type MentionItem = { id: string; name: string | null };

function initialsOf(name: string | null) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// Popup uses the suggestion plugin's managed mount() (Floating UI under the
// hood) for positioning/auto-repositioning, so this file only builds and
// updates the plain-DOM list content — no manual clientRect math needed.
export function createMentionSuggestion(
  getItems: (query: string) => MentionItem[]
): Pick<SuggestionOptions<MentionItem>, "items" | "render"> {
  return {
    items: ({ query }) => getItems(query).slice(0, 8),
    render: () => {
      let container: HTMLDivElement | null = null;
      let unmount: (() => void) | null = null;
      let selectedIndex = 0;
      let currentItems: MentionItem[] = [];
      let currentCommand: (props: { id: string; label: string }) => void = () => {};

      // The Mention node's default `command` spreads whatever is passed here
      // directly onto the node's attrs, so it must already be {id, label}
      // shaped — not our list item's {id, name} shape.
      function selectItem(item: MentionItem) {
        currentCommand({ id: item.id, label: item.name ?? item.id });
      }

      function renderList() {
        if (!container) return;
        container.innerHTML = "";
        if (currentItems.length === 0) {
          const empty = document.createElement("div");
          empty.className = "px-3 py-2 text-xs text-dark-slate/40 italic";
          empty.textContent = "Inga träffar";
          container.appendChild(empty);
          return;
        }
        currentItems.forEach((item, i) => {
          const row = document.createElement("button");
          row.type = "button";
          row.className =
            `w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
              i === selectedIndex ? "bg-dry-sage/40 text-dark-slate font-semibold" : "text-dark-slate/80 hover:bg-dry-sage/20"
            }`;
          const avatar = document.createElement("span");
          avatar.className =
            "w-6 h-6 rounded-full bg-dry-sage flex items-center justify-center text-[10px] font-semibold text-dark-slate shrink-0";
          avatar.textContent = initialsOf(item.name);
          const label = document.createElement("span");
          label.className = "truncate";
          label.textContent = item.name ?? "?";
          row.appendChild(avatar);
          row.appendChild(label);
          row.addEventListener("mousedown", (e) => {
            e.preventDefault();
            selectItem(item);
          });
          container!.appendChild(row);
        });
      }

      return {
        onStart: (props) => {
          currentItems = props.items;
          currentCommand = props.command;
          selectedIndex = 0;
          container = document.createElement("div");
          container.className =
            "w-60 max-h-64 overflow-y-auto bg-white border border-muted-teal/20 rounded-lg shadow-xl py-1 z-[9999]";
          renderList();
          unmount = props.mount(container);
        },
        onUpdate: (props) => {
          currentItems = props.items;
          currentCommand = props.command;
          selectedIndex = 0;
          renderList();
        },
        onKeyDown: (props) => {
          if (!container) return false;
          if (props.event.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % Math.max(currentItems.length, 1);
            renderList();
            return true;
          }
          if (props.event.key === "ArrowUp") {
            selectedIndex = (selectedIndex - 1 + Math.max(currentItems.length, 1)) % Math.max(currentItems.length, 1);
            renderList();
            return true;
          }
          if (props.event.key === "Enter") {
            if (currentItems[selectedIndex]) selectItem(currentItems[selectedIndex]);
            return true;
          }
          if (props.event.key === "Escape") {
            unmount?.();
            unmount = null;
            container = null;
            return true;
          }
          return false;
        },
        onExit: () => {
          unmount?.();
          unmount = null;
          container = null;
        },
      };
    },
  };
}
