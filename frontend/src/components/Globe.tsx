// File: src/components/Globe.tsx

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TextureLoader, Mesh } from "three";
import { useRef } from "react";

function Earth() {
  const [albedo, bump, night, clouds] = useLoader(TextureLoader, [
    "/textures/albedo.jpg",
    "/textures/bump.jpg",
    "/textures/night.png",
    "/textures/cloud.png",
  ]);

  const earthRef = useRef<Mesh>(null!);
  const cloudRef = useRef<Mesh>(null!);

  // Rotate Earth + Clouds
  useFrame(() => {
    if (earthRef.current) earthRef.current.rotation.y += 0.0008;
    if (cloudRef.current) cloudRef.current.rotation.y += 0.001;
  });

  return (
    <>
      {/* Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshPhongMaterial
          map={albedo}
          bumpMap={bump}
          bumpScale={0.05}
          emissiveMap={night}
          emissive={"white"}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Clouds (slightly bigger sphere) */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[2.53, 64, 64]} />
        <meshPhongMaterial
          map={clouds}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

export const Globe = () => {
  return (
    <Canvas
      style={{ width: "100%", height: "100%", background: "ring-blue-500" }} // blue-900 like bg
      camera={{ position: [0, 0, 8], fov: 45 }}
    >
      {/* Lights */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />

      {/* Earth Component */}
      <Earth />

      {/* Controls */}
      <OrbitControls enableZoom={true} autoRotate={false} />
    </Canvas>
  );
};
