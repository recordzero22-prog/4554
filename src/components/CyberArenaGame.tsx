import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Play, Volume2, VolumeX, RotateCcw, Shield, Zap, Sparkles, Terminal, Trophy } from 'lucide-react';
import { createInitialDrone, DroneState, checkSphereCollision, updateEnergy, calculateScore } from '../game/gameLogic';
import { soundSynth } from '../game/soundSynth';

interface CyberArenaGameProps {
  onSpawnMcpTask: (goal: string) => void;
}

export const CyberArenaGame: React.FC<CyberArenaGameProps> = ({ onSpawnMcpTask }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Game UI State
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover' | 'victory'>('title');
  const [score, setScore] = useState<number>(0);
  const [health, setHealth] = useState<number>(100);
  const [energy, setEnergy] = useState<number>(100);
  const [packetsLeft, setPacketsLeft] = useState<number>(6);
  const [wave, setWave] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [mcpAssistantNotice, setMcpAssistantNotice] = useState<string | null>(null);

  // Mutable game refs (keeps render loop free from React setState thrashing)
  const droneRef = useRef<DroneState>(createInitialDrone());
  const keysRef = useRef<{ [k: string]: boolean }>({});
  const isPlayingRef = useRef<boolean>(false);
  const currentWaveRef = useRef<number>(1);
  const streakRef = useRef<number>(0);

  // Start game handler
  const startGame = () => {
    droneRef.current = createInitialDrone();
    setScore(0);
    setHealth(100);
    setEnergy(100);
    setPacketsLeft(6);
    setWave(1);
    currentWaveRef.current = 1;
    streakRef.current = 0;
    isPlayingRef.current = true;
    setGameState('playing');
  };

  const toggleSound = () => {
    const muted = soundSynth.toggleMute();
    setIsMuted(muted);
  };

  const handleMcpAssist = () => {
    onSpawnMcpTask(
      'Анализ и оптимизация протокола 3D-дрона: сканируй целостность workspace, устрани глитчи и верифицируй exit code 0.'
    );
    setMcpAssistantNotice('Агент MCP запущен! Формируется DAG...');
    setTimeout(() => setMcpAssistantNotice(null), 4000);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Detect Software WebGL
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : (gl as any).RENDERER;
      const gpu = String((gl as any).getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c14);
    scene.fog = new THREE.FogExp2(0x080c14, 0.035);

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 150);
    camera.position.set(0, 7, 12);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.appendChild(renderer.domElement);

    // 2. Studio Lighting & RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0x58a6ff, 0x161b22, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(10, 20, 12);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      const d = 20;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    scene.add(keyLight);

    // 3. Cyber Grid Arena Floor (Procedural Canvas Texture)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    fctx.fillStyle = '#0d1117';
    fctx.fillRect(0, 0, 512, 512);
    fctx.strokeStyle = '#1f6feb';
    fctx.lineWidth = 3;
    fctx.strokeRect(0, 0, 512, 512);
    fctx.strokeStyle = 'rgba(88, 166, 255, 0.25)';
    fctx.lineWidth = 1;
    for (let i = 64; i < 512; i += 64) {
      fctx.beginPath();
      fctx.moveTo(i, 0);
      fctx.lineTo(i, 512);
      fctx.stroke();
      fctx.beginPath();
      fctx.moveTo(0, i);
      fctx.lineTo(512, i);
      fctx.stroke();
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(12, 12);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.3,
      metalness: 0.7,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Arena Perimeter Glow Barriers
    const barrierMat = new THREE.MeshBasicMaterial({
      color: 0x1f6feb,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const barrierGeo = new THREE.CylinderGeometry(28, 28, 4, 32, 1, true);
    const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
    barrierMesh.position.y = 2;
    scene.add(barrierMesh);

    // 4. Hero Composite Procedural Drone Model (6 distinct parts)
    const droneGroup = new THREE.Group();

    // Part 1: Main Chassis Hull
    const hullGeo = new THREE.CylinderGeometry(0.5, 0.65, 0.25, 8);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x21262d,
      roughness: 0.2,
      metalness: 0.85,
    });
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.castShadow = !isSoftwareGl;
    droneGroup.add(hullMesh);

    // Part 2: Cyber Cockpit Visor / Core Sensor
    const visorGeo = new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x0099bb,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: isSoftwareGl ? 0.6 : 1.0,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.y = 0.14;
    droneGroup.add(visorMesh);

    // Part 3: 4 Rotor Carbon Boom Arms
    const armsGroup = new THREE.Group();
    const armGeo = new THREE.BoxGeometry(2.4, 0.08, 0.12);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x30363d, roughness: 0.5, metalness: 0.5 });
    const armX = new THREE.Mesh(armGeo, armMat);
    const armZ = new THREE.Mesh(armGeo, armMat);
    armZ.rotation.y = Math.PI / 2;
    armsGroup.add(armX);
    armsGroup.add(armZ);
    armsGroup.position.y = 0.05;
    droneGroup.add(armsGroup);

    // Part 4 & 5: Rotor Motor Pods & Spinning Propellers
    const rotorPropellers: THREE.Mesh[] = [];
    const podGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12);
    const podMat = new THREE.MeshStandardMaterial({ color: 0x58a6ff, roughness: 0.3, metalness: 0.7 });

    const propGeo = new THREE.BoxGeometry(0.95, 0.02, 0.1);
    const propMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0088cc,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.9,
    });

    const rotorPositions = [
      [1.1, 0.12, 0],
      [-1.1, 0.12, 0],
      [0, 0.12, 1.1],
      [0, 0.12, -1.1],
    ];

    rotorPositions.forEach(pos => {
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(pos[0], pos[1], pos[2]);
      droneGroup.add(pod);

      const prop = new THREE.Mesh(propGeo, propMat);
      prop.position.set(pos[0], pos[1] + 0.1, pos[2]);
      droneGroup.add(prop);
      rotorPropellers.push(prop);
    });

    // Part 6: Contact Grounding Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    scene.add(shadowMesh);

    droneGroup.position.set(0, 0.9, 0);
    scene.add(droneGroup);

    // 5. Procedural Collectible Data Cubes
    const collectibles: Array<{ mesh: THREE.Group; x: number; z: number; collected: boolean }> = [];
    const spawnCollectibles = (count: number) => {
      // Remove old
      collectibles.forEach(c => scene.remove(c.mesh));
      collectibles.length = 0;

      const cubeMat = new THREE.MeshStandardMaterial({
        color: 0x7ee787,
        emissive: 0x238636,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8,
      });

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4);
        const radius = 6 + Math.random() * 14;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const group = new THREE.Group();
        const coreGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
        const coreMesh = new THREE.Mesh(coreGeo, cubeMat);
        coreMesh.castShadow = !isSoftwareGl;
        group.add(coreMesh);

        // Orbit ring
        const ringGeo = new THREE.TorusGeometry(0.55, 0.03, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x7ee787, wireframe: true });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        group.add(ringMesh);

        group.position.set(x, 0.7, z);
        scene.add(group);

        collectibles.push({ mesh: group, x, z, collected: false });
      }
    };

    spawnCollectibles(6);

    // 6. Hazard Security Sentinel Beacons
    const hazards: Array<{ mesh: THREE.Mesh; x: number; z: number; radius: number }> = [];
    const hazardGeo = new THREE.OctahedronGeometry(0.85, 0);
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xda3633,
      emissive: 0xf85149,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8,
    });

    const hazardCoords = [
      [8, -8],
      [-10, 7],
      [-7, -9],
      [12, 9],
    ];

    hazardCoords.forEach(([hx, hz]) => {
      const mesh = new THREE.Mesh(hazardGeo, hazardMat);
      mesh.position.set(hx, 1.1, hz);
      mesh.castShadow = !isSoftwareGl;
      scene.add(mesh);
      hazards.push({ mesh, x: hx, z: hz, radius: 1.1 });
    });

    // Keyboard Input Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (isPlayingRef.current) {
          setGameState(prev => (prev === 'playing' ? 'paused' : 'playing'));
        }
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        if (!isPlayingRef.current) {
          startGame();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Resize Handler
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 7. Animation Game Loop (Paced with afterDraw on software WebGL)
    let animationFrameId = 0;
    let lastTime = performance.now();
    const clock = new THREE.Clock();

    function tick() {
      const now = performance.now();
      const dt = Math.min(clock.getDelta(), 0.05);

      // Rotate rotor blades
      const spinSpeed = 25 * dt;
      rotorPropellers.forEach(p => (p.rotation.y += spinSpeed));

      // Rotate data collectibles & hazards
      collectibles.forEach((c, idx) => {
        if (!c.collected) {
          c.mesh.rotation.y += 1.5 * dt;
          c.mesh.position.y = 0.7 + Math.sin(now * 0.003 + idx) * 0.15;
        }
      });

      hazards.forEach(h => {
        h.mesh.rotation.x += 1.2 * dt;
        h.mesh.rotation.y += 1.8 * dt;
      });

      // Active Gameplay Physics
      if (isPlayingRef.current && gameState !== 'paused') {
        const drone = droneRef.current;
        const keys = keysRef.current;

        const isBoosting = !!(keys['Space'] || keys['ShiftLeft'] || keys['ShiftRight']);
        const moveSpeed = isBoosting && drone.energy > 5 ? 12 : 7;
        const turnSpeed = 3.2;

        // Energy update
        drone.energy = updateEnergy(drone.energy, dt, isBoosting);
        if (isBoosting && drone.energy > 5) {
          soundSynth.playBoost();
        }

        // Steer direction
        let moveX = 0;
        let moveZ = 0;
        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
          const len = Math.hypot(moveX, moveZ);
          moveX /= len;
          moveZ /= len;

          drone.vx = THREE.MathUtils.damp(drone.vx, moveX * moveSpeed, 8, dt);
          drone.vz = THREE.MathUtils.damp(drone.vz, moveZ * moveSpeed, 8, dt);

          // Bank drone mesh into turn
          droneGroup.rotation.z = THREE.MathUtils.damp(droneGroup.rotation.z, -moveX * 0.35, 10, dt);
          droneGroup.rotation.x = THREE.MathUtils.damp(droneGroup.rotation.x, moveZ * 0.35, 10, dt);
        } else {
          drone.vx = THREE.MathUtils.damp(drone.vx, 0, 6, dt);
          drone.vz = THREE.MathUtils.damp(drone.vz, 0, 6, dt);
          droneGroup.rotation.z = THREE.MathUtils.damp(droneGroup.rotation.z, 0, 6, dt);
          droneGroup.rotation.x = THREE.MathUtils.damp(droneGroup.rotation.x, 0, 6, dt);
        }

        drone.x += drone.vx * dt;
        drone.z += drone.vz * dt;

        // Arena Boundaries Clamp (26 radius)
        const distFromCenter = Math.hypot(drone.x, drone.z);
        if (distFromCenter > 26) {
          const angle = Math.atan2(drone.z, drone.x);
          drone.x = Math.cos(angle) * 26;
          drone.z = Math.sin(angle) * 26;
          drone.vx *= -0.5;
          drone.vz *= -0.5;
          soundSynth.playHit();
        }

        // Update 3D Positions
        droneGroup.position.x = drone.x;
        droneGroup.position.z = drone.z;
        droneGroup.position.y = 0.9 + Math.sin(now * 0.005) * 0.05;

        shadowMesh.position.x = drone.x;
        shadowMesh.position.z = drone.z;

        // Smooth Camera Follow with Exponential Damping
        const targetCamX = drone.x;
        const targetCamZ = drone.z + 10;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 4, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 4, dt);
        camera.lookAt(drone.x, 1.0, drone.z);

        // Check Collectibles Collision
        collectibles.forEach(c => {
          if (!c.collected && checkSphereCollision({ x: drone.x, z: drone.z }, { x: c.x, z: c.z }, 1.3)) {
            c.collected = true;
            c.mesh.visible = false;
            drone.packetsCollected += 1;
            streakRef.current += 1;
            drone.score = calculateScore(drone.packetsCollected, currentWaveRef.current, streakRef.current);
            soundSynth.playCollect();

            setScore(drone.score);
            const remaining = collectibles.filter(it => !it.collected).length;
            setPacketsLeft(remaining);

            // Wave completed?
            if (remaining === 0) {
              soundSynth.playWaveComplete();
              currentWaveRef.current += 1;
              setWave(currentWaveRef.current);
              spawnCollectibles(6 + currentWaveRef.current * 2);
              setPacketsLeft(6 + currentWaveRef.current * 2);
            }
          }
        });

        // Check Hazard Collision
        hazards.forEach(h => {
          if (checkSphereCollision({ x: drone.x, z: drone.z }, { x: h.x, z: h.z }, h.radius + 0.6)) {
            drone.health = Math.max(0, drone.health - 25 * dt);
            soundSynth.playHit();
            setHealth(Math.round(drone.health));

            if (drone.health <= 0) {
              isPlayingRef.current = false;
              setGameState('gameover');
            }
          }
        });

        setEnergy(Math.round(drone.energy));
      }

      // Render Frame
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        // Paced software-WebGL frame schedule
        animationFrameId = window.setTimeout(tick, 70);
      } else {
        animationFrameId = requestAnimationFrame(tick);
      }
    }

    tick();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      if (isSoftwareGl) clearTimeout(animationFrameId);
      else cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [gameState]);

  return (
    <div className="relative w-full h-full bg-[#080c14] overflow-hidden select-none">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* World-Matched Low-Occlusion UI Overlay (> 85% clear) */}
      <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
        {/* Top Header Cluster */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#161b22]/90 border border-[#30363d] rounded-lg px-3 py-1.5 flex items-center gap-2 pointer-events-auto shadow-md">
              <span className="font-mono text-xs font-bold text-white tracking-wide">
                CYBER-ARENA <span className="text-blue-400 font-extrabold text-[10px] px-1 py-0.5 rounded bg-blue-500/20 border border-blue-500/40">3D</span>
              </span>
              <span className="text-[11px] text-[#8b949e]">| Wave {wave}</span>
            </div>

            {mcpAssistantNotice && (
              <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-lg px-3 py-1 text-xs text-emerald-300 font-mono animate-pulse">
                {mcpAssistantNotice}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-[#161b22]/90 border border-[#30363d] text-[#c9d1d9] hover:text-white cursor-pointer transition-colors"
              title={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* MCP Agent Assist Button */}
            <button
              onClick={handleMcpAssist}
              className="flex items-center gap-1.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow cursor-pointer transition-colors"
              title="Запустить агента MCP для аудита матрицы"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>MCP Ассистент</span>
            </button>
          </div>
        </div>

        {/* Perimeter Status Clusters (Active during game) */}
        {gameState === 'playing' && (
          <div className="flex items-end justify-between pointer-events-auto">
            {/* Left Status: Health & Energy */}
            <div className="bg-[#161b22]/90 border border-[#30363d] rounded-lg p-3 space-y-2 w-48 shadow-lg">
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="flex items-center gap-1 text-[#8b949e]">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    Целостность
                  </span>
                  <span className="font-bold text-white tabular-nums">{health}%</span>
                </div>
                <div className="w-full bg-[#0d1117] h-2 rounded-full overflow-hidden border border-[#30363d]">
                  <div
                    className={`h-full transition-all ${
                      health > 40 ? 'bg-emerald-400' : 'bg-red-500 animate-pulse'
                    }`}
                    style={{ width: `${health}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="flex items-center gap-1 text-[#8b949e]">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    Турбо-энергия
                  </span>
                  <span className="font-bold text-white tabular-nums">{energy}%</span>
                </div>
                <div className="w-full bg-[#0d1117] h-2 rounded-full overflow-hidden border border-[#30363d]">
                  <div
                    className="h-full bg-cyan-400 transition-all"
                    style={{ width: `${energy}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right Status: Score & Packets */}
            <div className="bg-[#161b22]/90 border border-[#30363d] rounded-lg p-3 text-right space-y-1 shadow-lg">
              <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">
                Очки протокола
              </div>
              <div className="text-xl font-extrabold text-white font-mono tabular-nums">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-400 font-mono flex items-center justify-end gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Осталось пакетов: {packetsLeft}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <div className="absolute inset-0 bg-black/75 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="max-w-md space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-xl shadow-blue-500/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-wider uppercase">
              MCP Drone Protocol 3D
            </h2>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Управляй автономным кибер-дроном в 3D пространстве Three.js. Собирай квантовые пакеты данных и избегай красных фаерволов.
            </p>

            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg text-[11px] text-[#c9d1d9] space-y-1 font-mono">
              <div>Управление: <strong className="text-white">W, A, S, D</strong> или <strong className="text-white">Стрелки</strong></div>
              <div>Турбо-ускорение: <strong className="text-cyan-400">Пробел (Space)</strong></div>
              <div>Пауза: <strong className="text-white">Esc / P</strong></div>
            </div>

            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 w-full bg-[#238636] hover:bg-[#2ea043] text-white font-bold py-2.5 rounded-lg shadow-lg cursor-pointer transition-colors text-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Начать миссию (Space / Enter)</span>
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="max-w-sm bg-[#161b22] border border-red-500/50 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="text-red-400 font-extrabold text-lg uppercase tracking-wider">
              Сбой протокола: Целостность 0%
            </div>
            <p className="text-xs text-[#8b949e]">
              Дрон столкнулся с защитными фаерволами.
            </p>
            <div className="text-xl font-mono text-white font-bold">
              Итоговые очки: {score}
            </div>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 w-full bg-[#238636] hover:bg-[#2ea043] text-white font-bold py-2 rounded-lg cursor-pointer text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Перезапустить протокол</span>
            </button>
          </div>
        </div>
      )}

      {/* Paused Modal */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="max-w-xs bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-3 shadow-xl">
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              Пауза симуляции
            </div>
            <button
              onClick={() => setGameState('playing')}
              className="w-full bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold py-2 rounded-lg cursor-pointer text-xs"
            >
              Продолжить (P / Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
