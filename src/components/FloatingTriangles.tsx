'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    particlesJS: any;
  }
}

const FloatingTriangles = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    const loadParticlesJS = () => {
      if (window.particlesJS && containerRef.current) {
        window.particlesJS('floating-triangles', {
          particles: {
            number: {
              value: 40,
              density: {
                enable: true,
                value_area: 1200
              }
            },
            color: {
              value: ["#3b82f6", "#14b8a6", "#60a5fa", "#2dd4bf"]
            },
            shape: {
              type: "circle",
              stroke: {
                width: 0,
                color: "#000000"
              }
            },
            opacity: {
              value: 0.3,
              random: false,
              anim: {
                enable: true,
                speed: 0.3,
                opacity_min: 0.1,
                sync: false
              }
            },
            size: {
              value: 2,
              random: true,
              anim: {
                enable: true,
                speed: 0.8,
                size_min: 0.5,
                sync: false
              }
            },
            line_linked: {
              enable: true,
              distance: 120,
              color: "#3b82f6",
              opacity: 0.2,
              width: 1
            },
            move: {
              enable: true,
              speed: 1,
              direction: "none",
              random: false,
              straight: false,
              out_mode: "out",
              bounce: false,
              attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
              }
            }
          },
          interactivity: {
            detect_on: "canvas",
            events: {
              onhover: {
                enable: false,
                mode: "grab"
              },
              onclick: {
                enable: false,
                mode: "push"
              },
              resize: true
            },
            modes: {
              grab: {
                distance: 400,
                line_linked: {
                  opacity: 1
                }
              }
            }
          },
          retina_detect: true
        });
      }
    };

    const loadScript = () => {
      if (scriptLoadedRef.current) {
        loadParticlesJS();
        return;
      }

      // Check if particles.js is already loaded
      if (window.particlesJS) {
        scriptLoadedRef.current = true;
        loadParticlesJS();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        // Add a small delay to ensure the DOM is ready
        setTimeout(loadParticlesJS, 100);
      };
      
      // Only add script if it's not already in the document
      const existingScript = document.querySelector('script[src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"]');
      if (!existingScript) {
        document.head.appendChild(script);
      } else {
        scriptLoadedRef.current = true;
        setTimeout(loadParticlesJS, 100);
      }

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    };

    loadScript();
  }, []);

  return (
    <div
      id="floating-triangles"
      ref={containerRef}
      className="triangle-container absolute inset-0 w-full h-full pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      {/* The canvas will be automatically created by particles.js */}
    </div>
  );
};

export default FloatingTriangles;
