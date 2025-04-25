'use client';

import { useEffect, useRef } from 'react';

interface Triangle {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  element?: HTMLDivElement;
}

export const FloatingTriangles = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trianglesRef = useRef<Triangle[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Create 5 triangles with random properties
    const triangles: Triangle[] = Array(5).fill(0).map((_, i) => {
      const size = Math.random() * 240 + 240; // 400-700px
      return {
        id: i,
        x: Math.random() * (containerWidth - size),
        y: Math.random() * (containerHeight - size),
        size,
        vx: (Math.random() - 0.5) * 0.5, // slow movement
        vy: (Math.random() - 0.5) * 0.5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.1
      };
    });
    
    trianglesRef.current = triangles;
    
    // Create DOM elements for triangles
    triangles.forEach(triangle => {
      const element = document.createElement('div');
      element.className = 'triangle light';
      element.style.width = `${triangle.size}px`;
      element.style.height = `${triangle.size}px`;
      element.style.transform = `translate(${triangle.x}px, ${triangle.y}px) rotate(${triangle.rotation}deg)`;
      container.appendChild(element);
      triangle.element = element;
    });
    
    // Animation function
    const animate = () => {
      const bounds = container.getBoundingClientRect();
      
      // Update triangle positions
      trianglesRef.current.forEach(triangle => {
        if (!triangle.element) return;
        
        // Apply velocity
        triangle.x += triangle.vx;
        triangle.y += triangle.vy;
        triangle.rotation += triangle.rotationSpeed;
        
        // Check wall collisions
        if (triangle.x < -triangle.size/2) {
          triangle.x = -triangle.size/2;
          triangle.vx = Math.abs(triangle.vx);
        } else if (triangle.x > bounds.width - triangle.size/2) {
          triangle.x = bounds.width - triangle.size/2;
          triangle.vx = -Math.abs(triangle.vx);
        }
        
        if (triangle.y < -triangle.size/2) {
          triangle.y = -triangle.size/2;
          triangle.vy = Math.abs(triangle.vy);
        } else if (triangle.y > bounds.height - triangle.size/2) {
          triangle.y = bounds.height - triangle.size/2;
          triangle.vy = -Math.abs(triangle.vy);
        }
      });
      
      // Check triangle-triangle collisions
      for (let i = 0; i < trianglesRef.current.length; i++) {
        for (let j = i + 1; j < trianglesRef.current.length; j++) {
          const t1 = trianglesRef.current[i];
          const t2 = trianglesRef.current[j];
          
          // Calculate distance between triangle centers
          const dx = t2.x - t1.x;
          const dy = t2.y - t1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (t1.size + t2.size) / 2;
          
          // If triangles are colliding
          if (distance < minDistance * 0.8) {
            // Calculate collision response
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance * 0.8 - distance;
            
            // Move triangles apart
            const moveX = Math.cos(angle) * overlap / 2;
            const moveY = Math.sin(angle) * overlap / 2;
            
            t1.x -= moveX;
            t1.y -= moveY;
            t2.x += moveX;
            t2.y += moveY;
            
            // Bounce velocities
            const t1Speed = Math.sqrt(t1.vx * t1.vx + t1.vy * t1.vy);
            const t2Speed = Math.sqrt(t2.vx * t2.vx + t2.vy * t2.vy);
            
            const t1Direction = Math.atan2(t1.vy, t1.vx);
            const t2Direction = Math.atan2(t2.vy, t2.vx);
            
            const t1NewVx = t2Speed * Math.cos(t2Direction);
            const t1NewVy = t2Speed * Math.sin(t2Direction);
            const t2NewVx = t1Speed * Math.cos(t1Direction);
            const t2NewVy = t1Speed * Math.sin(t1Direction);
            
            t1.vx = t1NewVx * 0.95;
            t1.vy = t1NewVy * 0.95;
            t2.vx = t2NewVx * 0.95;
            t2.vy = t2NewVy * 0.95;
          }
        }
      }
      
      // Apply the updated positions
      trianglesRef.current.forEach(triangle => {
        if (triangle.element) {
          triangle.element.style.transform = `translate(${triangle.x}px, ${triangle.y}px) rotate(${triangle.rotation}deg)`;
        }
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      trianglesRef.current.forEach(triangle => {
        if (triangle.element && triangle.element.parentNode === container) {
          container.removeChild(triangle.element);
        }
      });
    };
  }, []);
  
  return <div ref={containerRef} className="triangle-container absolute inset-0 w-full h-full"></div>;
};

export default FloatingTriangles;
