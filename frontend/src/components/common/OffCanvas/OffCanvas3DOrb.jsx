import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';

function Orb() {
  const meshRef = useRef();
  const lightRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.28;
      meshRef.current.rotation.y = t * 0.45;
    }
    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(t * 0.6) * 2.5;
      lightRef.current.position.y = Math.cos(t * 0.4) * 2;
    }
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight ref={lightRef} position={[2, 2, 2]} intensity={2.2} color="#fbbf24" />
      <pointLight position={[-3, -2, -1]} intensity={1.0} color="#f97316" />
      <pointLight position={[0, 3, 1]} intensity={0.6} color="#ffffff" />
      <mesh ref={meshRef} scale={1.18}>
        <icosahedronGeometry args={[1, 2]} />
        <MeshDistortMaterial
          color="#f97316"
          distort={0.28}
          speed={2.2}
          metalness={0.55}
          roughness={0.08}
          transparent
          opacity={0.92}
          envMapIntensity={1}
        />
      </mesh>
    </>
  );
}

export default function OffCanvas3DOrb({ size = 100 }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.8], fov: 48 }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: `${size}px`,
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.85,
      }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
    >
      <Orb />
    </Canvas>
  );
}
