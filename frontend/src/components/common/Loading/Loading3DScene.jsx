import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';

function CentralOrb() {
  const mesh = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mesh.current.rotation.x = t * 0.32;
    mesh.current.rotation.y = t * 0.48;
    mesh.current.position.y = Math.sin(t * 1.4) * 0.1;
  });
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[0.52, 2]} />
      <MeshDistortMaterial
        color="#f97316"
        distort={0.32}
        speed={3.5}
        metalness={0.65}
        roughness={0.05}
        emissive="#ea580c"
        emissiveIntensity={0.12}
      />
    </mesh>
  );
}

function OrbitRing({ tiltX, tiltZ = 0, speed, color, opacity = 0.65, radius = 0.9 }) {
  const mesh = useRef();
  useFrame(({ clock }) => {
    mesh.current.rotation.y = clock.getElapsedTime() * speed;
  });
  return (
    <mesh ref={mesh} rotation={[tiltX, 0, tiltZ]}>
      <torusGeometry args={[radius, 0.022, 8, 80]} />
      <meshStandardMaterial
        color={color}
        metalness={0.85}
        roughness={0.08}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

function Particle({ orbitRadius, speed, phase, tiltX, color }) {
  const mesh = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase;
    const x = Math.cos(t) * orbitRadius;
    const z = Math.sin(t) * orbitRadius * Math.cos(tiltX);
    const y = Math.sin(t) * orbitRadius * Math.sin(tiltX);
    mesh.current.position.set(x, y, z);
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.058, 10, 10]} />
      <meshStandardMaterial
        color={color}
        metalness={0.5}
        roughness={0.2}
        emissive={color}
        emissiveIntensity={0.45}
      />
    </mesh>
  );
}

function PulsingLight() {
  const light = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    light.current.intensity = 1.8 + Math.sin(t * 2.2) * 0.6;
    light.current.position.x = Math.sin(t * 0.7) * 3;
    light.current.position.z = Math.cos(t * 0.5) * 3;
  });
  return <pointLight ref={light} position={[3, 2, 3]} color="#fbbf24" />;
}

export default function Loading3DScene({ size = 130 }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.6], fov: 48 }}
      style={{ width: size, height: size, display: 'block' }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.38} />
      <PulsingLight />
      <pointLight position={[-3, -2, -2]} intensity={0.9} color="#f97316" />
      <pointLight position={[0, 4, 0]}   intensity={0.4} color="#ffffff" />

      <CentralOrb />

      <OrbitRing tiltX={Math.PI / 3}   speed={1.1}  color="#f97316" radius={0.88} />
      <OrbitRing tiltX={-Math.PI / 4}  speed={-0.75} color="#fbbf24" opacity={0.5} radius={1.08} />
      <OrbitRing tiltX={Math.PI / 6}  tiltZ={Math.PI / 5} speed={0.55} color="#fb923c" opacity={0.35} radius={1.22} />

      <Particle orbitRadius={0.88} speed={2.2}  phase={0}             tiltX={Math.PI / 3}  color="#ffffff" />
      <Particle orbitRadius={1.08} speed={1.65} phase={Math.PI}       tiltX={-Math.PI / 4} color="#fbbf24" />
      <Particle orbitRadius={0.88} speed={2.8}  phase={Math.PI / 2}   tiltX={Math.PI / 3}  color="#fed7aa" />
      <Particle orbitRadius={1.22} speed={1.2}  phase={Math.PI * 1.5} tiltX={Math.PI / 6}  color="#f97316" />
    </Canvas>
  );
}
