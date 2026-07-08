interface SkeletonLoaderProps {
  type?: "generic" | "metrics" | "list" | "graph" | "chat";
  count?: number;
}

export default function SkeletonLoader({ type = "generic", count = 3 }: SkeletonLoaderProps) {
  const shimmerClass = "animate-pulse bg-gradient-to-r from-panel via-panel-alt to-panel bg-[length:200%_100%]";

  if (type === "metrics") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-border bg-panel/20 backdrop-blur-md space-y-3">
            <div className={`h-3 w-1/3 rounded ${shimmerClass}`}></div>
            <div className={`h-7 w-2/3 rounded-lg ${shimmerClass}`}></div>
            <div className={`h-2.5 w-1/2 rounded ${shimmerClass}`}></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="space-y-2.5 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-panel/10">
            <div className="flex items-center gap-3 w-2/3">
              <div className={`h-8 w-8 rounded-lg shrink-0 ${shimmerClass}`}></div>
              <div className="space-y-1.5 flex-grow">
                <div className={`h-3 w-1/3 rounded ${shimmerClass}`}></div>
                <div className={`h-2.5 w-2/3 rounded ${shimmerClass}`}></div>
              </div>
            </div>
            <div className={`h-4 w-12 rounded ${shimmerClass}`}></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "graph") {
    return (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center border border-border bg-bg rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-around opacity-30 select-none pointer-events-none">
          <div className={`w-16 h-16 rounded-full ${shimmerClass}`}></div>
          <div className={`w-20 h-20 rounded-xl ${shimmerClass} mt-12`}></div>
          <div className={`w-14 h-14 rounded-full ${shimmerClass} -mt-16`}></div>
        </div>
        <div className="text-center z-10 space-y-2 animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin mx-auto"></div>
          <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-accent">
            Rendering Graph Viewport...
          </p>
        </div>
      </div>
    );
  }

  if (type === "chat") {
    return (
      <div className="space-y-4 p-4 w-full">
        {Array.from({ length: count }).map((_, i) => {
          const isLeft = i % 2 === 0;
          return (
            <div
              key={i}
              className={`flex gap-3 max-w-[80%] ${isLeft ? "mr-auto" : "ml-auto flex-row-reverse"}`}
            >
              <div className={`w-6 h-6 rounded-full shrink-0 ${shimmerClass}`}></div>
              <div className="space-y-2 flex-grow">
                <div className={`h-3 w-24 rounded ${shimmerClass} ${isLeft ? "" : "ml-auto"}`}></div>
                <div
                  className={`p-3 rounded-2xl border border-border space-y-1.5 ${
                    isLeft
                      ? "bg-panel rounded-tl-none text-left"
                      : "bg-accent-dim/10 border-accent/10 rounded-tr-none text-right"
                  }`}
                >
                  <div className={`h-2.5 w-full rounded ${shimmerClass}`}></div>
                  <div className={`h-2.5 w-5/6 rounded ${shimmerClass}`}></div>
                  <div className={`h-2.5 w-2/3 rounded ${shimmerClass}`}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full p-4">
      <div className={`h-4 w-1/4 rounded ${shimmerClass}`}></div>
      <div className={`h-3.5 w-full rounded ${shimmerClass}`}></div>
      <div className={`h-3.5 w-5/6 rounded ${shimmerClass}`}></div>
      <div className={`h-3.5 w-2/3 rounded ${shimmerClass}`}></div>
    </div>
  );
}
