import { Component, ElementRef, NgZone, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-particle-bg',
  standalone: true,
  template: `<canvas #canvas class="absolute inset-0 w-full h-full pointer-events-none z-0"></canvas>`
})
export class ParticleBgComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private animationFrameId: number | null = null;
  private particles: any[] = [];
  private mouseX = 0;
  private mouseY = 0;
  private mouseMoveListener!: (e: MouseEvent) => void;
  private resizeListener!: () => void;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.initCanvas();
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
  }

  private initCanvas() {
    if (typeof window === 'undefined') return;

    this.ngZone.runOutsideAngular(() => {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      this.resizeListener = () => {
        // Use the canvas element's actual layout dimensions to prevent scaling offsets
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        this.initParticles(canvas.width, canvas.height);
      };
      
      window.addEventListener('resize', this.resizeListener);
      // Wait a tick for parent size to be computed
      setTimeout(() => this.resizeListener(), 0);

      this.mouseMoveListener = (e: MouseEvent) => {
        // Adjust mouse coordinates relative to the canvas
        const rect = canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
      };
      document.addEventListener('mousemove', this.mouseMoveListener);

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (const p of this.particles) {
          const dx = this.mouseX - p.x;
          const dy = this.mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          let radius = p.baseRadius;
          if (dist < 150) {
            radius = p.baseRadius + (150 - dist) * 0.05;
          }

          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(236, 72, 153, ${p.alpha})`; // Pink color for particles
          ctx.fill();
        }

        this.animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    });
  }

  private initParticles(width: number, height: number) {
    this.particles = [];
    const count = Math.min(150, Math.floor((width * height) / 15000)); // Optimized particles
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        baseRadius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.3 + 0.1
      });
    }
  }
}
