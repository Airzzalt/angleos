// A template (unlike a layout) re-mounts on every navigation, so each screen eases in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
