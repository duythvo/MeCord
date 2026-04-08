// How to make animated gradient border 👇
// https://cruip-tutorials.vercel.app/animated-gradient-border/
function BorderAnimatedContainer({ children }) {
  return (
    <div className="w-full h-full [background:linear-gradient(45deg,#000,theme(colors.indigo.950)_52%,#000)_padding-box,conic-gradient(from_var(--border-angle),theme(colors.indigo.500/.30)_75%,theme(colors.fuchsia.300/.55)_84%,theme(colors.cyan.300/.60)_90%,theme(colors.teal.300/.58)_95%,theme(colors.indigo.300/.45))_border-box] rounded-2xl border border-transparent animate-border flex overflow-hidden">
      {children}
    </div>
  );
}
export default BorderAnimatedContainer;
