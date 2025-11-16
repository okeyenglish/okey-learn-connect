export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated Grid */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      {/* Floating Gradient Blobs */}
      <div 
        className="floating-blob w-96 h-96 -top-48 -left-48 bg-gradient-to-br from-[hsl(262,83%,68%)] to-[hsl(212,85%,58%)]"
        style={{ animationDuration: '20s' }}
      />
      <div 
        className="floating-blob floating-blob-delayed w-[500px] h-[500px] top-1/4 -right-48 bg-gradient-to-br from-[hsl(330,81%,60%)] to-[hsl(262,83%,68%)]"
        style={{ animationDuration: '25s' }}
      />
      <div 
        className="floating-blob w-[400px] h-[400px] bottom-0 left-1/3 bg-gradient-to-br from-[hsl(189,94%,43%)] to-[hsl(212,85%,58%)]"
        style={{ animationDuration: '22s', animationDelay: '2s' }}
      />
      
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background" />
    </div>
  );
}
