import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

interface Props {
  /** Initial HTML to populate the editor. Only read on mount. */
  initialHtml?: string;
  /** Called whenever the user changes the content. Receives raw HTML. */
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "link"],
  ["clean"],
];

/**
 * Thin Quill 2 wrapper. Stores its own Quill instance via ref, never
 * re-renders the DOM after mount – Quill owns its container.
 */
export function NewsEditor({ initialHtml = "", onChange, placeholder }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  // Keep a stable handle on the latest onChange so we don't re-init Quill
  // every time the parent re-renders.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const editor = document.createElement("div");
    containerRef.current.appendChild(editor);

    const quill = new Quill(editor, {
      theme: "snow",
      placeholder: placeholder ?? "Skriv noe…",
      modules: { toolbar: TOOLBAR },
    });

    if (initialHtml) {
      // clipboard.dangerouslyPasteHTML keeps formatting; safer than innerHTML.
      quill.clipboard.dangerouslyPasteHTML(initialHtml);
    }

    quill.on("text-change", () => {
      const html = quill.root.innerHTML;
      // Quill emits "<p><br></p>" for an empty editor – treat as empty string.
      onChangeRef.current(html === "<p><br></p>" ? "" : html);
    });

    quillRef.current = quill;

    return () => {
      quillRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // We deliberately ignore initialHtml/placeholder updates – Quill owns the DOM
    // after mount. If the parent needs to swap posts, it should re-mount the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-background rounded-md border">
      <div ref={containerRef} className="news-editor" />
    </div>
  );
}
